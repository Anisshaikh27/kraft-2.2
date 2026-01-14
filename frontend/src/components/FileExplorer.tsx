import { useState } from "react";
import { File, FolderTree, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { FileItem } from "../types";

interface FileExplorerProps {
  files: FileItem[];
  onFileSelect: (file: FileItem) => void;
}

interface FileNodeProps {
  item: FileItem;
  depth: number;
  onFileClick: (file: FileItem) => void;
}

function FileNode({ item, depth, onFileClick }: FileNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Auto-expand by default

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
        className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
        style={{ paddingLeft: `${depth * 1.5}rem` }}
        onClick={handleClick}
      >
        {item.type === "folder" && (
          <span className="text-gray-400">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
        {item.type === "folder" ? (
          <FolderTree className="w-4 h-4 text-blue-400" />
        ) : (
          <File className="w-4 h-4 text-gray-400" />
        )}
        <span className="text-gray-200 text-sm">{item.name}</span>
      </div>
      {item.type === "folder" && isExpanded && item.children && (
        <div>
          {item.children.map((child, index) => (
            <FileNode
              key={`${child.path}-${index}`}
              item={child}
              depth={depth + 1}
              onFileClick={onFileClick}
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
  
  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-100">
          <FolderTree className="w-5 h-5" />
          File Explorer
        </h2>
        <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400">
          {fileCount} {fileCount === 1 ? "file" : "files"}
        </span>
      </div>
      
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <p className="text-sm">Generating files...</p>
        </div>
      ) : (
        <div className="space-y-1">
          {files.map((file, index) => (
            <FileNode
              key={`${file.path}-${index}`}
              item={file}
              depth={0}
              onFileClick={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}