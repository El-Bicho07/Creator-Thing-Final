"use client";

import React from "react";
import {
  FileText,
  TrendingUp,
  BarChart3,
  HelpCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Bookmark
} from "lucide-react";
import { ResearchData } from "@/lib/types";
import { copyToClipboard } from "@/lib/utils";

interface ResearchStageProps {
  data: ResearchData;
  onUpdate?: (updated: ResearchData) => void;
}

export function ResearchStage({ data }: ResearchStageProps) {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopyFact = async (text: string, index: number) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1800);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Executive Overview Card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-2">
          <FileText className="h-4 w-4" />
          <span>Strategic Briefing</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
          Topic Overview & Market Context
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {data.topicOverview}
        </p>
      </div>

      {/* Verified Statistics Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            Verified Data & High-Impact Statistics
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {data.statistics.map((st, i) => (
            <div
              key={i}
              className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col justify-between"
            >
              <div>
                <span className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                  {st.stat}
                </span>
                <p className="text-xs sm:text-sm text-foreground/90 mt-2 leading-snug">
                  {st.context}
                </p>
              </div>
              {st.source && (
                <div className="mt-3 pt-2 border-t border-primary/10 text-[10px] text-muted-foreground">
                  Source: <span className="font-medium text-foreground">{st.source}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Key Facts & Audience Pain Points */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Facts */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary" />
              <span>Core Factual Pillars</span>
            </h3>
            <span className="text-xs text-muted-foreground">{data.keyFacts.length} verified</span>
          </div>

          <div className="space-y-2.5">
            {data.keyFacts.map((fact, i) => (
              <div
                key={i}
                className="group relative flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs sm:text-sm text-foreground/90 hover:bg-secondary/60 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="leading-relaxed">{fact}</p>
                </div>
                <button
                  onClick={() => handleCopyFact(fact, i)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity"
                  title="Copy fact"
                >
                  {copiedIndex === i ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Audience Pain Points */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              <span>Audience Pain Points & Objections</span>
            </h3>
            <span className="text-xs text-rose-500 font-medium">Retention Drivers</span>
          </div>

          <div className="space-y-2.5">
            {data.audiencePainPoints.map((pain, i) => (
              <div
                key={i}
                className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs sm:text-sm text-foreground/90 flex items-start gap-2.5"
              >
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                <p className="leading-relaxed">{pain}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Trends & Common Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trends */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3">
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span>Emerging Industry Trends</span>
          </h3>
          <ul className="space-y-2">
            {data.trends.map((trend, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground"
              >
                <span className="text-emerald-500 font-bold shrink-0">↗</span>
                <span>{trend}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Questions */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3">
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-indigo-400" />
            <span>Audience FAQ to Answer in Content</span>
          </h3>
          <ul className="space-y-2">
            {data.commonQuestions.map((q, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground"
              >
                <span className="text-indigo-400 font-bold shrink-0">?</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sources & Citations */}
      {data.sources && data.sources.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" />
              <span>Reference Sources & Reading Material</span>
            </h3>
            <span className="text-xs text-muted-foreground">Source Links</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.sources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between rounded-xl border border-border/80 bg-secondary/20 p-3.5 hover:border-primary/50 hover:bg-secondary/60 transition-all text-left"
              >
                <div>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center justify-between gap-1">
                    <span className="truncate">{source.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-70 group-hover:opacity-100" />
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {source.snippet}
                  </p>
                </div>
                <span className="text-[10px] text-primary/80 mt-2 truncate font-mono">
                  {source.url.replace(/^https?:\/\//, "")}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
