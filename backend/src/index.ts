import express from "express";

require("dotenv").config();

import { getSystemPrompt } from "./prompts";
import {
  DESIGN_PROMPT,
  REACT_BASE_PROMPT,
  NODE_BASE_PROMPT,
} from "./basePrompts";
import cors from "cors";
import { generateResponse, determineTemplate } from "./aiService";



const app = express();
app.use(express.json());
app.use(cors());

app.post("/api/template", async (req, res) => {
  try {
    const prompt = req.body.prompt;

    const answer = await determineTemplate(prompt);

    if (answer === "react") {
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

app.post("/api/chat", async (req, res) => {
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
});