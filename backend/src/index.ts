import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

import { getSystemPrompt } from "./prompts";
import {
  DESIGN_PROMPT,
  REACT_BASE_PROMPT,
  NODE_BASE_PROMPT,
} from "./basePrompts";
import { generateResponse, determineTemplate } from "./aiService";
import { authMiddleware, AuthRequest } from "./middleware/auth";
import authRouter from "./routes/auth";
import projectsRouter from "./routes/projects";

const app = express();

// Security headers
app.use(helmet());

// CORS — allow standard Vite dev ports
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];

// If FRONTEND_URL is set in prod, add it to the allowed list
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// Admin kill-switch — emergency stop for AI routes
function checkKillSwitch(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (process.env.KILL_SWITCH === "true") {
    res.status(503).json({ message: "Service temporarily unavailable. Try again later." });
    return;
  }
  next();
}

// Auth routes (public)
app.use("/api/auth", authRouter);

// Projects routes (requires auth — handled inside the router)
app.use("/api/projects", projectsRouter);

// AI routes — require auth + kill-switch check
app.post("/api/template", authMiddleware, checkKillSwitch, async (req: AuthRequest, res: express.Response) => {
  try {
    const prompt = req.body.prompt;

    const answer = await determineTemplate(prompt);
    console.log("Determined template answer:", answer);

    if (answer.includes("react") || answer === "react") {
      res.json({
        prompts: [
          DESIGN_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${REACT_BASE_PROMPT}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [REACT_BASE_PROMPT],
      });
      return;
    }

    if (answer === "node") {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${NODE_BASE_PROMPT}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [NODE_BASE_PROMPT],
      });
      return;
    }

    res.status(403).json({ message: "Could not determine project type" });
  } catch (error) {
    console.error("Template error:", error);
    res.status(500).json({ message: "Error determining template" });
  }
});

app.post("/api/chat", authMiddleware, checkKillSwitch, async (req: AuthRequest, res: express.Response) => {
  try {
    const messages = req.body.messages;
    const response = await generateResponse(messages, getSystemPrompt());

    res.json({
      response: response,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res
      .status(500)
      .json({ message: "Error generating response", error: error instanceof Error ? error.message : String(error) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS allowed origin: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
  console.log(`Kill switch: ${process.env.KILL_SWITCH === "true" ? "ACTIVE ⛔" : "off ✅"}`);
});