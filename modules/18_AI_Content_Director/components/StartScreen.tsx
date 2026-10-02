"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Instagram,
  Youtube,
  Smartphone,
  Linkedin,
  Mic,
  Clock,
  Users,
  Palette,
  Globe,
  ArrowRight,
  Flame,
  CheckCircle2,
  FolderSync
} from "lucide-react";
import { Platform, Tone } from "@/lib/types";
import { AnimeLaunchingHero } from "@/components/AnimeLaunchingHero";

interface StartScreenProps {
  onSubmit: (data: {
    topic: string;
    platform: Platform;
    targetDuration: string;
    targetAudience: string;
    tone: Tone;
    language: string;
  }) => void;
  onLoadSample: () => void;
}

const TOPIC_PRESETS = [
  "Turning an idea into a complete production plan requires several disconnected steps: Research a topic, identify angles, recommend a narrative, generate a script, suggest visuals/B-roll, create a shot list and publishing copy.",
  "How Solo Creators Can Build Studio-Quality Videos in Under 45 Minutes Using AI Pipelines",
  "The 10-Minute Daily Productivity System Used by High-Output CEOs",
  "Why 90% of Tech Startups Fail in Their First 18 Months (And How to Prevent It)",
  "How Spatial Computing and AR Will Completely Replace Smartphones by 2030"
];

const PLATFORMS: { id: Platform; label: string; icon: any; format: string }[] = [
  { id: "instagram", label: "Instagram (Reels / Feed)", icon: Instagram, format: "9:16 Vertical & 1:1 Feed" },
  { id: "youtube", label: "YouTube", icon: Youtube, format: "16:9 Long-form / Documentary" },
  { id: "shorts", label: "Shorts & TikTok", icon: Smartphone, format: "9:16 Short-form Video" },
  { id: "linkedin", label: "LinkedIn Video / Post", icon: Linkedin, format: "1:1 / Square Authority Post" },
  { id: "podcast", label: "Podcast / Audio", icon: Mic, format: "Audio Deep Dive & Visualizer" },
];

const DURATIONS = [
  { value: "60 Seconds (Short-Form)", label: "60s", note: "Snappy vertical hook & payoff" },
  { value: "3-5 Minutes (Punchy)", label: "3-5m", note: "High-retention tactical breakdown" },
  { value: "8-12 Minutes (Deep Dive)", label: "8-12m", note: "Full documentary narrative structure" },
  { value: "20+ Minutes (Masterclass)", label: "20m+", note: "Comprehensive masterclass guide" },
];

const TONES: { id: Tone; label: string; desc: string }[] = [
  { id: "casual", label: "Casual", desc: "Conversational, relatable, friend-to-friend" },
  { id: "professional", label: "Professional", desc: "Authoritative, analytical, high credibility" },
  { id: "cinematic", label: "Cinematic", desc: "Immersive, atmospheric, dramatic cadence" },
  { id: "funny", label: "Humorous", desc: "Satirical, entertaining, high comedic energy" },
  { id: "educational", label: "Educational", desc: "Structured, pedagogical, tactical clarity" },
];

const LANGUAGES = [
  "English",
  "Tamil (தமிழ்)",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Japanese"
];

