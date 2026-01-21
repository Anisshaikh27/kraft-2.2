import Editor from "@monaco-editor/react";
import { FileItem } from "../types";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface CodeEditorProps {
  selectedFile: FileItem | null;
  onCodeChange: (newCode: string) => void;
}

export function CodeEditor({ selectedFile, onCodeChange }: CodeEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (selectedFile?.content) {
      navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!selectedFile) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-950 to-gray-900">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <p className="text-lg font-semibold">Select a file to edit</p>
          <p className="text-sm mt-2">Choose a file from the explorer on the left</p>
        </div>
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
    <div className="h-full w-full flex flex-col">
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4 border-b border-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-300">
            {selectedFile.path}
          </span>
          <span className="text-xs px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
            {selectedFile.type}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all text-sm"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={getLanguage(selectedFile.type)}
          value={selectedFile.content}
          onChange={(value) => onCodeChange(value || "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            bracketPairColorization: { enabled: true },
            smoothScrolling: true,
            cursorSmoothCaretAnimation: true,
            fontLigatures: true,
          }}
        />
      </div>
    </div>
  );
}