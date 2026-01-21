import { Outlet } from "react-router-dom";
import { Code2, Download } from "lucide-react";
import JSZip from "jszip";
import { FileItem } from "../types";

interface LayoutPrompts {
  files: FileItem[];
}

export function Layout({ files }: LayoutPrompts) {
  const addFilesToZip = (zip: JSZip, files: FileItem[], parentPath = "") => {
    files.forEach((file) => {
      const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;
      if (file.type === "file" && file.content) {
        // add file content to zip
        zip.file(fullPath, file.content);
      } else if (file.type === "folder" && file.children) {
        // If folder, recursively add its children
        addFilesToZip(zip, file.children, fullPath);
      }
    });
  };

  const handleDownloadZip = () => {
    if (files.length == 0) return;
    const zip = new JSZip();
    // add all files (and folder) from the files states to zip
    addFilesToZip(zip, files);
    // generate the zip file and trigger download
    zip.generateAsync({ type: "blob" }).then((content) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = "files.zip";
      link.click();
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <nav className="border-b border-gray-800 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Kraft-2.2</span>
            </div>
            <button
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
              onClick={handleDownloadZip}
            >
              <Download className="w-5 h-5" />
              Download
            </button>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
