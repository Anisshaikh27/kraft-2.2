import Editor from "@monaco-editor/react";
import { FileItem } from "../types";

interface CodeEditorProps {
  selectedFile: FileItem | null;
  onCodeChange: (newCode: string) => void;
}

export function CodeEditor({ selectedFile, onCodeChange }: CodeEditorProps) {
  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Select a file to edit
      </div>
    );
  }

  const getLanguage = (type: string) => {
    switch (type) {
      case "javascript":
        return "javascript";
      case "typescript":
        return "typescript";
      case "css":
        return "css";
      case "json":
        return "json";
      case "html":
        return "html";
      default:
        return "javascript";
    }
  };

  return (
    <div className="h-full w-full">
      <div className="bg-gray-800 rounded-t-lg p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">
            {selectedFile.path}
          </span>
          <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
            {selectedFile.type}
          </span>
        </div>
      </div>
      <div className="h-[calc(100%-4rem)]">
        <Editor
          height="100%"
          language={getLanguage(selectedFile.type)}
          value={selectedFile.content}
          onChange={(value) => onCodeChange(value || "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}