import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { FileExplorer } from "../components/FileExplorer";
import { CodeEditor } from "../components/CodeEditor";
import { ChatPanel } from "../components/ChatPanel";
import { useInitializeProject } from "../hooks/useInitializeProject";
import { useLocation } from "react-router-dom";
import { parseXml } from "../utils";
import { FileItem, Step, StepType } from "../types";
import { StepsList } from "../components/StepList";
import { TabView } from "../components/TabView";
import { useWebContainer } from "../hooks/useWebContainer";
import { PreviewFrame } from "../components/PreviewFrame";
import { Loader } from "lucide-react";
import { useToast } from "../components/Toast";

interface BuilderProps {
  files: FileItem[];
  setFiles: (files: FileItem[]) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function BuilderPage({ files, setFiles }: BuilderProps) {
  useInitializeProject();

  const location = useLocation();
  const webContainer = useWebContainer();
  const { task } = location.state as { task: string };
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [llmMessages, setLlmMessages] = useState<Message[]>([]);
  const [boilerplateInitialized, setBoilerplateInitialized] = useState(false);

  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [activeTab, setActiveTab] = useState<
    "editor" | "chat" | "preview"
  >("editor");

  // Handle file updates from editor
  const handleCodeChange = (newCode: string) => {
    if (!selectedFile) return;

    const updateFileContent = (items: FileItem[]): FileItem[] => {
      return items.map((item) => {
        if (item.path === selectedFile.path && item.type === "file") {
          return { ...item, content: newCode };
        }
        if (item.type === "folder" && item.children) {
          return {
            ...item,
            children: updateFileContent(item.children),
          };
        }
        return item;
      });
    };

    setFiles(updateFileContent(files));
    setSelectedFile({ ...selectedFile, content: newCode });
  };

  // OPTIMIZED: Process steps immediately as they come in
  const processStepsToFiles = (stepsToProcess: Step[]) => {
    let updatedFiles = JSON.parse(JSON.stringify(files)); // Deep copy
    let hasChanges = false;
    let filesCreated = 0;

    stepsToProcess
      .filter(({ status, type }) => 
        status === "pending" && type === StepType.CreateFile
      )
      .forEach((step) => {
        if (!step.path || !step.code) return;

        hasChanges = true;
        filesCreated++;
        
        // Split path and remove empty strings
        const parts = step.path.split("/").filter(Boolean);
        
        // Navigate/create the folder structure
        let current = updatedFiles;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const folderName = parts[i];
          
          // Find or create folder
          let folder = current.find((item: FileItem) => 
            item.name === folderName && item.type === "folder"
          );
          
          if (!folder) {
            folder = {
              name: folderName,
              type: "folder",
              path: `/${parts.slice(0, i + 1).join("/")}`,
              children: [],
            };
            current.push(folder);
          }
          
          current = folder.children;
        }
        
        // Add or update the file
        const fileName = parts[parts.length - 1];
        const existingFileIndex = current.findIndex((item: FileItem) => 
          item.name === fileName && item.type === "file"
        );
        
        if (existingFileIndex >= 0) {
          current[existingFileIndex].content = step.code;
        } else {
          current.push({
            name: fileName,
            type: "file",
            path: step.path,
            content: step.code,
          });
        }
      });

    if (hasChanges) {
      setFiles(updatedFiles);
      showToast(`✅ Created ${filesCreated} ${filesCreated === 1 ? 'file' : 'files'}`, 'success');
      
      // Mark processed steps as completed
      setSteps((prevSteps) =>
        prevSteps.map((s) =>
          stepsToProcess.find(st => st.id === s.id)
            ? { ...s, status: "completed" as const }
            : s
        )
      );
    }
  };

