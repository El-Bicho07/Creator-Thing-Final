"use client";

import React from "react";
import {
  Compass,
  CheckCircle2,
  Sparkles,
  Zap,
  Target,
  Gauge,
  Flame,
  ArrowRight
} from "lucide-react";
import { AnglesData, AngleItem } from "@/lib/types";

interface AnglesStageProps {
  data: AnglesData;
  onSelectAngle: (angleId: string) => void;
}

export function AnglesStage({ data, onSelectAngle }: AnglesStageProps) {
  const selectedId = data.selectedAngleId || data.angles[0]?.id;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Intro Header */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
          <Compass className="h-4 w-4" />
          <span>Stage 2: Strategic Positioning</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Select Your Core Content Angle
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Review these 5 distinct narrative angles. Each tests a different psychological trigger
          and hook mechanism. Select the winning angle to architect the story structure in Stage 3.
        </p>
      </div>

      {/* 5 Angles Cards Grid */}
      <div className="space-y-4">
        {data.angles.map((angle, index) => {
          const isSelected = angle.id === selectedId;

          return (
            <div
              key={angle.id}
              onClick={() => onSelectAngle(angle.id)}
              className={`group relative rounded-2xl border p-5 sm:p-6 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary"
                  : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40"
              }`}
            >
              {/* Top row: Angle index, Title, Selection Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {angle.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground">
                    <Target className="h-3 w-3 text-primary" />
                    <span>{angle.targetEmotion}</span>
                  </span>

                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-xs font-bold text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Selected Angle</span>
                    </span>
                  ) : (
                    <span className="hidden sm:inline-flex text-xs text-muted-foreground group-hover:text-foreground">
                      Click to Select
                    </span>
                  )}
                </div>
              </div>

              {/* Hook Quote Box */}
              <div className="rounded-xl border border-border/80 bg-background/80 p-3.5 my-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                  <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span>The 3-Second Viral Hook</span>
                </div>
                <p className="text-sm sm:text-base font-semibold text-foreground italic">
                  "{angle.hook}"
                </p>
              </div>

              {/* Angle Description & Fit */}
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                {angle.description}
              </p>

              <div className="text-xs text-foreground/80 mb-4 bg-secondary/30 rounded-lg p-2.5 border border-border/40">
                <span className="font-semibold text-primary">Target Audience Fit: </span>
                <span>{angle.targetAudienceFit}</span>
              </div>

              {/* Bottom Scores Meter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/60">
                {/* Uniqueness Score */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" /> Uniqueness Rating
                    </span>
                    <span className="font-bold text-foreground">{angle.uniquenessScore} / 10</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full"
                      style={{ width: `${angle.uniquenessScore * 10}%` }}
                    />
                  </div>
                </div>

                {/* Difficulty Score */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-amber-500" /> Production Difficulty
                    </span>
                    <span className="font-bold text-foreground">{angle.difficultyScore} / 10</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full"
                      style={{ width: `${angle.difficultyScore * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
