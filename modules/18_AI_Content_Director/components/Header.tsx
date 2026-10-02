"use client";

import React from "react";
import {
  Clapperboard,
  Sparkles,
  Download,
  Menu,
  Sun,
  Moon,
  FolderOpen,
  Play,
  Loader2,
  PlusCircle,
  Film
} from "lucide-react";
import { Project } from "@/lib/types";

interface HeaderProps {
  project: Project | null;
  activeTab: "pipeline" | "memes";
  onTabChange: (tab: "pipeline" | "memes") => void;
  isGeneratingAll: boolean;
  onGenerateAll: () => void;
  onOpenExport: () => void;
  onOpenHistory: () => void;
  onNewProject: () => void;
  onOpenVideoGenerator?: () => void;
  onReplayIntro?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({
  project,
  activeTab,
  onTabChange,
  isGeneratingAll,
  onGenerateAll,
  onOpenExport,
  onOpenHistory,
  onNewProject,
  onOpenVideoGenerator,
  onReplayIntro,
  darkMode,
  onToggleDarkMode,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center justify-between px-3 sm:px-6">
        {/* Left: Mobile Drawer Trigger + Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenHistory}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary lg:hidden"
            aria-label="Open Project History"
          >
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
          </button>

          <div
            onClick={onReplayIntro}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Replay CineSensei Gaming Launch Intro 🎬"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Clapperboard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-base sm:text-lg bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent group-hover:opacity-90">
                  CINESENSEI
                </span>
                <span className="hidden rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-500 sm:inline-block">
                  🎌 Anime Studio
                </span>
              </div>
              {project && (
                <p className="hidden max-w-[280px] truncate text-xs text-muted-foreground md:block">
                  {project.title}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center: Dedicated Mode Switcher Tabs (Pipeline vs Meme Studio) */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/80 border border-border">
          <button
            onClick={() => onTabChange("pipeline")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "pipeline"
                ? "bg-background text-foreground shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clapperboard className="h-3.5 w-3.5 text-primary" />
            <span>🎬 Pipeline</span>
          </button>

          <button
            onClick={() => onTabChange("memes")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "memes"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-amber-500"
            }`}
          >
            <span>🎭 Meme Studio</span>
            <span className="hidden sm:inline-block rounded bg-amber-400/30 px-1 py-0.2 text-[9px] font-black uppercase text-amber-950 dark:text-amber-200">
              New Tab
            </span>
          </button>
        </div>

        {/* Center / Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {project && (
            <>
              {/* New Project Button */}
              <button
                onClick={onNewProject}
                className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary sm:inline-flex"
                title="Create New Project"
              >
                <PlusCircle className="h-4 w-4 text-muted-foreground" />
                <span>New Project</span>
              </button>

              {/* Generate All Pipeline Mode */}
              <button
                onClick={onGenerateAll}
                disabled={isGeneratingAll}
                className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                  isGeneratingAll
                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 cursor-wait"
                    : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-primary/25"
                }`}
                title="Automatically generate all 7 stages sequentially"
              >
                {isGeneratingAll ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Auto-Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span className="hidden xs:inline">Generate All</span>
                    <span className="xs:hidden">All</span>
                  </>
                )}
              </button>

              {/* Casual Video Generator Button */}
              {onOpenVideoGenerator && (
                <button
                  onClick={onOpenVideoGenerator}
                  className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition-all shadow-xs"
                  title="Launch Casual AI Video Simulator (Grok / Reel style)"
                >
                  <Film className="h-3.5 w-3.5 text-purple-400" />
                  <span>Casual Video Studio</span>
                </button>
              )}

              {/* Export Button */}
              <button
                onClick={onOpenExport}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                title="Export Package (PDF, Markdown, CSV)"
              >
                <Download className="h-4 w-4 text-muted-foreground" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Toggle Dark and Light Mode"
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