  // Handle chat messages
  const handleSendMessage = async (message: string) => {
    const formatReminder = `

IMPORTANT INSTRUCTIONS FOR CODE GENERATION:
1. Use ONLY this exact XML format for responses:
<boltAction type="file" filePath="path/to/file.ext">
complete file content here (NO markdown code blocks)
</boltAction>

2. DO NOT generate:
   - CartProvider imports or context files (app will provide these)
   - External API calls or backend integrations
   - Node.js/server code (only browser-compatible React code)

3. For main.tsx, use this EXACT template:
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

4. For all component imports, use relative paths like: "./Header.tsx"
5. Only generate files that are actually referenced and used
6. Use TailwindCSS for all styling`;

    const formattedMessage = message + formatReminder;

    const newMessage: Message = {
      role: "user",
      content: formattedMessage,
    };

    setLlmMessages((prev) => [...prev, newMessage]);
    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/chat`, {
        messages: [...llmMessages, newMessage],
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response.data.response,
      };

      setLlmMessages((prev) => [...prev, assistantMessage]);

      // Parse and immediately process steps
      const newSteps = parseXml(response.data.response).map((x) => ({
        ...x,
        status: "pending" as "pending",
      }));

      if (newSteps.length > 0) {
        console.log("Parsed steps:", newSteps);
        setSteps((prev) => [...prev, ...newSteps]);
        
        // Merge new files with existing files synchronously
        const updatedFiles = mergeFilesFromSteps(files, newSteps);
        setFiles(updatedFiles);
        
        showToast(`✅ Added ${newSteps.length} files to project`, "success");
      } else {
        console.warn("No steps parsed. Response:", response.data.response);
        showToast("⚠️ No files found in response. Try rephrasing your request.", "error");
      }
    } catch (error) {
      console.error("Chat error:", error);
      showToast("❌ Failed to generate files. Please try again.", "error");
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setLlmMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Mount files to WebContainer whenever they change
  useEffect(() => {
    if (!webContainer) return;

    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};

      const addToStructure = (structure: Record<string, any>, file: FileItem) => {
        if (file.type === "folder" && file.children) {
          structure[file.name] = { directory: {} };
          file.children.forEach((child) => {
            addToStructure(structure[file.name].directory, child);
          });
        } else if (file.type === "file") {
          structure[file.name] = {
            file: {
              contents: file.content || "",
            },
          };
        }
      };

      files.forEach((file) => {
        addToStructure(mountStructure, file);
      });

      return mountStructure;
    };

    const mountStructure = createMountStructure(files);
    console.log("Mounting files to WebContainer:", JSON.stringify(mountStructure, null, 2));
    webContainer.mount(mountStructure);
  }, [files, webContainer]);

  // Initialize project
  async function init() {
    setLoading(true);
    
    try {
      // Create initial boilerplate files structure
      const initialBoilerplate: FileItem[] = [
        {
          name: "src",
          type: "folder",
          path: "/src",
          children: [
            { name: "App.tsx", type: "file", path: "/src/App.tsx", content: "import React from 'react';\n\nexport default function App() {\n  return (\n    <div className=\"flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600\">\n      <div className=\"text-center\">\n        <h1 className=\"text-4xl font-bold text-white mb-4\">Welcome to Your App</h1>\n        <p className=\"text-xl text-blue-100\">Start prompting to generate your next feature</p>\n      </div>\n    </div>\n  );\n}" },
            { name: "main.tsx", type: "file", path: "/src/main.tsx", content: "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n);" },
            { name: "index.css", type: "file", path: "/src/index.css", content: "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody {\n  margin: 0;\n  padding: 0;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;\n}" },
          ],
        },
        { name: "index.html", type: "file", path: "/index.html", content: "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>Generated App</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script type=\"module\" src=\"/src/main.tsx\"></script>\n  </body>\n</html>" },
        { 
          name: "package.json", 
          type: "file", 
          path: "/package.json", 
          content: JSON.stringify({
            name: "generated-app",
            version: "0.0.0",
            type: "module",
            scripts: {
              dev: "vite",
              build: "vite build",
              preview: "vite preview"
            },
            dependencies: {
              react: "^18.3.1",
              "react-dom": "^18.3.1",
              "react-router-dom": "^6.20.0",
              "lucide-react": "^0.344.0",
              axios: "^1.7.0"
            },
            devDependencies: {
              "@types/react": "^18.2.48",
              "@types/react-dom": "^18.2.18",
              "@vitejs/plugin-react": "^4.2.1",
              typescript: "^5.3.3",
              vite: "^5.0.8",
              "autoprefixer": "^10.4.17",
              "postcss": "^8.4.32",
              "tailwindcss": "^3.4.1"
            }
          }, null, 2) 
        },
        {
          name: "vite.config.ts",
          type: "file",
          path: "/vite.config.ts",
          content: "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({\n  plugins: [react()],\n  server: {\n    middlewareMode: true,\n    hmr: {\n      host: 'localhost',\n      port: 5173,\n      protocol: 'ws'\n    }\n  }\n})"
        },
        {
          name: "tsconfig.json",
          type: "file",
          path: "/tsconfig.json",
          content: JSON.stringify({
            compilerOptions: {
              target: "ES2020",
              useDefineForClassFields: true,
              lib: ["ES2020", "DOM", "DOM.Iterable"],
              module: "ESNext",
              skipLibCheck: true,
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
              strict: true,
              noEmit: true,
              moduleResolution: "bundler",
              resolveJsonModule: true,
              noImplicitAny: false
            },
            include: ["src"],
            references: [{ path: "./tsconfig.node.json" }]
          }, null, 2)
        },
        {
          name: "postcss.config.js",
          type: "file",
          path: "/postcss.config.js",
          content: "export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}"
        },
        {
          name: "tailwind.config.js",
          type: "file",
          path: "/tailwind.config.js",
          content: "/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n}"
        },
        {
          name: "tsconfig.node.json",
          type: "file",
          path: "/tsconfig.node.json",
          content: JSON.stringify({
            compilerOptions: {
              composite: true,
              skipLibCheck: true,
              module: "ESNext",
              moduleResolution: "bundler",
              allowSyntheticDefaultImports: true
            },
            include: ["vite.config.ts"]
          }, null, 2)
        },
        {
          name: "vite-env.d.ts",
          type: "file",
          path: "/src/vite-env.d.ts",
          content: "/// <reference types=\"vite/client\" />"
        }
      ];

      // Start with boilerplate
      let currentFiles = JSON.parse(JSON.stringify(initialBoilerplate));
      setFiles(currentFiles);

      // Get template/boilerplate from backend
      const templateResponse = await axios.post(`${BACKEND_URL}/api/template`, {
        prompt: task,
      });

      const { prompts, uiPrompts } = templateResponse.data;

      // Parse UI steps (config files)
      const boilerplateSteps = parseXml(uiPrompts[0]).map((x) => ({
        ...x,
        status: "pending" as const,
      }));

      setSteps(boilerplateSteps);
      
      // Merge boilerplate files
      currentFiles = mergeFilesFromSteps(currentFiles, boilerplateSteps);
      setFiles(currentFiles);

      // Get AI-generated files
      const stepsResponse = await axios.post(`${BACKEND_URL}/api/chat`, {
        messages: [...prompts, task].map((content) => ({
          role: "user",
          content,
        })),
      });

      const aiSteps = parseXml(stepsResponse.data.response).map((x) => ({
        ...x,
        status: "pending" as "pending",
      }));

      setSteps((s) => [...s, ...aiSteps]);
      
      // Merge AI-generated files with existing
      currentFiles = mergeFilesFromSteps(currentFiles, aiSteps);
      setFiles(currentFiles);

      // Mark all as completed
      setSteps((prevSteps) =>
        prevSteps.map((s) => ({ ...s, status: "completed" as const }))
      );

      showToast("✅ Project initialized with all files!", "success");

      // Initialize chat
      setLlmMessages([
        {
          role: "user",
          content: task,
        },
        {
          role: "assistant",
          content: stepsResponse.data.response,
        },
      ]);
    } catch (error) {
      console.error("Initialization error:", error);
      showToast("❌ Error initializing project", "error");
    } finally {
      setLoading(false);
    }
  }

  // Helper function to merge files without async issues
  const mergeFilesFromSteps = (baseFiles: FileItem[], steps: Step[]): FileItem[] => {
    let updatedFiles = JSON.parse(JSON.stringify(baseFiles));

    steps
      .filter(({ type }) => type === StepType.CreateFile)
      .forEach((step) => {
        if (!step.path || !step.code) return;

        const parts = step.path.split("/").filter(Boolean);
        let current = updatedFiles;

        // Navigate/create folder structure
        for (let i = 0; i < parts.length - 1; i++) {
          const folderName = parts[i];
          let folder = current.find((item: FileItem) => 
            item.name === folderName && item.type === "folder"
          );

          if (!folder) {
            folder = {
              name: folderName,
              type: "folder",
              path: `/${parts.slice(0, i + 1).join("/")}`,
              children: [],
            };
            current.push(folder);
          }

          current = folder.children;
        }

        // Add or update file
        const fileName = parts[parts.length - 1];
        const existingIndex = current.findIndex((item: FileItem) => 
          item.name === fileName && item.type === "file"
        );

        if (existingIndex >= 0) {
          current[existingIndex].content = step.code;
        } else {
          current.push({
            name: fileName,
            type: "file",
            path: step.path,
            content: step.code,
          });
        }
      });

    return updatedFiles;
  }

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full grid grid-cols-4 gap-6 p-6">
        {/* Left Sidebar - Steps */}
        <div className="col-span-1 space-y-6 overflow-auto">
          <div className="max-h-[85vh] overflow-scroll">
            <StepsList steps={steps} currentStep={1} onStepClick={() => {}} />
          </div>
          {loading && (
            <div className="flex items-center justify-center p-4">
              <Loader className="animate-spin w-6 h-6 text-indigo-500" />
            </div>
          )}
        </div>

        {/* Middle - File Explorer */}
        <div className="col-span-1">
          <FileExplorer files={files} onFileSelect={setSelectedFile} />
        </div>

        {/* Right - Tabs and Content */}
        <div className="col-span-2 bg-gray-900 rounded-lg shadow-lg h-[calc(100vh-8rem)]">
          <TabView activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="h-[calc(100%-5rem)]">
            {activeTab === "editor" && (
              <CodeEditor
                selectedFile={selectedFile}
                onCodeChange={handleCodeChange}
              />
            )}
            {activeTab === "chat" && (
              <ChatPanel
                messages={llmMessages}
                onSendMessage={handleSendMessage}
                isLoading={loading}
              />
            )}
            {activeTab === "preview" && (
              <PreviewFrame webContainer={webContainer} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}