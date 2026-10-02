"use client";

import React from "react";
import { StyleProfile } from "@/lib/types";
import { BarChartIcon, SparklesIcon, WandIcon } from "./Icons";

interface StyleProfileViewProps {
  styleProfile: StyleProfile | null;
  onAnalyzeStyle: () => void;
  loadingAnalysis: boolean;
  onSelectTab: (tab: string) => void;
}

export function StyleProfileView({
  styleProfile,
  onAnalyzeStyle,
  loadingAnalysis,
  onSelectTab,
}: StyleProfileViewProps) {
  if (!styleProfile) {
    return (
      <div className="text-center py-20 bg-[#153037] rounded-lg p-8 max-w-lg mx-auto border border-[#2A4C54]">
        <BarChartIcon className="w-10 h-10 text-[#8FA8A6] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#E9EFEA] mb-2">Style profile not calculated</h2>
        <p className="text-xs text-[#8FA8A6] mb-6 leading-relaxed">
          Analyze historical posts to extract measurable text statistics, structural templates, tone indicators, and visual patterns.
        </p>
        <button
          onClick={onAnalyzeStyle}
          disabled={loadingAnalysis}
          className="px-5 py-2.5 rounded-md bg-[#2A4C54] hover:bg-[#2A4C54]/80 text-[#E9EFEA] font-semibold text-xs border border-[#2A4C54] transition-colors"
        >
          {loadingAnalysis ? "Running NLP & Visual Analysis..." : "Analyze Creator Style Profile"}
        </button>
      </div>
    );
  }

  const {
    tone_scores,
    caption_stats,
    formatting_patterns,
    emoji_profile,
    hashtag_profile,
    cta_profile,
    common_structures,
  } = styleProfile;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-[#153037] p-6 rounded-lg border border-[#2A4C54] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#8FA8A6] uppercase tracking-wider block mb-1">
            Learned Representation
          </span>
          <h2 className="text-2xl font-bold text-[#E9EFEA] tracking-tight">
            Creator Style Profile
          </h2>
          <p className="text-xs text-[#8FA8A6] mt-1">
            Aggregated deterministic features, NLP metrics, structural templates, and visual characteristics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onAnalyzeStyle}
            disabled={loadingAnalysis}
            className="px-4 py-2 rounded-md bg-[#0E2327] hover:bg-[#2A4C54] text-[#E9EFEA] text-xs font-medium border border-[#2A4C54] transition-colors"
          >
            {loadingAnalysis ? "Re-analyzing..." : "Re-calculate Profile"}
          </button>
          <button
            onClick={() => onSelectTab("generate")}
            className="px-5 py-2 rounded-md bg-[#F0B429] hover:bg-[#F0B429]/90 text-[#1A1405] font-bold text-xs transition-colors flex items-center space-x-1.5"
          >
            <WandIcon className="w-3.5 h-3.5" />
            <span>Generate Post</span>
          </button>
        </div>
      </div>

      {/* Grid Section 1: Tone & Length */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tone Breakdown — All Marigold Fills */}
        <div className="bg-[#153037] p-6 rounded-lg border border-[#2A4C54] space-y-4">
          <h3 className="text-sm font-bold text-[#E9EFEA] flex items-center space-x-2">
            <SparklesIcon className="w-4 h-4 text-[#8FA8A6]" />
            <span>Tone indicator scores</span>
          </h3>

          <div className="space-y-3.5">
            {[
              { label: "Formality", value: tone_scores.formality },
              { label: "Conversational", value: tone_scores.conversational },
              { label: "Educational", value: tone_scores.educational },
              { label: "Promotional", value: tone_scores.promotional },
              { label: "Storytelling", value: tone_scores.storytelling },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-[#E9EFEA]">
                  <span>{item.label}</span>
                  <span className="text-[#8FA8A6]">{Math.round(item.value * 100)}%</span>
                </div>
                <div className="w-full bg-[#2A4C54] rounded-sm h-2 overflow-hidden">
                  <div
                    className="bg-[#F0B429] h-2 rounded-sm transition-all duration-300"
                    style={{ width: `${item.value * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Caption Statistics & Preferred Range */}
        <div className="bg-[#153037] p-6 rounded-lg border border-[#2A4C54] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#E9EFEA] mb-4 flex items-center space-x-2">
              <BarChartIcon className="w-4 h-4 text-[#8FA8A6]" />
              <span>Caption length & formatting</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3.5 rounded bg-[#0E2327] border border-[#2A4C54]">
                <span className="text-xs text-[#8FA8A6] block">Average word count</span>
                <p className="text-xl font-bold text-[#E9EFEA] mt-0.5">{caption_stats.average_word_count}</p>
                <span className="text-[10px] text-[#8FA8A6]">Target caption size</span>
              </div>

              <div className="p-3.5 rounded bg-[#0E2327] border border-[#2A4C54]">
                <span className="text-xs text-[#8FA8A6] block">Preferred word range</span>
                <p className="text-xl font-bold text-[#E9EFEA] mt-0.5">
                  {caption_stats.preferred_range ? `${caption_stats.preferred_range[0]}-${caption_stats.preferred_range[1]}` : "80-160"}
                </p>
                <span className="text-[10px] text-[#8FA8A6]">25th-75th percentile</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#E9EFEA]">
              <div className="flex justify-between py-1.5 border-b border-[#2A4C54]">
                <span className="text-[#8FA8A6]">Average sentence length</span>
                <span className="font-medium">{caption_stats.average_sentence_length} words</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#2A4C54]">
                <span className="text-[#8FA8A6]">Short paragraph preference</span>
                <span className="font-medium">{formatting_patterns.short_paragraphs ? "Yes (Spaced)" : "Dense"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#8FA8A6]">Bullet list usage</span>
                <span className="font-medium">{Math.round((formatting_patterns.bullet_list_frequency || 0) * 100)}% of posts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section 2: Emojis, Hashtags, CTA & Structures */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Emoji & Hashtag Profile */}
        <div className="bg-[#153037] p-6 rounded-lg border border-[#2A4C54] space-y-4">
          <h3 className="text-xs font-bold text-[#8FA8A6] uppercase tracking-wider">Emoji & hashtag behavior</h3>
          
          <div>
            <span className="text-xs text-[#8FA8A6] block">Top recurring emojis:</span>
            <div className="flex items-center space-x-2 mt-2">
              {(emoji_profile.top_emojis || ["🚀", "💡"]).map((emo, idx) => (
                <span key={idx} className="text-lg p-2 rounded bg-[#0E2327] border border-[#2A4C54]">
                  {emo}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#2A4C54]">
            <span className="text-xs text-[#8FA8A6] block">Common hashtags (avg {hashtag_profile.avg_count} per post):</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(hashtag_profile.common_hashtags || []).map((h, i) => (
                <span key={i} className="text-xs text-[#E9EFEA] bg-[#0E2327] px-2.5 py-1 rounded border border-[#2A4C54]">
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Profile */}
        <div className="bg-[#153037] p-6 rounded-lg border border-[#2A4C54] space-y-4">
          <h3 className="text-xs font-bold text-[#8FA8A6] uppercase tracking-wider">Call-to-action profile</h3>
          
          <div className="p-3.5 rounded bg-[#0E2327] border border-[#2A4C54] text-center">
            <span className="text-xs text-[#8FA8A6] block">Call-to-action presence</span>
            <p className="text-2xl font-bold text-[#E9EFEA] mt-1">{Math.round((cta_profile.frequency || 0) * 100)}%</p>
          </div>

          <div>
            <span className="text-xs text-[#8FA8A6] block mb-2">Frequent CTA phrases:</span>
            <div className="space-y-1.5">
              {(cta_profile.common_phrases || ["Drop a comment below!"]).map((cta, i) => (
                <div key={i} className="text-xs text-[#E9EFEA] bg-[#0E2327] px-3 py-1.5 rounded border border-[#2A4C54]">
                  "<span className="highlighter">{cta}</span>"
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Structural Flow Diagram */}
        <div className="bg-[#153037] p-6 rounded-lg border border-[#2A4C54] space-y-4">
          <h3 className="text-xs font-bold text-[#8FA8A6] uppercase tracking-wider">Content structure sequence</h3>

          <span className="text-xs text-[#8FA8A6] block">Dominant structural flow:</span>
          
          <div className="space-y-2">
            {(common_structures[0] || ["hook", "explanation", "takeaway", "cta"]).map((step, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded bg-[#2A4C54] text-[#E9EFEA] text-[10px] font-bold flex items-center justify-center border border-[#2A4C54]">
                  {idx + 1}
                </span>
                <span className="text-xs font-semibold text-[#E9EFEA] uppercase bg-[#0E2327] px-3 py-1 rounded border border-[#2A4C54] flex-grow">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
