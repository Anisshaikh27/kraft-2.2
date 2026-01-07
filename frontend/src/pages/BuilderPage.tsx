import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { FileExplorer } from "../components/FileExplorer";
import { FilePreview } from "../components/FilePreview";
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

  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [llmMessages, setLlmMessages] = useState<Message[]>([]);

  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [activeTab, setActiveTab] = useState<
    "code" | "editor" | "chat" | "preview"
  >("code");

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

  // Handle chat messages
  const handleSendMessage = async (message: string) => {
    const newMessage: Message = {
      role: "user",
      content: message,
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

      // Parse and add new steps
      const newSteps = parseXml(response.data.response).map((x) => ({
        ...x,
        status: "pending" as "pending",
      }));

      setSteps((prev) => [...prev, ...newSteps]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setLlmMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};

      const processFile = (file: FileItem, isRootFolder: boolean) => {
        if (file.type === "folder") {
          mountStructure[file.name] = {
            directory: file.children
              ? Object.fromEntries(
                  file.children.map((child) => [
                    child.name,
                    processFile(child, false),
                  ])
                )
              : {},
          };
        } else if (file.type === "file") {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || "",
              },
            };
          } else {
            return {
              file: {
                contents: file.content || "",
              },
            };
          }
        }

        return mountStructure[file.name];
      };

      files.forEach((file) => processFile(file, true));
      return mountStructure;
    };

    const mountStructure = createMountStructure(files);
    webContainer?.mount(mountStructure);
  }, [files, webContainer]);

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;

    steps
      .filter(({ status }) => status === "pending")
      .map((step) => {
        updateHappened = true;
        if (step?.type === StepType.CreateFile) {
          let parsedPath = step.path?.split("/") ?? [];
          let currentFileStructure = [...originalFiles];
          const finalAnswerRef = currentFileStructure;
          let currentFolder = "";

          while (parsedPath.length) {
            currentFolder = `${currentFolder}/${parsedPath[0]}`;
            const currentFolderName = parsedPath[0];
            parsedPath = parsedPath.slice(1);

            if (!parsedPath.length) {
              const file = currentFileStructure.find(
                (x) => x.path === currentFolder
              );
              if (!file) {
                currentFileStructure.push({
                  name: currentFolderName,
                  type: "file",
                  path: currentFolder,
                  content: step.code,
                });
              } else {
                file.content = step.code;
              }
            } else {
              const folder = currentFileStructure.find(
                (x) => x.path === currentFolder
              );
              if (!folder) {
                currentFileStructure.push({
                  name: currentFolderName,
                  type: "folder",
                  path: currentFolder,
                  children: [],
                });
              }

              currentFileStructure = currentFileStructure.find(
                (x) => x.path === currentFolder
              )!.children!;
            }
          }
          originalFiles = finalAnswerRef;
        }
      });

    if (updateHappened) {
      setFiles(originalFiles);
      setSteps((steps) =>
        steps.map((s: Step) => ({
          ...s,
          status: "completed",
        }))
      );
    }
  }, [steps, files]);

  async function init() {
    const response = await axios.post(`${BACKEND_URL}/api/template`, {
      prompt: task,
    });

    const { prompts, uiPrompts } = response.data;

    setSteps(
      parseXml(uiPrompts[0]).map((x) => ({
        ...x,
        status: "pending",
      }))
    );

    setLoading(true);

    const stepsResponse = await axios.post(`${BACKEND_URL}/api/chat`, {
      messages: [...prompts, task].map((content) => ({
        role: "user",
        content,
      })),
    });

    setLoading(false);

    setSteps((s) => [
      ...s,
      ...parseXml(stepsResponse.data.response).map((x) => ({
        ...x,
        status: "pending" as "pending",
      })),
    ]);

    // Initialize chat with initial messages
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
            {activeTab === "code" && <FilePreview selectedFile={selectedFile} />}
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