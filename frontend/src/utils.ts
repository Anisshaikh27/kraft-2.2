// frontend/src/utils.ts

import { Step, StepType } from "./types";

export function parseXml(response: string): Step[] {
  const steps: Step[] = [];
  let stepsId = 1;

  // Extract the XML content (handles both wrapped and unwrapped cases)
  const xmlMatch = response.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/);
  const xmlContent = xmlMatch ? xmlMatch[1] : response;

  // Regular expression to find <boltAction> tags
  // Improvements:
  // 1. type="([^"]+)" -> Matches ANY type (more robust)
  // 2. filePath="([^"]+)" -> Standard extraction
  // 3. ([\s\S]*?) -> Captures content safely
  const actionRegex = /<boltAction\s+type="([^"]+)"\s+filePath="([^"]+)">([\s\S]*?)<\/boltAction>/g;

  let match;
  while ((match = actionRegex.exec(xmlContent)) !== null) {
    const [_, type, filePath, rawContent] = match;

    // INTELLIGENT CLEANING:
    // Only remove the specific markdown fences at the very start and end of the content.
    // This preserves backticks inside the code (like template literals).
    let content = rawContent.trim();
    
    // Remove opening fence (e.g., ```tsx, ```typescript, or just ```)
    if (content.startsWith('```')) {
        content = content.replace(/^```[a-zA-Z]*\n?/, "");
    }
    
    // Remove closing fence
    if (content.endsWith('```')) {
        content = content.replace(/```$/, "");
    }
    
    content = content.trim();

    if (type === "file" || type === "createFile" || type === "updateFile" || type === "tool_code") {
      steps.push({
        id: stepsId++,
        title: filePath.split('/').pop() || "File",
        description: `Update ${filePath}`,
        status: "pending",
        type: StepType.CreateFile,
        code: content,
        path: filePath,
      });
    } else if (type === "shell") {
      steps.push({
        id: stepsId++,
        title: "Run Command",
        description: "Execute shell command",
        status: "pending",
        type: StepType.RunScript,
        code: content,
      });
    }
  }

  return steps;
}