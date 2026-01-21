import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket } from "lucide-react";

export function LandingPage() {
  const [task, setTask] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim()) {
      navigate("/builder", { state: { task } });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <Rocket className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Kraft-2.2
          </h1>
          <p className="text-gray-300 text-xl mb-6 font-semibold">
            Build Professional Websites in Minutes
          </p>
          <p className="text-gray-400 text-lg">
            Describe your vision and let AI transform it into a fully functional website
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe your website (e.g., Create a modern portfolio website with a dark theme...)"
            className="w-full h-32 px-4 py-3 rounded-xl bg-gray-800 border-2 border-gray-700 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 text-gray-100 placeholder-gray-500 transition-all duration-200"
          />
          <button
            type="submit"
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            ✨ Start Building
          </button>
        </form>
      </div>
    </div>
  );
}
