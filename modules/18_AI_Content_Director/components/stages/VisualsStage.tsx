"use client";

import React, { useState } from "react";
import {
  Film,
  Camera,
  Layers,
  Search,
  Music,
  Palette,
  Sparkles,
  Copy,
  Check,
  Play,
  Laugh,
  Clapperboard,
  Tv,
  Eye
} from "lucide-react";
import { VisualsData } from "@/lib/types";
import { copyToClipboard } from "@/lib/utils";

interface VisualsStageProps {
  data: VisualsData;
  onOpenMemeStudio?: () => void;
}

export function VisualsStage({ data, onOpenMemeStudio }: VisualsStageProps) {
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  const handleCopyKeyword = async (kw: string) => {
    const ok = await copyToClipboard(kw);
    if (ok) {
      setCopiedKeyword(kw);
      setTimeout(() => setCopiedKeyword(null), 1500);
    }
  };

  const handleCopyAiPrompt = async (item: any, id: string) => {
    const prompt = `Cinematic 4K shot of ${item.onScreenVisuals}. B-roll action: ${item.bRollIdeas?.[0] || 'close-up action'}. Lighting: directional key light with atmospheric rim glow, photorealistic 35mm anamorphic depth of field, 8k resolution, Unreal Engine 5 render style --ar 16:9 --style raw`;
    const ok = await copyToClipboard(prompt);
    if (ok) {
      setCopiedPromptId(id);
      setTimeout(() => setCopiedPromptId(null), 2000);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Visual Direction Overview Header */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <Film className="h-4 w-4" />
            <span>Stage 5: Visual & Audio Production Direction 🎨</span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
            <span>✨ Creative Studio Grade</span>
          </span>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Art Direction, B-Roll & Visual Assets 🎬
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete visual grammar designed to prevent viewer drop-off via constant visual resets.
          </p>
        </div>

        {/* Art Direction Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Overall Mood */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              <span>Cinematography Mood 📸</span>
            </span>
            <p className="text-xs sm:text-sm text-foreground/90 font-medium">
              {data.overallMood}
            </p>
          </div>

          {/* Color Palette */}
          <div className="rounded-xl border border-border bg-background/50 p-4 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-pink-500" />
              <span>Color Palette 🎨</span>
            </span>
            <p className="text-xs sm:text-sm text-foreground font-medium">
              {data.colorPaletteSuggestion}
            </p>
          </div>

          {/* Music Pacing */}
          <div className="rounded-xl border border-border bg-background/50 p-4 space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Music className="h-3.5 w-3.5 text-cyan-400" />
              <span>Audio & Music Pacing 🎵</span>
            </span>
            <p className="text-xs sm:text-sm text-foreground font-medium">
              {data.musicPacing}
            </p>
          </div>
        </div>
      </div>

      {/* Section-by-Section Visual Plans */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span>Section Visual Shot Plans & B-Roll Assets ⚡</span>
          </h3>
          <span className="text-xs text-muted-foreground">{data.items.length} Production Scenes</span>
        </div>

        {data.items.map((item, idx) => (
          <div
            key={item.sectionId || idx}
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5 transition-all hover:border-primary/40"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
              <h4 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  {idx + 1}
                </span>
                <span>{item.sectionTitle}</span>
              </h4>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-lg">
                <Music className="h-3.5 w-3.5 text-primary" />
                <span className="truncate max-w-[220px]">{item.musicMood}</span>
              </div>
            </div>

            {/* Visual Media Showcase: High-Res Visual Shot & Video Preview Badge */}
            {item.imageUrl && (
              <div className="relative rounded-xl overflow-hidden border border-border/80 group">
                <div className="relative aspect-video sm:aspect-[21/9] w-full bg-zinc-950 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.sectionTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Top Left Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="rounded-md bg-black/70 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Camera className="h-3 w-3 text-primary" />
                      <span>Scene {idx + 1} Framing</span>
                    </span>
                    {item.videoPreviewBadge && (
                      <span className="rounded-md bg-primary/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white">
                        {item.videoPreviewBadge}
                      </span>
                    )}
                  </div>

                  {/* Center Play Button Overlay */}
                  <button
                    onClick={() => setActivePreviewImage(item.imageUrl || null)}
                    className="absolute inset-0 m-auto h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white hover:scale-110 transition-transform group-hover:bg-primary shadow-xl"
                    title="Inspect Visual Framing"
                  >
                    <Play className="h-6 w-6 fill-current translate-x-0.5" />
                  </button>

                  {/* Bottom Text Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-xs sm:text-sm font-semibold drop-shadow-md line-clamp-1">
                      {item.onScreenVisuals}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* On Screen Visuals Description */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Clapperboard className="h-3.5 w-3.5" />
                <span>Primary On-Screen Action & Lighting</span>
              </div>
              <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                {item.onScreenVisuals}
              </p>
            </div>

            {/* Tamil Comedy Meme Cutaway Card (If available for Tanglish/Tamil) */}
            {item.tamilComedyMeme && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                    <Laugh className="h-4 w-4" />
                    <span>Tamil Comedy Reaction Cutaway: {item.tamilComedyMeme.comedian} 🎭</span>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    {item.tamilComedyMeme.movieRef}
                  </span>
                </div>
                <div className="text-sm font-extrabold text-foreground italic bg-background/60 p-2.5 rounded-lg border border-amber-500/20">
                  &ldquo;{item.tamilComedyMeme.iconicDialogue}&rdquo;
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Director's Meme Cue: </strong>{item.tamilComedyMeme.memeContext}
                </p>
              </div>
            )}

            {/* B-Roll & Cutaways */}
            <div>
              <div className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-amber-500" />
                <span>B-Roll Cutaway Ideas (Prevent Retention Drop) 🎥</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {item.bRollIdeas.map((broll, bIdx) => (
                  <div
                    key={bIdx}
                    className="rounded-xl border border-border bg-secondary/30 p-2.5 text-xs text-foreground/90 flex items-start gap-2 hover:bg-secondary/60 transition-colors"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <span className="leading-snug">{broll}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stock Search Keywords */}
            <div>
              <div className="text-xs font-bold text-foreground mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-primary" />
                  <span>Stock Search Keywords (Click to copy for Storyblocks/Artgrid) 🔍</span>
                </span>
                <span className="text-[10px] text-muted-foreground">Click tag to copy</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.stockKeywords.map((kw, kwIdx) => {
                  const isCopied = copiedKeyword === kw;
                  return (
                    <button
                      key={kwIdx}
                      onClick={() => handleCopyKeyword(kw)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                        isCopied
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 font-bold"
                          : "border-border bg-secondary/50 text-foreground hover:bg-secondary hover:border-primary/40"
                      }`}
                    >
                      {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                      <span>{kw}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Graphics & Overlays */}
            {item.graphicsOverlays && item.graphicsOverlays.length > 0 && (
              <div>
                <div className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>On-Screen Graphics & Kinetic Typography ✨</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.graphicsOverlays.map((g, gIdx) => (
                    <span
                      key={gIdx}
                      className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs text-indigo-600 dark:text-indigo-300 font-medium"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Image Generation & Situational Meme Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60 text-xs">
              <button
                onClick={() => handleCopyAiPrompt(item, item.sectionId || String(idx))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 font-semibold text-primary hover:bg-primary/20 transition-colors"
                title="Copy ready-to-use prompt for Grok Imagine / Midjourney / Flux"
              >
                {copiedPromptId === (item.sectionId || String(idx)) ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-500">AI Prompt Copied!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Copy Grok / AI Image Prompt</span>
                  </>
                )}
              </button>

              {onOpenMemeStudio && (
                <button
                  onClick={onOpenMemeStudio}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 font-semibold text-amber-500 hover:bg-amber-500/20 transition-colors"
                  title="Search & customize a situational meme for this exact scene"
                >
                  <Laugh className="h-3.5 w-3.5" />
                  <span>Situational Meme Studio 🎭</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal for Visual Inspection */}
      {activePreviewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActivePreviewImage(null)}
        >
          <div className="relative max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <img
              src={activePreviewImage}
              alt="Visual Framing Preview"
              className="w-full h-auto max-h-[85dvh] object-contain bg-black"
            />
            <button
              onClick={() => setActivePreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 hover:bg-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
