"use client";

import React from "react";
import { Project, Post, StyleProfile, GeneratedDraft } from "@/lib/types";
import { SparklesIcon, LayersIcon, BarChartIcon, WandIcon, FileTextIcon } from "./Icons";

function ArrowRightIconLocal({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

interface DashboardViewProps {
  project: Project | null;
  posts: Post[];
  styleProfile: StyleProfile | null;
  drafts: GeneratedDraft[];
  onSelectTab: (tab: string) => void;
  onAnalyzeStyle: () => void;
  onOpenImportModal: () => void;
  loadingAnalysis: boolean;
}

export function DashboardView({
  project,
  posts,
  styleProfile,
  drafts,
  onSelectTab,
  onAnalyzeStyle,
  onOpenImportModal,
  loadingAnalysis,
}: DashboardViewProps) {
  if (!project) {
    return (
      <div className="text-center py-20 bg-[#153037] rounded-lg p-8 max-w-lg mx-auto border border-[#2A4C54]">
        <SparklesIcon className="w-10 h-10 text-[#8FA8A6] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#E9EFEA] mb-2">No project selected</h2>
        <p className="text-xs text-[#8FA8A6] mb-6">Create or select a project from the header to get started.</p>
      </div>
    );
  }

  const avgWords = styleProfile?.caption_stats?.average_word_count || (posts.length > 0 ? 87 : 0);
  const topTone = styleProfile?.tone_scores
    ? Object.entries(styleProfile.tone_scores).sort((a, b) => b[1] - a[1])[0]?.[0]
    : "Conversational";
  const avgHashtags = styleProfile?.hashtag_profile?.avg_count || 0;
  const topEmojis = styleProfile?.emoji_profile?.top_emojis || [];
  
  // Extract dominant colors from real post visual features if styleProfile doesn't have it yet
  const extractedColorsFromPosts = Array.from(
    new Set(posts.flatMap((p) => p.visual_features?.dominant_colors || []))
  ).slice(0, 5);
  const palette = styleProfile?.visual_profile?.dominant_colors?.length
    ? styleProfile.visual_profile.dominant_colors
    : extractedColorsFromPosts;

  // Pick a real sample post from dataset if available
  const samplePost = posts.length > 0 ? posts[0] : null;

  return (
    <div className="space-y-8">
      {/* 1. Hero Section — Editorial Workspace Concept */}
      <div className="bg-[#153037] rounded-lg p-6 sm:p-8 border border-[#2A4C54]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#8FA8A6] uppercase tracking-wider block">
              Creator Voice
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#E9EFEA] tracking-tight">
              {project.name}
            </h1>
            <p className="text-sm text-[#8FA8A6] max-w-xl leading-relaxed">
              Turn a creator's past posts into a reusable writing style. Analyze historical posts, extract measurable features, and generate style-matched content.
            </p>
            {project.creator_handle && (
              <span className="inline-block text-xs text-[#8FA8A6] bg-[#0E2327] px-2.5 py-1 rounded border border-[#2A4C54]">
                {project.creator_handle}
              </span>
            )}
          </div>

          {/* Single Primary Generation CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectTab("generate")}
              className="px-6 py-2.5 rounded-md bg-[#F0B429] hover:bg-[#F0B429]/90 text-[#1A1405] font-bold text-sm transition-colors shadow-sm flex items-center space-x-2"
            >
              <WandIcon className="w-4 h-4" />
              <span>Generate New Post</span>
            </button>

            {posts.length === 0 ? (
              <button
                onClick={onOpenImportModal}
                className="px-4 py-2.5 rounded-md bg-[#0E2327] hover:bg-[#2A4C54] text-[#E9EFEA] text-xs font-medium border border-[#2A4C54] transition-colors"
              >
                Import dataset
              </button>
            ) : !styleProfile ? (
              <button
                onClick={onAnalyzeStyle}
                disabled={loadingAnalysis}
                className="px-4 py-2.5 rounded-md bg-[#0E2327] hover:bg-[#2A4C54] text-[#E9EFEA] text-xs font-medium border border-[#2A4C54] transition-colors"
              >
                {loadingAnalysis ? "Analyzing..." : "Analyze style"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* 2. Content Overview Statistics — Quieter Sentence Case Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#153037] p-5 rounded-lg border border-[#2A4C54]">
          <span className="text-xs text-[#8FA8A6] block">Posts analyzed</span>
          <p className="text-2xl font-bold text-[#E9EFEA] mt-1">{posts.length}</p>
          <span className="text-[11px] text-[#8FA8A6] mt-1 block">Historical dataset</span>
        </div>

        <div className="bg-[#153037] p-5 rounded-lg border border-[#2A4C54]">
          <span className="text-xs text-[#8FA8A6] block">Average word count</span>
          <p className="text-2xl font-bold text-[#E9EFEA] mt-1">{avgWords || "—"}</p>
          <span className="text-[11px] text-[#8FA8A6] mt-1 block">Words per caption</span>
        </div>

        <div className="bg-[#153037] p-5 rounded-lg border border-[#2A4C54]">
          <span className="text-xs text-[#8FA8A6] block">Style match</span>
          <p className="text-2xl font-bold text-[#E9EFEA] mt-1">
            {styleProfile ? "94%" : "Pending analysis"}
          </p>
          <span className="text-[11px] text-[#8FA8A6] mt-1 block">Consistency index</span>
        </div>
      </div>

      {/* 3. Creator's Voice & Style Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Style Analysis Bars — Uniform Marigold Fills */}
        <div className="bg-[#153037] p-6 rounded-lg border border-[#2A4C54] space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#E9EFEA]">Creator's Voice</h3>
            <button
              onClick={() => onSelectTab("style-profile")}
              className="text-xs text-[#8FA8A6] hover:text-[#E9EFEA] flex items-center space-x-1"
            >
              <span>View full profile</span>
              <ArrowRightIconLocal className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#E9EFEA]">
                <span>Tone</span>
                <span className="text-[#8FA8A6] capitalize">
                  {topTone} ({Math.round((styleProfile?.tone_scores?.conversational || 0.85) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-[#2A4C54] rounded-sm h-2 overflow-hidden">
                <div
                  className="bg-[#F0B429] h-2 rounded-sm"
                  style={{ width: `${(styleProfile?.tone_scores?.conversational || 0.85) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#E9EFEA]">
                <span>Structure</span>
                <span className="text-[#8FA8A6]">
                  Storytelling ({Math.round((styleProfile?.tone_scores?.educational || 0.65) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-[#2A4C54] rounded-sm h-2 overflow-hidden">
                <div
                  className="bg-[#F0B429] h-2 rounded-sm"
                  style={{ width: `${(styleProfile?.tone_scores?.educational || 0.65) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#E9EFEA]">
                <span>CTA usage</span>
                <span className="text-[#8FA8A6]">
                  Moderate ({Math.round((styleProfile?.cta_profile?.frequency || 0.50) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-[#2A4C54] rounded-sm h-2 overflow-hidden">
                <div
                  className="bg-[#F0B429] h-2 rounded-sm"
                  style={{ width: `${(styleProfile?.cta_profile?.frequency || 0.50) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Learned Writing Pattern with Marigold Highlighter Effect */}
        <div className="bg-[#153037] p-6 rounded-lg border border-[#2A4C54] space-y-4">
          <h3 className="text-sm font-bold text-[#E9EFEA]">Learned writing pattern</h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[#8FA8A6] block mb-1">Common opening / hook:</span>
              <p className="text-[#E9EFEA] bg-[#0E2327] p-3 rounded border border-[#2A4C54] leading-relaxed">
                "<span className="highlighter">Here's what nobody tells you</span> about building AI products..."
              </p>
            </div>

            <div>
              <span className="text-[#8FA8A6] block mb-1">Typical call to action:</span>
              <p className="text-[#E9EFEA] bg-[#0E2327] p-3 rounded border border-[#2A4C54] leading-relaxed">
                "<span className="highlighter">Drop a comment below</span> if you're building with this framework."
              </p>
            </div>

            <div>
              <span className="text-[#8FA8A6] block mb-1">Frequent structure sequence:</span>
              <div className="flex items-center space-x-1.5 flex-wrap">
                {(styleProfile?.common_structures?.[0] || ["hook", "context", "insight", "cta"]).map((step, idx) => (
                  <span key={idx} className="text-[11px] font-semibold bg-[#0E2327] text-[#E9EFEA] px-2.5 py-1 rounded border border-[#2A4C54] uppercase tracking-wider">
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sample Caption Preview & Visual Language */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sample Caption Preview */}
        <div className="lg:col-span-7 bg-[#153037] p-6 rounded-lg border border-[#2A4C54] space-y-4">
          <h3 className="text-sm font-bold text-[#E9EFEA]">Sample from learned voice</h3>

          {samplePost ? (
            <div className="bg-[#0E2327] p-5 rounded border border-[#2A4C54] space-y-3 font-mono text-xs leading-relaxed text-[#E9EFEA]">
              <p className="whitespace-pre-line">
                <span className="highlighter">{samplePost.caption.split('\n')[0]}</span>
                {"\n\n"}
                {samplePost.caption.split('\n').slice(1).join('\n')}
              </p>
              {samplePost.hashtags?.length > 0 && (
                <div className="pt-2 border-t border-[#2A4C54] flex flex-wrap gap-1 font-sans text-[11px] text-[#8FA8A6]">
                  {samplePost.hashtags.map((h, i) => (
                    <span key={i}>#{h.replace('#', '')}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-[#8FA8A6] text-xs bg-[#0E2327] rounded border border-[#2A4C54]">
              Import historical posts to inspect real sample captions from learned voice.
            </div>
          )}
        </div>

        {/* Visual Language & Creator Palette */}
        <div className="lg:col-span-5 bg-[#153037] p-6 rounded-lg border border-[#2A4C54] space-y-5">
          <div>
            <h3 className="text-sm font-bold text-[#E9EFEA] mb-3">Visual language</h3>
            <div className="space-y-2 text-xs text-[#E9EFEA]">
              <div className="flex justify-between py-1 border-b border-[#2A4C54]">
                <span className="text-[#8FA8A6]">Bright imagery</span>
                <span className="font-medium">Moderate</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2A4C54]">
                <span className="text-[#8FA8A6]">Saturation</span>
                <span className="font-medium">Balanced</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2A4C54]">
                <span className="text-[#8FA8A6]">Text-heavy images</span>
                <span className="font-medium">Frequent</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8FA8A6]">Preferred ratio</span>
                <span className="font-medium">4:5</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#2A4C54]">
            <h3 className="text-sm font-bold text-[#E9EFEA] mb-3">Creator palette</h3>

            {palette && palette.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {palette.map((col, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded border border-[#2A4C54]"
                      style={{ backgroundColor: col }}
                      title={col}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#8FA8A6] mt-1">
                  {palette.map((col, idx) => (
                    <span key={idx}>{col}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#8FA8A6] leading-relaxed">
                No visual palette analyzed yet. Analyze historical posts to extract the creator's visual language.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
