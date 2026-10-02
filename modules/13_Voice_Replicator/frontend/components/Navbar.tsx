"use client";

import React from "react";
import { Project } from "@/lib/types";
import { SparklesIcon, LayersIcon, FileTextIcon, BarChartIcon, WandIcon, PlusIcon, UploadIcon } from "./Icons";

interface NavbarProps {
  projects: Project[];
  activeProject: Project | null;
  activeTab: string;
  onSelectProject: (p: Project) => void;
  onSelectTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  onOpenImportModal: () => void;
}

export function Navbar({
  projects,
  activeProject,
  activeTab,
  onSelectProject,
  onSelectTab,
  onOpenCreateModal,
  onOpenImportModal,
}: NavbarProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: SparklesIcon },
    { id: "posts", label: "Historical Posts", icon: LayersIcon },
    { id: "style-profile", label: "Style Profile", icon: BarChartIcon },
    { id: "generate", label: "Generate", icon: WandIcon },
    { id: "drafts", label: "Draft History", icon: FileTextIcon },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#153037] border-b border-[#2A4C54] px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Project Selector */}
        <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => onSelectTab("dashboard")}>
            <div className="p-2 rounded-md bg-[#2A4C54] text-[#F0B429]">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#E9EFEA] tracking-tight leading-tight">Instagram Voice Replicator</h1>
              <p className="text-xs text-[#8FA8A6] font-medium">Editorial Style Workspace</p>
            </div>
          </div>

          {/* Project Switcher */}
          <div className="flex items-center space-x-2">
            <select
              value={activeProject?.id || ""}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) onSelectProject(found);
              }}
              className="bg-[#0E2327] text-[#E9EFEA] text-xs rounded-md px-3 py-1.5 border border-[#2A4C54] focus:outline-none focus:border-[#F0B429] font-medium"
            >
              {projects.length === 0 ? (
                <option value="">No projects</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.post_count} posts)
                  </option>
                ))
              )}
            </select>

            <button
              onClick={onOpenCreateModal}
              title="Create New Project"
              className="p-1.5 rounded-md bg-[#0E2327] text-[#8FA8A6] hover:bg-[#2A4C54] hover:text-[#E9EFEA] border border-[#2A4C54] transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-[#0E2327] p-1 rounded-md border border-[#2A4C54] overflow-x-auto w-full md:w-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[#2A4C54] text-[#E9EFEA]"
                    : "text-[#8FA8A6] hover:text-[#E9EFEA] hover:bg-[#153037]"
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Button */}
        {activeProject && (
          <button
            onClick={onOpenImportModal}
            className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#2A4C54]/50 hover:bg-[#2A4C54] text-[#E9EFEA] text-xs font-medium border border-[#2A4C54] transition-colors"
          >
            <UploadIcon className="w-3.5 h-3.5 text-[#8FA8A6]" />
            <span>Import Posts</span>
          </button>
        )}
      </div>
    </header>
  );
}
