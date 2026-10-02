"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  Sparkles,
  Youtube,
  Instagram,
  Smartphone,
  Linkedin,
  Twitter,
  Image as ImageIcon,
  Tag,
  Hash,
  FileText,
  Play,
  Pause,
  ExternalLink,
  Flame,
  Tv,
  X,
  Volume2
} from "lucide-react";
import { PublishingData, Project } from "@/lib/types";
import { copyToClipboard } from "@/lib/utils";

interface PublishingStageProps {
  data: PublishingData;
  project?: Project | null;
  onOpenVideoGenerator?: () => void;
}

type PlatformTab = "youtube" | "reels" | "tiktok" | "linkedin" | "x";

export function PublishingStage({ data, project, onOpenVideoGenerator }: PublishingStageProps) {
  const [activeTab, setActiveTab] = useState<PlatformTab>("reels");
  const [copiedTitleIndex, setCopiedTitleIndex] = useState<number | null>(null);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState(false);

  const isTamil =
    (project?.language || "").toLowerCase().includes("tamil") ||
    (project?.language || "").toLowerCase().includes("tanglish");

  // Extra Feature: Local simulator fallback if onOpenVideoGenerator not provided
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorPlaying, setSimulatorPlaying] = useState(true);
  const [simulatorSecond, setSimulatorSecond] = useState(0);

  const sampleScenes = [
    { text: "🛑 STOP wasting 15 hours on a video that viewers abandon after 30 seconds!", duration: 5, bg: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80" },
    { text: "📉 70% of viewers leave right here if you don't use the 45-Second Visual Reset rule.", duration: 5, bg: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80" },
    { text: "💡 Pillar 1: Decouple research from writing. Pillar 2: Change visual grammar every 45s!", duration: 6, bg: "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80" },
    { text: "🔥 Grab the full 7-stage production blueprint linked in bio & hit subscribe!", duration: 5, bg: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80" }
  ];

  // Timer loop for video simulator
  useEffect(() => {
    let timer: any;
    if (isSimulatorOpen && simulatorPlaying) {
      timer = setInterval(() => {
        setSimulatorSecond((prev) => (prev >= 20 ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSimulatorOpen, simulatorPlaying]);

  const currentSceneIndex =
    simulatorSecond < 5 ? 0 : simulatorSecond < 10 ? 1 : simulatorSecond < 16 ? 2 : 3;
  const currentScene = sampleScenes[currentSceneIndex];

  const handleCopyTitle = async (title: string, index: number) => {
    const ok = await copyToClipboard(title);
    if (ok) {
      setCopiedTitleIndex(index);
      setTimeout(() => setCopiedTitleIndex(null), 1800);
    }
  };

  const handleCopyDesc = async () => {
    const ok = await copyToClipboard(data.seoDescription);
    if (ok) {
      setCopiedDesc(true);
      setTimeout(() => setCopiedDesc(false), 1800);
    }
  };

  const handleCopyCurrentPlatform = async () => {
    let textToCopy = "";
    if (activeTab === "youtube") {
      textToCopy = `Title: ${data.captions.youtube.title}\n\nDescription:\n${data.captions.youtube.description}\n\nTags: ${data.captions.youtube.tags.join(", ")}`;
    } else if (activeTab === "reels") {
      textToCopy = `${data.captions.instagramReels.caption}\n\n${data.captions.instagramReels.hashtags.join(" ")}`;
    } else if (activeTab === "tiktok") {
      textToCopy = `${data.captions.tiktok.caption}\nSound: ${data.captions.tiktok.soundIdea}\n${data.captions.tiktok.hashtags.join(" ")}`;
    } else if (activeTab === "linkedin") {
      textToCopy = `${data.captions.linkedin.hook}\n\n${data.captions.linkedin.postBody}\n\n${data.captions.linkedin.callToDiscussion}`;
    } else if (activeTab === "x") {
      textToCopy = data.captions.x.thread.join("\n\n---\n\n");
    }

    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopiedPlatform(true);
      setTimeout(() => setCopiedPlatform(false), 1800);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header with Sample Video Simulator Trigger */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-card via-card to-amber-500/10 p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider">
            <Share2 className="h-4 w-4" />
            <span>Stage 7: Multi-Platform Packaging & Publishing Matrix 🚀</span>
          </div>

          {/* Sample Video Simulator Button */}
          <button
            onClick={() => {
              if (onOpenVideoGenerator) {
                onOpenVideoGenerator();
              } else {
                setIsSimulatorOpen(true);
                setSimulatorPlaying(true);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-500 to-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:scale-105 transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Launch AI Casual Video Generator (Grok-Style) 🎥</span>
          </button>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Distribution Assets, Titles & Platform Copy 🔥
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Optimized copy engineered specifically for each platform's algorithm and viewer psychology.
          </p>
        </div>
      </div>

      {/* Tamil Influencer Viral Tanglish Titles Card */}
      {isTamil && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
              <h3 className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-2">
                <span>🔥 Tamil Influencer Tanglish Viral Titles & Hooks</span>
              </h3>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/30">
              Irfan & Madan Gowri Style
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Specially tailored Tanglish titles engineered for Tamil Instagram Reels, YouTube Shorts, and high CTR click-through rates:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              {
                title: "🔥 ₹150-ku Mutton Biryani-a?! 🤯 Semma Worth Spot Found in Chennai!",
                badge: "9.9/10 Viral CTR",
                vibe: "Price Shock Hook"
              },
              {
                title: "Idha Saapta Apram Vera Edhum Pidikaathu! 🤤 Authentic Secret Spot Review",
                badge: "9.8/10 Curiosity",
                vibe: "Taste Hyperbole"
              },
              {
                title: "Worst or Best-u?! 💥 Honest Review of Chennai's Most Hyped Biryani",
                badge: "9.7/10 High Trust",
                vibe: "Unbiased Audit"
              },
              {
                title: "Makkale! Indha Spot-ah Miss Pannave Pannadheenga! 🍗 Midnight Food Hunt #reels",
                badge: "9.8/10 Shareability",
                vibe: "FOMO Urgent"
              },
              {
                title: "Building Strong-u Basement-um Strong-u! ⭐️ 5/5 Foodie Verdict",
                badge: "9.6/10 Comedy Meme",
                vibe: "Vadivelu Punch"
              },
              {
                title: "Night 2 AM-la Biryani Hunting! 🌙 Vera Level Experience #shorts",
                badge: "9.7/10 Trend",
                vibe: "Midnight Vibe"
              }
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleCopyTitle(item.title, 900 + idx)}
                className="group p-3 rounded-xl border border-amber-500/20 bg-background/80 hover:border-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md">
                    {item.vibe}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-foreground group-hover:text-amber-300 transition-colors">
                  {item.title}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px] text-muted-foreground">
                  <span>Click to copy</span>
                  {copiedTitleIndex === 900 + idx ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="h-3 w-3" /> Copied!
                    </span>
                  ) : (
                    <Copy className="h-3 w-3 group-hover:text-amber-400 transition-colors" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Tamil Creator Tag Chips */}
          <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-zinc-400 mr-1">Trending Creator Tags:</span>
            {[
              "#tamilfoodie",
              "#chennaifoodie",
              "#tanglishreels",
              "#irfansview",
              "#peppafoodie",
              "#madangowri",
              "#chennaistreetfood",
              "#tamilvlogger"
            ].map((tag) => (
              <button
                key={tag}
                onClick={async (e) => {
                  e.stopPropagation();
                  await copyToClipboard(tag);
                }}
                className="rounded-lg bg-zinc-800/80 hover:bg-amber-500/20 hover:text-amber-300 border border-zinc-700/60 px-2 py-0.5 text-[10px] font-mono text-zinc-300 transition-colors"
                title="Click to copy hashtag"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5 Title Variations */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>5 High-Converting Title Options (Curiosity + Value) ✨</span>
          </h3>
          <span className="text-xs text-muted-foreground">Click to copy</span>
        </div>

        <div className="space-y-2.5">
          {data.titleOptions.map((title, i) => {
            const isCopied = copiedTitleIndex === i;
            return (
              <div
                key={i}
                onClick={() => handleCopyTitle(title, i)}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3.5 hover:border-primary/50 hover:bg-secondary/70 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                    {title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {title.length} chars
                  </span>
                  <button
                    className="p-1 text-muted-foreground group-hover:text-primary transition-colors"
                    aria-label="Copy title"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 Thumbnail Concepts */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          <span>High-Contrast Thumbnail Concepts 🖼️</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.thumbnailIdeas.map((thumb, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-secondary/30 p-4 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="font-bold">Concept #{idx + 1}</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider">Thumbnail Text</span>
                </div>
                {/* Visual Preview Box */}
                <div className="rounded-lg bg-zinc-950 p-4 border border-zinc-800 text-center mb-3 shadow-inner">
                  <span className="text-base sm:text-lg font-black tracking-wider text-amber-300 uppercase drop-shadow-md">
                    {thumb.mainText}
                  </span>
                </div>
                <div className="text-xs text-foreground/90 leading-snug">
                  <strong>Visual Concept: </strong>
                  {thumb.visualConcept}
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                <strong>Color Contrast: </strong>
                {thumb.colorContrast}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Platform Captions Tabs */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <span>Tailored Platform Captions 📱</span>
          </h3>

          <button
            onClick={handleCopyCurrentPlatform}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors self-start sm:self-auto"
          >
            {copiedPlatform ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-500">Platform Copy Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="capitalize">Copy {activeTab} Post</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab("reels")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "reels"
                ? "bg-pink-500/10 text-pink-500 border border-pink-500/30 ring-1 ring-pink-500/30"
                : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Instagram className="h-4 w-4 text-pink-500" />
            <span>Instagram Reels</span>
          </button>

          <button
            onClick={() => setActiveTab("youtube")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "youtube"
                ? "bg-red-500/10 text-red-500 border border-red-500/30 ring-1 ring-red-500/30"
                : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Youtube className="h-4 w-4 text-red-500" />
            <span>YouTube</span>
          </button>

          <button
            onClick={() => setActiveTab("tiktok")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "tiktok"
                ? "bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 ring-1 ring-cyan-500/30"
                : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Smartphone className="h-4 w-4 text-cyan-500" />
            <span>TikTok</span>
          </button>

          <button
            onClick={() => setActiveTab("linkedin")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "linkedin"
                ? "bg-blue-500/10 text-blue-500 border border-blue-500/30 ring-1 ring-blue-500/30"
                : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Linkedin className="h-4 w-4 text-blue-500" />
            <span>LinkedIn</span>
          </button>

          <button
            onClick={() => setActiveTab("x")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "x"
                ? "bg-slate-500/10 text-slate-300 border border-slate-500/30 ring-1 ring-slate-500/30"
                : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Twitter className="h-4 w-4 text-foreground" />
            <span>X (Twitter) Thread</span>
          </button>
        </div>

        {/* Tab Content Box */}
        <div className="rounded-xl border border-border bg-background/60 p-4 sm:p-5">
          {activeTab === "reels" && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">Instagram Caption</span>
                <pre className="whitespace-pre-wrap text-xs sm:text-sm text-foreground/90 font-sans mt-1 p-3 rounded-lg bg-card border border-border">
                  {data.captions.instagramReels.caption}
                </pre>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.captions.instagramReels.hashtags.map((h, idx) => (
                  <span key={idx} className="text-xs text-pink-500 font-medium">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeTab === "youtube" && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">Selected YouTube Title</span>
                <p className="text-base font-bold text-foreground mt-0.5">{data.captions.youtube.title}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">Video Description</span>
                <pre className="whitespace-pre-wrap text-xs sm:text-sm text-foreground/90 font-sans mt-1 p-3 rounded-lg bg-card border border-border">
                  {data.captions.youtube.description}
                </pre>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">Video Tags</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {data.captions.youtube.tags.map((t, idx) => (
                    <span key={idx} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "tiktok" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2.5 text-xs text-cyan-600 dark:text-cyan-300">
                <strong>Trending Sound Recommendation: </strong>
                {data.captions.tiktok.soundIdea}
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">TikTok Caption</span>
                <pre className="whitespace-pre-wrap text-xs sm:text-sm text-foreground/90 font-sans mt-1 p-3 rounded-lg bg-card border border-border">
                  {data.captions.tiktok.caption}
                </pre>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.captions.tiktok.hashtags.map((h, idx) => (
                  <span key={idx} className="text-xs text-cyan-400 font-medium">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeTab === "linkedin" && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">LinkedIn Hook Line</span>
                <p className="text-sm font-bold text-foreground mt-0.5">{data.captions.linkedin.hook}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">Post Body</span>
                <pre className="whitespace-pre-wrap text-xs sm:text-sm text-foreground/90 font-sans mt-1 p-3 rounded-lg bg-card border border-border">
                  {data.captions.linkedin.postBody}
                </pre>
              </div>
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-xs text-blue-600 dark:text-blue-300">
                <strong>Call to Discussion: </strong>
                {data.captions.linkedin.callToDiscussion}
              </div>
            </div>
          )}

          {activeTab === "x" && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-muted-foreground uppercase">
                {data.captions.x.thread.length} Tweets Thread
              </div>
              {data.captions.x.thread.map((tweet, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-3 text-xs sm:text-sm text-foreground/90">
                  {tweet}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reference YouTube & Inspiration Videos (Requested by User) */}
      {data.referenceVideos && data.referenceVideos.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <Tv className="h-4 w-4 text-red-500" />
              <span>Recommended Reference Videos for Style & Retention Inspiration 📺</span>
            </h3>
            <span className="text-xs text-muted-foreground">High Performing Creators</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.referenceVideos.map((video) => (
              <a
                key={video.id}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border bg-secondary/20 overflow-hidden hover:border-red-500/50 hover:bg-secondary/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
                    <span className="absolute top-2 left-2 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
                      <Play className="h-2.5 w-2.5 fill-current" /> YouTube
                    </span>
                    <span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-mono text-white">
                      {video.views}
                    </span>
                  </div>

                  <div className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-primary">{video.channel}</span>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{video.tag}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-red-500 transition-colors line-clamp-2">
                      {video.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 pt-1">
                      <strong>Why It Works:</strong> {video.whyItWorks}
                    </p>
                  </div>
                </div>

                <div className="p-3 pt-0 flex items-center justify-end text-[11px] font-bold text-red-500 gap-1">
                  <span>Watch on YouTube</span>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* SEO Description & Tags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SEO Description Box */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Full SEO Description & Chapters</span>
            </h3>
            <button
              onClick={handleCopyDesc}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy Description"
            >
              {copiedDesc ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono bg-secondary/40 p-3 rounded-xl border border-border/40 max-h-56 overflow-y-auto">
            {data.seoDescription}
          </pre>
        </div>

        {/* Tags & Hashtags Cloud */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-2">
              <Hash className="h-4 w-4 text-primary" />
              <span>Viral Hashtags</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {data.hashtags.map((h, idx) => (
                <span key={idx} className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary font-medium">
                  {h}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border/60">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-2">
              <Tag className="h-4 w-4 text-primary" />
              <span>Backend Search Keywords & Tags</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {data.tags.map((t, idx) => (
                <span key={idx} className="rounded-md bg-secondary border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SAMPLE VIDEO SIMULATOR MODAL (Requested by User) */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-sm rounded-3xl overflow-hidden border border-zinc-700 bg-zinc-950 shadow-2xl flex flex-col aspect-[9/16] max-h-[88dvh]">
            {/* Top Video Header */}
            <div className="absolute top-0 inset-x-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="font-bold text-xs uppercase tracking-wider">Preview Simulator</span>
              </div>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="h-8 w-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Simulated Video Feed Background with smooth crossfade */}
            <div className="relative flex-1 w-full bg-zinc-900 overflow-hidden">
              <img
                src={currentScene.bg}
                alt="Scene Background"
                className="w-full h-full object-cover opacity-70 scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

              {/* Dynamic Animated Subtitle Callout */}
              <div className="absolute inset-x-4 bottom-24 z-10 text-center">
                <div className="inline-block rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 px-4 py-3 shadow-2xl">
                  <p className="text-sm sm:text-base font-extrabold text-amber-300 tracking-wide drop-shadow-md animate-fade-in leading-snug">
                    {currentScene.text}
                  </p>
                </div>
              </div>

              {/* Overlay Badges */}
              <div className="absolute left-4 top-16 z-10 space-y-1">
                <span className="rounded-md bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Scene {currentSceneIndex + 1} of 4
                </span>
                <div className="text-[11px] text-white/80 font-mono">
                  0:{simulatorSecond < 10 ? `0${simulatorSecond}` : simulatorSecond} / 0:20
                </div>
              </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 z-20 flex items-center justify-between gap-3 text-white">
              <button
                onClick={() => setSimulatorPlaying((prev) => !prev)}
                className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white hover:scale-105 transition-transform"
              >
                {simulatorPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
              </button>

              <div className="flex-1 space-y-1">
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(simulatorSecond / 20) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Live Production Simulator</span>
                  <span>1080x1920 (9:16)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
