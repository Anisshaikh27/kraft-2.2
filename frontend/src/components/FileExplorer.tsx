import { useState } from "react";
import { File, FolderTree, ChevronDown, ChevronRight, Loader2, FileText, Code2 } from "lucide-react";
import { FileItem } from "../types";

interface FileExplorerProps {
  files: FileItem[];
  onFileSelect: (file: FileItem) => void;
}

interface FileNodeProps {
  item: FileItem;
  depth: number;
  onFileClick: (file: FileItem) => void;
  selectedPath?: string;
}

function getFileIcon(fileName: string) {
  if (fileName.endsWith(".tsx") || fileName.endsWith(".ts")) {
    return <Code2 className="w-4 h-4 text-blue-400" />;
  }
  if (fileName.endsWith(".css")) {
    return <Code2 className="w-4 h-4 text-purple-400" />;
  }
  if (fileName.endsWith(".json")) {
    return <FileText className="w-4 h-4 text-yellow-400" />;
  }
  if (fileName.endsWith(".html")) {
    return <Code2 className="w-4 h-4 text-orange-400" />;
  }
  return <File className="w-4 h-4 text-gray-400" />;
}

function FileNode({ item, depth, onFileClick, selectedPath }: FileNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Auto-expand by default
  const isSelected = item.type === "file" && item.path === selectedPath;

  const handleClick = () => {
    if (item.type === "folder") {
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(item);
    }
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
          isSelected
            ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border-l-2 border-indigo-400 text-indigo-300"
            : "hover:bg-gray-800/50 text-gray-300 hover:text-gray-100"
        }`}
        style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
        onClick={handleClick}
      >
        {item.type === "folder" && (
          <span className="text-gray-500 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
        {item.type === "folder" ? (
          <FolderTree className="w-4 h-4 text-blue-400 flex-shrink-0" />
        ) : (
          getFileIcon(item.name)
        )}
        <span className="text-sm font-medium truncate flex-1">{item.name}</span>
      </div>
      {item.type === "folder" && isExpanded && item.children && (
        <div>
          {item.children.map((child, index) => (
            <FileNode
              key={`${child.path}-${index}`}
              item={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to count files
function countFiles(items: FileItem[]): number {
  return items.reduce((count, item) => {
    if (item.type === "file") {
      return count + 1;
    } else if (item.type === "folder" && item.children) {
      return count + countFiles(item.children);
    }
    return count;
  }, 0);
}

export function FileExplorer({ files, onFileSelect }: FileExplorerProps) {
  const fileCount = countFiles(files);
  const [selectedPath, setSelectedPath] = useState<string | undefined>();

  const handleFileSelect = (file: FileItem) => {
    setSelectedPath(file.path);
    onFileSelect(file);
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-blue-400" />
            Files
          </h2>
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
            {fileCount}
          </span>
        </div>
      </div>
      
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-500 p-4">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <p className="text-sm">Generating files...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 p-1">
          <div className="space-y-0.5">
            {files.map((file, index) => (
              <FileNode
                key={`${file.path}-${index}`}
                item={file}
                depth={0}
                onFileClick={handleFileSelect}
                selectedPath={selectedPath}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}