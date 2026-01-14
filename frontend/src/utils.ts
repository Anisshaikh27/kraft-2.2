// frontend/src/utils.ts
import { Step, StepType } from "./types";

export function parseXml(response: string): Step[] {
  const steps: Step[] = [];
  let stepsId = 1;

  // Method 1: Look for <boltArtifact artifactPath="..."> pattern (Gemini style)
  const artifactPathRegex = /<boltArtifact\s+artifactPath="([^"]*)"\s*\/>/g;
  let artifactMatch;
  const processedPaths = new Set<string>();
  
  while ((artifactMatch = artifactPathRegex.exec(response)) !== null) {
    const filePath = artifactMatch[1];
    
    // Skip if already processed
    if (processedPaths.has(filePath)) continue;
    processedPaths.add(filePath);
    
    // Extract the code block that follows this artifact tag
    const codeBlockStart = response.indexOf('```', artifactMatch.index);
    if (codeBlockStart !== -1) {
      const codeStart = response.indexOf('\n', codeBlockStart) + 1;
      const codeEnd = response.indexOf('```', codeStart);
      
      if (codeEnd !== -1) {
        const content = response.substring(codeStart, codeEnd).trim();
        
        steps.push({
          id: stepsId++,
          title: filePath.split('/').pop() || "New File",
          description: `Create ${filePath}`,
          status: "pending",
          type: StepType.CreateFile,
          code: content,
          path: filePath,
        });
      }
    }
  }

  // Method 2: Look for traditional <boltArtifact>...<boltAction>...</boltArtifact> pattern
  const xmlMatch = response.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/);
  let xmlContent = xmlMatch ? xmlMatch[1] : response; // Fallback to full response if no wrapper
  
  // Extract title from boltArtifact if available
  const titleMatch = response.match(/<boltArtifact[^>]*title="([^"]*)"/);
  if (titleMatch && steps.length === 0) {
    steps.push({
      id: stepsId++,
      title: titleMatch[1],
      description: "",
      status: "pending",
      type: StepType.CreateFolder,
    });
  }

  // Look for boltAction tags in xmlContent (handles both wrapped and unwrapped cases)
  const actionRegex = /<boltAction\s+type="(file|createFile|updateFile|shell)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;
  let actionMatch;
  
  while ((actionMatch = actionRegex.exec(xmlContent)) !== null) {
    const [, type, filePath, rawContent] = actionMatch;
    
    // Clean the content by removing markdown code blocks
    const content = rawContent.replace(/```[a-z]*\n?|```/g, "").trim();

    if (type === "file" || type === "createFile" || type === "updateFile") {
      steps.push({
        id: stepsId++,
        title: filePath?.split('/').pop() || "New File",
        description: `Create ${filePath}`,
        status: "pending",
        type: StepType.CreateFile,
        code: content,
        path: filePath,
      });
    } else if (type === "shell") {
      steps.push({
        id: stepsId++,
        title: "Run Command",
        description: content.split('\n')[0].substring(0, 50),
        status: "pending",
        type: StepType.RunScript,
        code: content,
      });
    }
  }

  return steps;
}