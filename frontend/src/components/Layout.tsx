import { Outlet, useNavigate } from "react-router-dom";
import { Code2, Download, LayoutDashboard, LogOut } from "lucide-react";
import JSZip from "jszip";
import { FileItem } from "../types";
import { useAuthStore } from "../store/authStore";

interface LayoutPrompts {
  files: FileItem[];
}

export function Layout({ files }: LayoutPrompts) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const addFilesToZip = (zip: JSZip, files: FileItem[], parentPath = "") => {
    files.forEach((file) => {
      const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;
      if (file.type === "file" && file.content) {
        zip.file(fullPath, file.content);
      } else if (file.type === "folder" && file.children) {
        addFilesToZip(zip, file.children, fullPath);
      }
    });
  };

  const handleDownloadZip = () => {
    if (files.length == 0) return;
    const zip = new JSZip();
    addFilesToZip(zip, files);
    zip.generateAsync({ type: "blob" }).then((content) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = "files.zip";
      link.click();
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
      <nav className="border-b border-gray-800 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Kraft-2.2
              </span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* My Projects */}
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-all text-sm font-medium"
              >
                <LayoutDashboard className="w-4 h-4" />
                My Projects
              </button>

              {/* Download */}
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold text-sm"
                onClick={handleDownloadZip}
              >
                <Download className="w-4 h-4" />
                Download
              </button>

              {/* User + Logout */}
              <div className="flex items-center gap-2 pl-3 border-l border-gray-700">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-300 font-medium hidden sm:block">
                  {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
