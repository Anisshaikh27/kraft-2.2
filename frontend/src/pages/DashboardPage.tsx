import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { useAuthStore } from "../store/authStore";
import { Rocket, Clock, Trash2, PlusCircle, Code2 } from "lucide-react";

interface Project {
  id: string;
  title: string;
  prompt: string;
  template: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProjects() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/projects`, {
        headers: authHeaders,
      });
      setProjects(res.data.projects);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await axios.delete(`${BACKEND_URL}/api/projects/${id}`, {
        headers: authHeaders,
      });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setDeletingId(null);
    }
  }

  function handleContinue(project: Project) {
    navigate("/builder", {
      state: { task: project.prompt, projectId: project.id },
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Projects</h1>
          <p className="text-gray-400 mt-1">Continue where you left off</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all transform hover:scale-105 shadow-lg"
        >
          <PlusCircle className="w-5 h-5" />
          New Project
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="p-4 bg-gray-800 rounded-2xl mb-4">
            <Rocket className="w-12 h-12 text-indigo-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
          <p className="text-gray-400 mb-6">Create your first project to get started</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all transform hover:scale-105"
          >
            Start Building
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5 flex flex-col"
            >
              {/* Tag */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    project.template === "react"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-green-500/20 text-green-400 border border-green-500/30"
                  }`}
                >
                  <Code2 className="w-3 h-3 inline mr-1" />
                  {project.template === "react" ? "React" : "Node.js"}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(project.updatedAt)}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-white font-semibold text-lg mb-2 line-clamp-1">
                {project.title}
              </h3>

              {/* Prompt preview */}
              <p className="text-gray-400 text-sm line-clamp-2 flex-1 mb-4">
                {project.prompt}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <span className="text-xs text-gray-500">
                  {project._count.messages} messages
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(project.id)}
                    disabled={deletingId === project.id}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleContinue(project)}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
