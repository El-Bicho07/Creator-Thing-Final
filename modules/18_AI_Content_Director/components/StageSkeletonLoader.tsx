"use client";

import React from "react";
import { Loader2, Sparkles } from "lucide-react";

interface StageSkeletonLoaderProps {
  stageNumber: number;
  stageTitle: string;
}

const STAGE_MESSAGES: Record<number, string> = {
  1: "Scanning verified sources, extracting statistics, and analyzing audience pain points...",
  2: "Formulating 5 distinct psychological angles, viral hooks, and uniqueness scores...",
  3: "Architecting beat-by-beat story pacing, core theme, and emotional tension curves...",
  4: "Drafting full teleprompter script, word count cadence, and vocal delivery notes...",
  5: "Designing art direction, B-roll cutaways, stock search keywords, and soundscape...",
  6: "Building production shot list, camera movement cues, and shoot logistics...",
  7: "Synthesizing SEO description, thumbnail concepts, and multi-platform distribution copy...",
};

export function StageSkeletonLoader({ stageNumber, stageTitle }: StageSkeletonLoaderProps) {
  const message = STAGE_MESSAGES[stageNumber] || "Directing content pipeline...";

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in py-4">
      {/* Active AI Progress Card */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-3 shadow-inner">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary animate-bounce">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Stage {stageNumber}: Generating {stageTitle}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {message}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary pt-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing structured JSON via AI Content Director Engine...</span>
        </div>
      </div>

      {/* Shimmering Skeletons */}
      <div className="space-y-4">
        {/* Skeleton Top Box */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="h-4 w-32 rounded-md bg-secondary animate-pulse" />
          <div className="h-7 w-3/4 rounded-md bg-secondary animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded-md bg-secondary animate-pulse" />
            <div className="h-4 w-5/6 rounded-md bg-secondary animate-pulse" />
          </div>
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="h-8 w-24 rounded-md bg-secondary animate-pulse" />
              <div className="h-4 w-full rounded-md bg-secondary animate-pulse" />
              <div className="h-3 w-2/3 rounded-md bg-secondary animate-pulse" />
            </div>
          ))}
        </div>

        {/* Skeleton List Items */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="h-5 w-48 rounded-md bg-secondary animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-full rounded-xl bg-secondary/60 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
