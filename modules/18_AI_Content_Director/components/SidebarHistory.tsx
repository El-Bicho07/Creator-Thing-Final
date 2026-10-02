"use client";

import React, { useState } from "react";
import {
  FolderOpen,
  Plus,
  Trash2,
  X,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Youtube,
  Instagram,
  Smartphone,
  Linkedin,
  Mic,
  ChevronRight
} from "lucide-react";
import { Project, Platform } from "@/lib/types";

interface SidebarHistoryProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const PLATFORM_ICONS: Record<Platform, any> = {
  instagram: Instagram,
  youtube: Youtube,
  shorts: Smartphone,
  tiktok: Smartphone,
  linkedin: Linkedin,
  podcast: Mic,
};

export function SidebarHistory({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  isOpenMobile,
  onCloseMobile,
}: SidebarHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sidebarContent = (
    <div className="flex h-full flex-col bg-card border-r border-border text-foreground">
      {/* Top Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-sm tracking-tight">Project Vault</h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {projects.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewProject}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Create New Project"
            aria-label="New Project"
          >
            <Plus className="h-4 w-4" />
          </button>
          {isOpenMobile && (
            <button
              onClick={onCloseMobile}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-border/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-input bg-background/50 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredProjects.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No projects found.
          </div>
        ) : (
          filteredProjects.map((p) => {
            const isActive = p.id === activeProjectId;
            const Icon = PLATFORM_ICONS[p.platform] || Youtube;
            const completedCount = p.completedStages?.length || 0;
            const isFullPackage = completedCount >= 7;

            return (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProject(p.id);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`group relative flex flex-col gap-1.5 rounded-xl p-3 cursor-pointer transition-all border ${
                  isActive
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-transparent hover:border-border hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <h3 className="font-semibold text-xs text-foreground truncate">
                      {p.title}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete project "${p.title}"?`)) {
                        onDeleteProject(p.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive text-muted-foreground transition-opacity"
                    title="Delete project"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {p.topic}
                </p>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  <span className="flex items-center gap-1">
                    {isFullPackage ? (
                      <span className="text-emerald-500 font-medium flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Complete
                      </span>
                    ) : (
                      <span>Stage {p.currentStage}/7</span>
                    )}
                  </span>
                  <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-border bg-card/60 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>AI Content Director</span>
        <span className="font-mono text-[10px]">Auto-saved locally</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Panel (Hidden below lg) */}
      <aside className="hidden lg:block w-72 shrink-0 h-[calc(100dvh-4rem)] sticky top-16 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm z-50 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