export function StartScreen({ onSubmit, onLoadSample }: StartScreenProps) {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [targetDuration, setTargetDuration] = useState("60 Seconds (Short-Form)");
  const [targetAudience, setTargetAudience] = useState("Content Creators, Solo Founders & Filmmakers");
  const [tone, setTone] = useState<Tone>("cinematic");
  const [language, setLanguage] = useState("English");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Please describe your idea or topic to launch the pipeline.");
      return;
    }
    setError(null);
    onSubmit({
      topic: topic.trim(),
      platform,
      targetDuration,
      targetAudience: targetAudience.trim() || "General Audience",
      tone,
      language,
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      {/* 🎌 Anime Launching Page Hero with Rolling Cine Camera & Brand Badge */}
      <AnimeLaunchingHero
        onQuickLaunch={(preset) => {
          setTopic(preset.topic);
          setPlatform(preset.platform);
          setTargetDuration(preset.targetDuration);
          setTargetAudience(preset.targetAudience);
          setTone(preset.tone);
          setLanguage(preset.language);
          onSubmit(preset);
        }}
        onScrollToForm={() => {
          const formEl = document.getElementById("custom-intake-form");
          if (formEl) {
            formEl.scrollIntoView({ behavior: "smooth" });
          }
        }}
      />

      {/* Secondary Quick Demo Link */}
      <div className="text-center mb-6">
        <button
          type="button"
          onClick={onLoadSample}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 rounded-full px-4 py-1.5 transition-all focus:outline-none"
        >
          <FolderSync className="h-3.5 w-3.5" />
          <span>Or Inspect Finished Production Sample (Instant Demo)</span>
        </button>
      </div>

      {/* Main Intake Form Container */}
      <div id="custom-intake-form" className="scroll-mt-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-xl shadow-black/5 dark:shadow-none space-y-6 sm:space-y-8"
        >
        {/* 1. Topic / Idea Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="topic-input"
              className="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <Flame className="h-4 w-4 text-primary" />
              <span>1. What is your video idea or topic?</span>
            </label>
            <span className="text-xs text-muted-foreground">Required</span>
          </div>
          <textarea
            id="topic-input"
            rows={3}
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. How Solo Creators Can Build Studio-Quality Videos in Under 45 Minutes Using AI Pipelines..."
            className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none min-h-[96px]"
          />
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          {/* Quick Idea Presets */}
          <div className="pt-1">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Or test with a trending topic preset:</p>
            <div className="flex flex-wrap gap-1.5">
              {TOPIC_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopic(preset)}
                  className="rounded-lg border border-border/80 bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left"
                >
                  {preset.length > 55 ? `${preset.substring(0, 52)}...` : preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Platform Selector */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>2. Target Platform & Format</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PLATFORMS.map((item) => {
              const Icon = item.icon;
              const isSelected = platform === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPlatform(item.id)}
                  className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all min-h-[72px] focus:outline-none focus:ring-2 focus:ring-primary ${
                    isSelected
                      ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary"
                      : "border-border bg-card hover:bg-secondary/60 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <span className="font-semibold text-sm">{item.label}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">{item.format}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Duration & Target Audience Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Target Duration */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>3. Target Duration</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DURATIONS.map((d) => {
                const isSelected = targetDuration === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setTargetDuration(d.value)}
                    className={`p-2.5 rounded-lg border text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border bg-card text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <div className="text-xs font-bold">{d.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{d.note}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <label
              htmlFor="audience-input"
              className="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <Users className="h-4 w-4 text-primary" />
              <span>4. Target Audience</span>
            </label>
            <input
              id="audience-input"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Solo Creators, Tech Enthusiasts, Founders..."
              className="w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all h-[44px]"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["Beginners", "Senior Developers", "Entrepreneurs", "Gen Z Creators"].map((aud) => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => setTargetAudience(aud)}
                  className="rounded-md border border-border/80 bg-secondary/40 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {aud}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Tone & Language Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Tone Selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <span>5. Tone & Directing Style</span>
            </label>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              {TONES.map((t) => {
                const isSelected = tone === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/40"
                        : "border-border bg-card text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <div className="text-xs font-semibold">{t.label}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language Selector */}
          <div className="space-y-2">
            <label
              htmlFor="language-select"
              className="text-sm font-semibold text-foreground flex items-center gap-2"
            >
              <Globe className="h-4 w-4 text-primary" />
              <span>6. Production Language</span>
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all h-[44px]"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              All scripts, narrative beats, and captions will be tailored naturally to this language.
            </p>
          </div>
        </div>

        {/* Submit Primary CTA */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground text-center sm:text-left">
            ✨ Launches Stage 1 (Research) with auto-context passing through all 7 stages.
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm sm:text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all min-h-[48px]"
          >
            <span>Launch 7-Stage Pipeline</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  </div>
);
}
