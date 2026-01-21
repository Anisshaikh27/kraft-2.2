import { Eye, MessageSquare, Edit3 } from "lucide-react";

interface TabViewProps {
  activeTab: "editor" | "chat" | "preview";
  onTabChange: (tab: "editor" | "chat" | "preview") => void;
}

export function TabView({ activeTab, onTabChange }: TabViewProps) {
  const tabs = [
    { id: "editor", label: "Editor", icon: Edit3 },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "preview", label: "Preview", icon: Eye },
  ] as const;

  return (
    <div className="flex gap-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              isActive
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}