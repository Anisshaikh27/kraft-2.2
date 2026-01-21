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
  const [splitViewMode, setSplitViewMode] = useState(true);
  const [fullPreview, setFullPreview] = useState(false);
  const [dividerPos, setDividerPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"steps" | "files">("steps");

  // Helper function to check if a file exists in the structure
  const checkFileExists = (files: FileItem[], filePath: string): boolean => {
    const parts = filePath.split("/").filter(Boolean);
    let current = files;

    for (let i = 0; i < parts.length - 1; i++) {
      const folder = current.find((item: FileItem) => 
        item.name === parts[i] && item.type === "folder"
      );
      if (!folder) return false;
      current = folder.children || [];
    }

    const fileName = parts[parts.length - 1];
    return current.some((item: FileItem) => 
      item.name === fileName && item.type === "file"
    );
  };

  // Helper function to add a file to the structure
  const addFileToStructure = (baseFiles: FileItem[], filePath: string, content: string): FileItem[] => {
    let updatedFiles = JSON.parse(JSON.stringify(baseFiles));
    const parts = filePath.split("/").filter(Boolean);
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

      current = folder.children || [];
    }

    // Add the file
    const fileName = parts[parts.length - 1];
    current.push({
      name: fileName,
      type: "file",
      path: filePath,
      content: content,
    });

    return updatedFiles;
  };

  // Helper function to merge files without async issues
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
      // Create initial boilerplate files structure (WITHOUT App.tsx - AI will generate it)
      const initialBoilerplate: FileItem[] = [
        {
          name: "src",
          type: "folder",
          path: "/src",
          children: [
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
      
      // ⚠️ CRITICAL: Ensure App.tsx exists (check if AI generated it)
      const hasAppTsx = checkFileExists(currentFiles, "/src/App.tsx");
      if (!hasAppTsx) {
        // Add default App.tsx if AI didn't generate one
        console.warn("App.tsx not found in AI response, adding default");
        currentFiles = addFileToStructure(currentFiles, "/src/App.tsx", 
          "import React from 'react';\n\nexport default function App() {\n  return (\n    <div className=\"flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600\">\n      <div className=\"text-center\">\n        <h1 className=\"text-4xl font-bold text-white mb-4\">Welcome to Your App</h1>\n        <p className=\"text-xl text-blue-100\">Start prompting to generate your next feature</p>\n      </div>\n    </div>\n  );\n}"
        );
      }
      
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

  // Handle dragging divider for split view
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById("split-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newPos = ((e.clientX - rect.left) / rect.width) * 100;
      // Constrain between 20% and 80%
      if (newPos > 20 && newPos < 80) {
        setDividerPos(newPos);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex-1 overflow-hidden bg-gray-950">
      {/* Full Preview Mode */}
      {fullPreview ? (
        <div className="h-screen w-screen flex flex-col">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Full Preview</h2>
            <button
              onClick={() => setFullPreview(false)}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-colors"
            >
              Exit Full View
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-gray-900">
            <PreviewFrame webContainer={webContainer} />
          </div>
        </div>
      ) : (
        <div className="h-full grid grid-cols-12 gap-4 p-4">
          {/* Left Sidebar - Switchable Steps/Files Tabs */}
          <div className="col-span-2 space-y-4 overflow-hidden flex flex-col">
            {/* Sidebar Tab Buttons */}
            <div className="flex gap-2 px-2">
              <button
                onClick={() => setSidebarTab("steps")}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                  sidebarTab === "steps"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Build Steps
              </button>
              <button
                onClick={() => setSidebarTab("files")}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                  sidebarTab === "files"
                    ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Files
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-hidden rounded-xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-800 shadow-lg flex flex-col">
              {sidebarTab === "steps" ? (
                // Build Steps Tab
                <>
                  <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-indigo-500">
                    <h3 className="text-sm font-bold text-white">Build Progress</h3>
                  </div>
                  <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    <StepsList steps={steps} currentStep={1} onStepClick={() => {}} />
                    {loading && (
                      <div className="flex items-center justify-center p-6">
                        <Loader className="animate-spin w-6 h-6 text-indigo-400" />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Files Tab
                <>
                  <div className="p-4 bg-gradient-to-r from-pink-600 to-purple-600 border-b border-purple-500">
                    <h3 className="text-sm font-bold text-white">Project Files</h3>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <FileExplorer files={files} onFileSelect={setSelectedFile} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="col-span-10 flex flex-col space-y-0">
            {/* Control Bar */}
            <div className="flex items-center justify-between mb-4 p-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl border border-gray-700 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-300">
                  {splitViewMode ? "📐 Split View" : "🔀 Tab View"}
                </span>
                <button
                  onClick={() => setSplitViewMode(!splitViewMode)}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                    splitViewMode
                      ? "bg-indigo-500 text-white shadow-lg"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {splitViewMode ? "Split" : "Tabs"}
                </button>
              </div>

              {splitViewMode && (
                <span className="text-xs text-gray-400">Drag divider to resize</span>
              )}

              {!splitViewMode && (
                <TabView activeTab={activeTab} onTabChange={setActiveTab} />
              )}

              <button
                onClick={() => setFullPreview(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all transform hover:scale-105 shadow-lg"
              >
                🖼️ Full Preview
              </button>
            </div>

            {/* Content Area */}
            {splitViewMode ? (
              <div
                id="split-container"
                className="flex-1 flex gap-4 overflow-hidden"
              >
                {/* Editor Section */}
                <div
                  style={{ width: `${dividerPos}%` }}
                  className="flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden"
                >
                  <div className="bg-gray-800 p-4 border-b border-gray-700">
                    <h3 className="text-sm font-bold text-gray-300">
                      {selectedFile ? selectedFile.path : "Code Editor"}
                    </h3>
                  </div>
                  <div className="flex-1 overflow-auto bg-gray-950">
                    <CodeEditor
                      selectedFile={selectedFile}
                      onCodeChange={handleCodeChange}
                    />
                  </div>
                </div>

                {/* Draggable Divider */}
                <div
                  onMouseDown={() => setIsDragging(true)}
                  className={`w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 cursor-col-resize hover:w-1.5 transition-all ${
                    isDragging ? "w-1.5 shadow-lg" : ""
                  }`}
                />

                {/* Preview Section */}
                <div
                  style={{ width: `${100 - dividerPos}%` }}
                  className="flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden"
                >
                  <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-300">
                      Live Preview
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSplitViewMode(false)}
                        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                      >
                        View Chat
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto bg-gray-950">
                    <PreviewFrame webContainer={webContainer} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden flex flex-col">
                {activeTab === "editor" && (
                  <div className="flex-1 overflow-auto">
                    <div className="bg-gray-800 p-4 border-b border-gray-700">
                      <h3 className="text-sm font-bold text-gray-300">
                        {selectedFile ? selectedFile.path : "Code Editor"}
                      </h3>
                    </div>
                    <div className="h-[calc(100%-5rem)]">
                      <CodeEditor
                        selectedFile={selectedFile}
                        onCodeChange={handleCodeChange}
                      />
                    </div>
                  </div>
                )}
                {activeTab === "chat" && (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="flex-shrink-0 bg-gray-800 p-4 border-b border-gray-700">
                      <h3 className="text-sm font-bold text-gray-300">
                        Chat with AI
                      </h3>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <ChatPanel
                        messages={llmMessages}
                        onSendMessage={handleSendMessage}
                        isLoading={loading}
                      />
                    </div>
                  </div>
                )}
                {activeTab === "preview" && (
                  <div className="flex-1 flex flex-col">
                    <div className="bg-gray-800 p-4 border-b border-gray-700">
                      <h3 className="text-sm font-bold text-gray-300">
                        Live Preview
                      </h3>
                    </div>
                    <div className="flex-1 overflow-auto bg-gray-950">
                      <PreviewFrame webContainer={webContainer} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}