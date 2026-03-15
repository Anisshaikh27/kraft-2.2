// frontend/src/utils.ts

import { Step, StepType } from "./types";

export function parseXml(response: string): Step[] {
  const steps: Step[] = [];
  let stepsId = Math.floor(Math.random() * 1000000) + Date.now();

  // Step 1: Strip markdown code fences that might wrap the entire response
  // Gemini sometimes wraps the XML in ```xml ... ``` or ```html ... ```
  let cleanedResponse = response;
  
  // Remove outer markdown fences wrapping the whole response
  const outerFenceMatch = cleanedResponse.match(/^```(?:xml|html|tsx|typescript|javascript)?\s*\n([\s\S]*?)\n```\s*$/);
  if (outerFenceMatch) {
    cleanedResponse = outerFenceMatch[1];
  }

  // Step 2: Extract the XML content from <boltArtifact> tags
  const xmlMatch = cleanedResponse.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/);
  const xmlContent = xmlMatch ? xmlMatch[1] : cleanedResponse;

  // Step 3: Parse file actions — handle both attribute orderings:
  //   <boltAction type="file" filePath="...">
  //   <boltAction filePath="..." type="file">
  const fileActionRegex = /<boltAction\s+(?:type="([^"]+)"\s+filePath="([^"]+)"|filePath="([^"]+)"\s+type="([^"]+)")>([\s\S]*?)<\/boltAction>/g;

  let match;
  while ((match = fileActionRegex.exec(xmlContent)) !== null) {
    // Handle both attribute orderings
    const type = match[1] || match[4];
    const filePath = match[2] || match[3];
    const rawContent = match[5];

    // Clean content: remove markdown fences at start/end only
    let content = rawContent.trim();

    // Remove opening fence (e.g., ```tsx, ```typescript, or just ```)
    if (content.startsWith("```")) {
      content = content.replace(/^```[a-zA-Z]*\n?/, "");
    }

    // Remove closing fence
    if (content.endsWith("```")) {
      content = content.replace(/```$/, "");
    }

    content = content.trim();

    if (
      type === "file" ||
      type === "createFile" ||
      type === "updateFile" ||
      type === "tool_code"
    ) {
      steps.push({
        id: stepsId++,
        title: filePath.split("/").pop() || "File",
        description: `Update ${filePath}`,
        status: "pending",
        type: StepType.CreateFile,
        code: content,
        path: filePath,
      });
    }
  }

  // Step 4: Parse shell actions separately (no filePath attribute)
  const shellRegex = /<boltAction\s+type="shell">([\s\S]*?)<\/boltAction>/g;

  while ((match = shellRegex.exec(xmlContent)) !== null) {
    const content = match[1].trim();
    if (content) {
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