"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Clapperboard,
  Camera,
  Play,
  Volume2,
  VolumeX,
  FastForward,
  Film,
  Zap,
  Sliders
} from "lucide-react";

interface IntroLaunchScreenProps {
  onComplete: () => void;
  durationSeconds?: number;
}

export function IntroLaunchScreen({
  onComplete,
  durationSeconds = 6.5,
}: IntroLaunchScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Synthesize gaming sci-fi SFX (Sub bass drop + camera shutter + whoosh)
  const playGamingSFX = (type: "whoosh" | "shutter" | "powerup") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      if (type === "powerup") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(60, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      } else if (type === "shutter") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Play powerup SFX on mount
  useEffect(() => {
    playGamingSFX("powerup");
  }, []);

  // Timer loop for 5-8 seconds duration
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const currentElapsed = (Date.now() - startTime) / 1000;
      setElapsed(currentElapsed);

      if (currentElapsed >= durationSeconds - 0.7 && !isExiting) {
        setIsExiting(true);
        playGamingSFX("shutter");
      }

      if (currentElapsed >= durationSeconds) {
        clearInterval(interval);
        onComplete();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [durationSeconds, isExiting, onComplete]);

  // Keyboard shortcut: Space or Enter or Escape to skip intro
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSkip = () => {
    setIsExiting(true);
    playGamingSFX("shutter");
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  const progressPercent = Math.min(100, Math.round((elapsed / durationSeconds) * 100));
  const formatTimecode = (sec: number) => {
    const s = Math.floor(sec);
    const ms = Math.floor((sec % 1) * 60);
    return `00:00:0${s}:${ms < 10 ? "0" : ""}${ms}`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between bg-black text-white select-none overflow-hidden transition-all duration-700 ${
        isExiting
          ? "opacity-0 scale-110 filter blur-sm pointer-events-none"
          : "opacity-100 scale-100"
      }`}
    >
      {/* 1. Cyberpunk CRT Scanline & Anamorphic Speedlines Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.6)_50%)] bg-[length:100%_4px]" />
      
      {/* Moving Scanline Ray */}
      <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-amber-500/10 to-transparent pointer-events-none animate-scanline z-10" />

      {/* Anime Center Radial Speedlines */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-25 bg-[radial-gradient(#f59e0b_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

      {/* Sizzling Ambient Warm Cooking & Gaming Neon Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-r from-amber-500/20 via-orange-600/20 to-red-600/15 blur-[120px] pointer-events-none animate-pulse" />

      {/* 2. Top Cinematic Letterbox Bar: Pro Camera & Video Editor Telemetry */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        {/* Left: REC Indicator & Timecode */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-600 animate-ping" />
            <span className="text-xs font-mono font-black uppercase tracking-widest text-red-500">
              REC
            </span>
          </div>
          <span className="font-mono text-xs sm:text-sm text-amber-400 font-bold tracking-wider">
            {formatTimecode(elapsed)}
          </span>
          <span className="hidden md:inline-block text-[11px] font-mono text-zinc-500">
            PRORES 422 HQ &bull; 4K DCI &bull; 60 FPS
          </span>
        </div>

        {/* Center: System Status */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>NEURAL CONTENT PIPELINE // ENGINE ACTIVE</span>
        </div>

        {/* Right: Sound Toggle + Skip Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title={soundEnabled ? "SFX Enabled" : "SFX Muted"}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-amber-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-zinc-600" />
            )}
          </button>

          <button
            onClick={handleSkip}
            className="group flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-1.5 text-xs font-mono font-bold text-amber-300 hover:text-white transition-all shadow-sm active:scale-95"
          >
            <span>SKIP INTRO</span>
            <FastForward className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {/* 3. Center Hero: High-Energy Gaming & Video Editor Brand Reveal */}
      <main className="relative z-20 flex flex-col items-center justify-center px-4 text-center my-auto">
        {/* Outer Circular High-Tech Radar Ring */}
        <div className="relative mb-6 sm:mb-8 flex items-center justify-center">
          {/* Sweeping Radar Scanner Line */}
          <div className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-amber-500/20 pointer-events-none animate-radar">
            <div className="w-1/2 h-1/2 bg-gradient-to-tr from-transparent via-amber-500/10 to-transparent rounded-tl-full" />
          </div>

          {/* Outer Dashed Precision Ring */}
          <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border-2 border-dashed border-orange-500/30 animate-spin" style={{ animationDuration: "20s" }} />

          {/* Golden Flare Beam Behind Logo */}
          <div className="absolute w-72 sm:w-96 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-flare-sweep pointer-events-none" />

          {/* Main 3D Anime Cine-Camera Emblem */}
          <div className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 p-1 shadow-2xl shadow-amber-500/40 transform hover:scale-105 transition-transform">
            <div className="h-full w-full bg-zinc-950 rounded-[22px] flex flex-col items-center justify-center p-3 relative overflow-hidden border border-zinc-800">
              
              {/* Twin Spinning Film Reels (Mechanical Anime Gear Style) */}
              <div className="flex items-center justify-center gap-3 w-full mb-1">
                {/* Reel Left */}
                <div className="h-7 w-7 rounded-full border-2 border-amber-400 bg-zinc-900 flex items-center justify-center animate-spin-reel-fast shadow-md shadow-amber-400/50">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <div className="absolute h-full w-0.5 bg-amber-400/60" />
                  <div className="absolute w-full h-0.5 bg-amber-400/60" />
                </div>

                {/* Film Feeding Cable */}
                <div className="h-0.5 flex-1 bg-amber-400 border-t border-dashed border-yellow-200" />

                {/* Reel Right */}
                <div className="h-7 w-7 rounded-full border-2 border-orange-500 bg-zinc-900 flex items-center justify-center animate-spin-reel-reverse shadow-md shadow-orange-500/50">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <div className="absolute h-full w-0.5 bg-orange-500/60" />
                  <div className="absolute w-full h-0.5 bg-orange-500/60" />
                </div>
              </div>

              {/* Glowing Center Cine Iris Lens */}
              <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-amber-400 bg-gradient-to-tr from-zinc-900 to-black flex items-center justify-center shadow-lg shadow-amber-500/50">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-cyan-500 animate-pulse flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-white shadow-sm" />
                </div>
                {/* Horizontal Anamorphic Iris Line */}
                <div className="absolute w-16 h-0.5 bg-cyan-300 opacity-80" />
              </div>

              {/* Clapperboard Take Marker */}
              <div className="mt-1 flex items-center gap-1 text-[8px] font-mono text-amber-300 font-bold uppercase tracking-wider">
                <Clapperboard className="h-2.5 w-2.5" />
                <span>TAKE 1 &bull; 4K</span>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Japanese Katakana Subtitle */}
        <div className="flex items-center gap-2 mb-2 animate-glitch">
          <span className="text-[11px] sm:text-xs font-mono tracking-[0.3em] uppercase text-amber-400/90 font-bold">
            シネセンセイ &bull; 映画監督
          </span>
          <span className="h-1 w-1 rounded-full bg-orange-500" />
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-400">
            CINEMATIC STUDIO ENGINE
          </span>
        </div>

        {/* Main Brand Title: C I N E S E N S E I */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight font-mono uppercase drop-shadow-2xl">
          <span className="text-white">CINE</span>
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
            SENSEI
          </span>
        </h1>

        {/* Tagline */}
        <p className="mt-3 sm:mt-4 text-sm sm:text-lg md:text-xl font-bold tracking-wide text-zinc-300 max-w-2xl px-4 uppercase font-sans">
          The Anime-Powered Content Director for{" "}
          <span className="text-amber-400 underline decoration-amber-500/50 underline-offset-4">
            Viral Storytellers & Foodies
          </span>
        </p>

        {/* Sub-tagline Badges */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-mono text-zinc-400">
          <span className="rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1 flex items-center gap-1.5 text-zinc-300">
            <Zap className="h-3 w-3 text-amber-400" />
            <span>7-STAGE GUIDED PIPELINE</span>
          </span>
          <span className="rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1 flex items-center gap-1.5 text-zinc-300">
            <Film className="h-3 w-3 text-orange-400" />
            <span>4K B-ROLL & SHOT LISTS</span>
          </span>
          <span className="rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1 flex items-center gap-1.5 text-zinc-300">
            <Sparkles className="h-3 w-3 text-yellow-400" />
            <span>TANGLISH REELS & CASUAL VIDEO SIM</span>
          </span>
        </div>
      </main>

      {/* 4. Bottom Video Editor Timeline & Loading Meter */}
      <footer className="relative z-20 w-full px-6 py-5 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto space-y-3">
          
          {/* Soundwave Equalizer Bars + Video Timeline Scrubber */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Audio Spectrum Visualizer */}
            <div className="flex items-end gap-1 h-6">
              {[14, 22, 10, 26, 18, 28, 12, 24, 16, 20, 10, 26].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-amber-500 to-orange-400 rounded-full animate-pulse"
                  style={{
                    height: `${Math.max(6, (h * (progressPercent % 10 + 2)) / 8)}px`,
                    animationDelay: `${i * 0.08}s`
                  }}
                />
              ))}
              <span className="text-[10px] font-mono text-zinc-500 ml-1.5">AUDIO SYNTH: MASTERED</span>
            </div>

            {/* Right: Progress Status */}
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-400">
              <span className="animate-pulse">LOADING STUDIO ASSETS</span>
              <span>{progressPercent}%</span>
            </div>
          </div>

          {/* Video Editor Scrub Timeline Track */}
          <div className="relative w-full h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-75 relative"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Playhead Glow Tip */}
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white shadow-[0_0_8px_#ffffff]" />
            </div>
          </div>

          {/* Timeline Timecode Markers */}
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-600">
            <span>00:00:00:00 (RESEARCH)</span>
            <span>00:00:02:00 (NARRATIVE)</span>
            <span>00:00:04:00 (B-ROLL & SHOTS)</span>
            <span className="text-amber-500 font-bold">00:00:06:12 (READY)</span>
          </div>

          {/* Bottom Hint */}
          <p className="text-center text-[10px] font-mono text-zinc-500 pt-1">
            Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">Space</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">ESC</kbd> to launch immediately &bull; Entering Studio in {Math.max(0, Math.ceil(durationSeconds - elapsed))}s
          </p>
        </div>
      </footer>
    </div>
  );
}
