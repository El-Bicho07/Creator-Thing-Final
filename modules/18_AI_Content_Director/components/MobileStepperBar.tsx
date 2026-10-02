"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  X,
  Check,
  Sparkles,
  Search,
  Compass,
  GitFork,
  FileText,
  Film,
  Camera,
  Share2
} from "lucide-react";
import { STAGES_CONFIG } from "@/lib/stages-config";

interface MobileStepperBarProps {
  currentStage: number;
  completedStages: number[];
  onSelectStage: (stageNum: number) => void;
}

const ICONS: Record<string, any> = {
  Search,
  Compass,
  GitFork,
  FileText,
  Film,
  Camera,
  Share2,
};

export function MobileStepperBar({
  currentStage,
  completedStages,
  onSelectStage,
}: MobileStepperBarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const activeStage = STAGES_CONFIG.find((s) => s.number === currentStage) || STAGES_CONFIG[0];
  const progressPercent = Math.round((completedStages.length / 7) * 100);

  return (
    <>
      {/* Compact Top Bar on Mobile & Tablet */}
      <div className="xl:hidden w-full border-b border-border bg-card/90 backdrop-blur px-4 py-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 text-left focus:outline-none"
            aria-label="Open stage navigation drawer"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
              {currentStage}
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">
                  Step {currentStage} of 7: {activeStage.title}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-1">
                {activeStage.shortDesc}
              </p>
            </div>
          </button>

          <span className="text-xs font-semibold text-primary">
            {progressPercent}% Done
          </span>
        </div>

        {/* Mini progress bar */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${Math.max(5, (currentStage / 7) * 100)}%` }}
          />
        </div>
      </div>

      {/* Stage Navigation Drawer / Bottom Sheet */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Pipeline Stages</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
                aria-label="Close stage drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-3 space-y-2">
              {STAGES_CONFIG.map((stage) => {
                const isCurrent = stage.number === currentStage;
                const isCompleted = completedStages.includes(stage.number);
                const Icon = ICONS[stage.icon] || Search;

                return (
                  <button
                    key={stage.number}
                    onClick={() => {
                      onSelectStage(stage.number);
                      setIsDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[52px] ${
                      isCurrent
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : isCompleted
                        ? "border-border bg-card hover:bg-secondary/60"
                        : "border-border/40 bg-secondary/20 hover:bg-secondary/40"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : stage.number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {stage.title}
                        </span>
                        {isCompleted && (
                          <span className="text-[10px] text-emerald-500 font-semibold">Completed</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{stage.shortDesc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
