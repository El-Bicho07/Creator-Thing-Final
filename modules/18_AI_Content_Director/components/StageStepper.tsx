"use client";

import React from "react";
import {
  Check,
  Search,
  Compass,
  GitFork,
  FileText,
  Film,
  Camera,
  Share2,
  Lightbulb,
  Clock,
  Sparkles,
  Info
} from "lucide-react";
import { STAGES_CONFIG } from "@/lib/stages-config";
import { Project } from "@/lib/types";

interface StageStepperProps {
  currentStage: number;
  completedStages: number[];
  onSelectStage: (stageNum: number) => void;
  project: Project;
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

export function StageStepper({
  currentStage,
  completedStages,
  onSelectStage,
  project,
}: StageStepperProps) {
  const activeStageConfig = STAGES_CONFIG.find((s) => s.number === currentStage) || STAGES_CONFIG[0];

  return (
    <aside className="w-80 shrink-0 h-[calc(100dvh-4rem)] sticky top-16 z-20 hidden xl:flex flex-col border-l border-border bg-card/60 backdrop-blur-xs p-5 overflow-y-auto">
      {/* Top Title */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Production Pipeline</span>
          </h2>
          <p className="text-xs text-muted-foreground">7 Guided Stages</p>
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
          Stage {currentStage} / 7
        </span>
      </div>

      {/* Stepper Vertical List */}
      <div className="py-4 space-y-2">
        {STAGES_CONFIG.map((stage) => {
          const isCurrent = stage.number === currentStage;
          const isCompleted = completedStages.includes(stage.number);
          const Icon = ICONS[stage.icon] || Search;

          return (
            <button
              key={stage.number}
              onClick={() => onSelectStage(stage.number)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all group focus:outline-none focus:ring-1 focus:ring-primary ${
                isCurrent
                  ? "border-primary bg-primary/10 shadow-sm"
                  : isCompleted
                  ? "border-border/60 bg-card/80 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  : "border-transparent bg-transparent hover:bg-secondary/40 text-muted-foreground"
              }`}
            >
              {/* Step indicator circle */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                  isCompleted
                    ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                    : isCurrent
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : stage.number}
              </div>

              {/* Title and subtext */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold truncate ${
                      isCurrent ? "text-primary font-bold" : "text-foreground"
                    }`}
                  >
                    {stage.title}
                  </span>
                  {isCompleted && (
                    <span className="text-[10px] text-emerald-500 font-medium">Ready</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{stage.shortDesc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Director Tip Card for active stage */}
      <div className="mt-auto pt-4 border-t border-border/80">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-500 mb-1.5">
            <Lightbulb className="h-4 w-4" />
            <span>Director's Playbook: {activeStageConfig.title}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {activeStageConfig.directorTip}
          </p>
        </div>

        {/* Project Target Spec Recap */}
        <div className="mt-3 rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Target Audience:</span>
            <span className="truncate max-w-[140px]">{project.targetAudience}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Format / Length:</span>
            <span>{project.targetDuration}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Style Tone:</span>
            <span className="capitalize">{project.tone}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
