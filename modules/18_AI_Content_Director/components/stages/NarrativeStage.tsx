"use client";

import React from "react";
import {
  GitFork,
  Clock,
  Compass,
  Zap,
  Target,
  ChevronRight,
  Sparkles,
  Flame
} from "lucide-react";
import { NarrativeData } from "@/lib/types";

interface NarrativeStageProps {
  data: NarrativeData;
}

export function NarrativeStage({ data }: NarrativeStageProps) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Narrative Blueprint Header Card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <GitFork className="h-4 w-4" />
            <span>Stage 3: Story Architecture</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
              {data.framework}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>~{data.estimatedTotalMinutes} Min</span>
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Story Structure & Pacing Strategy
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>Target Pacing:</strong> {data.targetPacing}
          </p>
        </div>

        {/* Core Theme Box */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Overarching Core Theme</span>
          </span>
          <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
            "{data.coreTheme}"
          </p>
        </div>
      </div>

      {/* Beat-by-Beat Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <span>Beat-by-Beat Timeline Outline</span>
          </h3>
          <span className="text-xs text-muted-foreground">{data.beats.length} Narrative Beats</span>
        </div>

        <div className="relative pl-6 sm:pl-8 space-y-4 sm:space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
          {data.beats.map((beat, index) => (
            <div
              key={index}
              className="relative rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-colors"
            >
              {/* Timeline Dot */}
              <div className="absolute -left-[31px] sm:-left-[39px] top-5 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-4 ring-background">
                {index + 1}
              </div>

              {/* Beat Top Row: Act + Timing */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    {beat.act}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <h4 className="text-base font-bold text-foreground">
                    {beat.beatTitle}
                  </h4>
                </div>

                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-0.5 font-mono text-xs font-medium text-foreground">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>{beat.timing}</span>
                </span>
              </div>

              {/* Key Point */}
              <div className="rounded-lg bg-secondary/40 p-3 text-xs sm:text-sm text-foreground my-2 border border-border/40">
                <span className="font-semibold text-primary">Key Reveal / Action: </span>
                <span>{beat.keyPoint}</span>
              </div>

              {/* Grid: Goal & Emotional Arc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="flex items-start gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">Beat Goal: </span>
                    <span className="text-muted-foreground">{beat.goal}</span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">Emotional Arc: </span>
                    <span className="text-muted-foreground">{beat.emotionalArc}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
