"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Clock,
  Type,
  Mic,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  X,
  Maximize2,
  FlipHorizontal,
  Sliders
} from "lucide-react";
import { ScriptData, Tone } from "@/lib/types";
import { copyToClipboard } from "@/lib/utils";

interface ScriptStageProps {
  data: ScriptData;
  onUpdateTone?: (tone: Tone) => void;
}

const SECTION_BADGES: Record<string, { label: string; color: string }> = {
  hook: { label: "1. The Hook", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  intro: { label: "2. The Intro", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  body: { label: "3. Core Body", color: "bg-primary/10 text-primary border-primary/20" },
  cta: { label: "4. Call to Action", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
};

export function ScriptStage({ data, onUpdateTone }: ScriptStageProps) {
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Extra Feature 1: Teleprompter State
  const [isPrompterOpen, setIsPrompterOpen] = useState(false);
  const [isPrompterScrolling, setIsPrompterScrolling] = useState(false);
  const [prompterSpeed, setPrompterSpeed] = useState(2);
  const [prompterFontSize, setPrompterFontSize] = useState(36);
  const [isPrompterMirrored, setIsPrompterMirrored] = useState(false);
  const prompterContentRef = useRef<HTMLDivElement>(null);

  // Extra Feature 2: Audio Voiceover Audition State (Web Speech API)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleCopySection = async (text: string, id: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedSectionId(id);
      setTimeout(() => setCopiedSectionId(null), 1800);
    }
  };

  const handleCopyAllScript = async () => {
    const fullText = data.sections
      .map((s) => `[${s.sectionType.toUpperCase()}] - ${s.title}\n(${s.deliveryNotes})\n\n${s.spokenText}`)
      .join("\n\n---\n\n");
    const ok = await copyToClipboard(fullText);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  // Teleprompter Autoscroll Loop
  useEffect(() => {
    let animId: number;
    if (isPrompterOpen && isPrompterScrolling && prompterContentRef.current) {
      const scrollStep = () => {
        if (prompterContentRef.current) {
          prompterContentRef.current.scrollTop += prompterSpeed * 0.75;
        }
        animId = requestAnimationFrame(scrollStep);
      };
      animId = requestAnimationFrame(scrollStep);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPrompterOpen, isPrompterScrolling, prompterSpeed]);

  // Audio Player using SpeechSynthesis
  const toggleAudioPlayer = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      const fullSpeechText = data.sections.map((s) => s.spokenText).join(". ");
      const utterance = new SpeechSynthesisUtterance(fullSpeechText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Script Header Card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <FileText className="h-4 w-4" />
            <span>Stage 4: Spoken Production Script</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Audio Voiceover Audition Button */}
            <button
              onClick={toggleAudioPlayer}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                isPlayingAudio
                  ? "border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500"
                  : "border-border bg-secondary/60 text-foreground hover:bg-secondary"
              }`}
              title="Audition voiceover pacing with browser Speech Synthesis"
            >
              {isPlayingAudio ? (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-primary" />
                  <span>Listen to Script</span>
                </>
              )}
            </button>

            {/* Launch Teleprompter Mode Button */}
            <button
              onClick={() => {
                setIsPrompterOpen(true);
                setIsPrompterScrolling(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Studio Teleprompter</span>
            </button>

            {/* Copy Entire Script */}
            <button
              onClick={handleCopyAllScript}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              {copiedAll ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Copy All</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Teleprompter & Voiceover Script
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Word-for-word spoken dialogue formatted for maximum retention and rhythmic cadence.
          </p>
        </div>

        {/* Word count & Spoken Runtime Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-xl border border-border bg-background/50 p-3">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Type className="h-3.5 w-3.5 text-primary" /> Spoken Word Count
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              {data.totalWordCount} words
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/50 p-3">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-primary" /> Est. Spoken Runtime
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              {data.estimatedDurationFormatted}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl border border-border bg-background/50 p-3">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Mic className="h-3.5 w-3.5 text-primary" /> Voice Delivery Cadence
            </div>
            <div className="text-sm font-bold text-foreground capitalize mt-1.5">
              {data.tone} (~145 wpm)
            </div>
          </div>
        </div>
      </div>

      {/* Script Sections List */}
      <div className="space-y-5">
        {data.sections.map((section, idx) => {
          const badge = SECTION_BADGES[section.sectionType] || SECTION_BADGES.body;

          return (
            <div
              key={section.id || idx}
              className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-3"
            >
              {/* Section Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                  <h3 className="text-base font-bold text-foreground">
                    {section.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> ~{section.durationSec}s
                  </span>
                  <button
                    onClick={() => handleCopySection(section.spokenText, section.id)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy section text"
                  >
                    {copiedSectionId === section.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Delivery Notes for Creator */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <Volume2 className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Director Cue: </span>
                  <span>{section.deliveryNotes}</span>
                </div>
              </div>

              {/* Spoken Dialogue Text */}
              <div className="rounded-xl bg-background/80 p-4 border border-border/60 text-sm sm:text-base leading-relaxed text-foreground font-sans">
                {section.spokenText}
              </div>
            </div>
          );
        })}
      </div>

      {/* FULLSCREEN STUDIO TELEPROMPTER MODAL */}
      {isPrompterOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col text-white">
          {/* Top Control Bar */}
          <div className="h-16 bg-zinc-900 border-b border-zinc-800 px-4 sm:px-8 flex items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsPrompterScrolling((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  isPrompterScrolling
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "bg-primary text-white hover:bg-primary-hover"
                }`}
              >
                {isPrompterScrolling ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                <span>{isPrompterScrolling ? "Pause" : "Scroll"}</span>
              </button>

              <button
                onClick={() => {
                  if (prompterContentRef.current) prompterContentRef.current.scrollTop = 0;
                  setIsPrompterScrolling(false);
                }}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                title="Rewind to Top"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              {/* Speed Controller */}
              <div className="hidden sm:flex items-center gap-2 bg-zinc-800/80 px-3 py-1.5 rounded-lg text-xs">
                <span className="text-zinc-400 font-medium">Speed:</span>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.5"
                  value={prompterSpeed}
                  onChange={(e) => setPrompterSpeed(parseFloat(e.target.value))}
                  className="w-20 accent-primary cursor-pointer"
                />
                <span className="font-mono w-6 text-center">{prompterSpeed}x</span>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center gap-1 bg-zinc-800/80 px-2 py-1 rounded-lg text-xs">
                <button
                  onClick={() => setPrompterFontSize((prev) => Math.max(22, prev - 4))}
                  className="px-2 py-0.5 rounded hover:bg-zinc-700 font-bold"
                >
                  A-
                </button>
                <span className="font-mono text-zinc-400 text-[11px]">{prompterFontSize}px</span>
                <button
                  onClick={() => setPrompterFontSize((prev) => Math.min(64, prev + 4))}
                  className="px-2 py-0.5 rounded hover:bg-zinc-700 font-bold"
                >
                  A+
                </button>
              </div>

              {/* Flip/Mirror Toggle */}
              <button
                onClick={() => setIsPrompterMirrored((prev) => !prev)}
                className={`p-2 rounded-lg transition-colors ${
                  isPrompterMirrored ? "bg-primary text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                }`}
                title="Mirror Horizontal (for Glass Teleprompters)"
              >
                <FlipHorizontal className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setIsPrompterOpen(false);
                setIsPrompterScrolling(false);
              }}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              title="Close Teleprompter"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Reading Viewport */}
          <div
            ref={prompterContentRef}
            className={`flex-1 overflow-y-auto px-6 sm:px-24 py-20 max-w-5xl mx-auto w-full transition-transform ${
              isPrompterMirrored ? "scale-x-[-1]" : ""
            }`}
            style={{ fontSize: `${prompterFontSize}px`, lineHeight: 1.6 }}
          >
            {/* Guide line indicator in center */}
            <div className="fixed left-0 right-0 top-1/2 h-0.5 border-t border-dashed border-primary/30 pointer-events-none" />

            <div className="space-y-16 pb-96">
              {data.sections.map((section, idx) => (
                <div key={section.id || idx} className="space-y-4">
                  <div className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <span>{section.sectionType.toUpperCase()} &bull; {section.title}</span>
                  </div>
                  <p className="font-medium text-zinc-100 tracking-wide select-none">
                    {section.spokenText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
