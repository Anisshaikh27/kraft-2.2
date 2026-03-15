import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { prisma } from "../db";

const router = Router();

// All project routes require auth
router.use(authMiddleware);

const createProjectSchema = z.object({
  prompt: z.string().min(1),
  template: z.string().min(1),
});

const upsertFilesSchema = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
    })
  ),
});

const addMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

// Helper: auto-generate title from prompt
function generateTitle(prompt: string): string {
  const words = prompt.trim().split(/\s+/).slice(0, 6);
  const title = words.join(" ");
  return title.length < prompt.length ? `${title}...` : title;
}

// POST /api/projects — create a new project
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message });
      return;
    }

    const { prompt, template } = parsed.data;
    const project = await prisma.project.create({
      data: {
        userId: req.userId!,
        title: generateTitle(prompt),
        prompt,
        template,
      },
    });

    res.status(201).json({ project });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/projects — list all projects for the user
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        prompt: true,
        template: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    res.json({ projects });
  } catch (error) {
    console.error("List projects error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/projects/:id — get a project with files + messages
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        files: { orderBy: { path: "asc" } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    res.json({ project });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /api/projects/:id/files — batch upsert files
router.put("/:id/files", async (req: AuthRequest, res: Response) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const parsed = upsertFilesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message });
      return;
    }

    const { files } = parsed.data;

    // Upsert all files
    await Promise.all(
      files.map((file) =>
        prisma.projectFile.upsert({
          where: {
            projectId_path: { projectId: project.id, path: file.path },
          },
          update: { content: file.content },
          create: { projectId: project.id, path: file.path, content: file.content },
        })
      )
    );

    // Update project updatedAt
    await prisma.project.update({
      where: { id: project.id },
      data: { updatedAt: new Date() },
    });

    res.json({ message: "Files saved" });
  } catch (error) {
    console.error("Save files error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/projects/:id/messages — add a chat message
router.post("/:id/messages", async (req: AuthRequest, res: Response) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const parsed = addMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message });
      return;
    }

    const message = await prisma.chatMessage.create({
      data: {
        projectId: project.id,
        role: parsed.data.role,
        content: parsed.data.content,
      },
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error("Add message error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: "Project deleted" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
