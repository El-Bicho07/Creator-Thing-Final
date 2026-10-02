"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Clapperboard,
  Flame,
  Camera,
  Play,
  Volume2,
  VolumeX,
  ArrowRight,
  Tv,
  Film,
  Zap,
  UtensilsCrossed,
  ChefHat
} from "lucide-react";
import { Platform, Tone } from "@/lib/types";

interface AnimeLaunchingHeroProps {
  onQuickLaunch: (preset: {
    topic: string;
    platform: Platform;
    targetDuration: string;
    targetAudience: string;
    tone: Tone;
    language: string;
  }) => void;
  onScrollToForm: () => void;
}

export function AnimeLaunchingHero({ onQuickLaunch, onScrollToForm }: AnimeLaunchingHeroProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Play anime director "Action! Roll Camera!" voiceover using Web Speech API
  const handleDirectorVoice = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Action! Rolling camera! CineSensei is ready to direct your viral content!");
    utterance.rate = 1.1;
    utterance.pitch = 1.15;
    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto mb-8 sm:mb-12 overflow-hidden rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-5 sm:p-8 md:p-10 shadow-2xl shadow-amber-500/10">
      {/* Anime Speedlines & Warm Golden Embers Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />
      
      {/* Cooking / Saffron Ambient Glow Orbs */}
      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-orange-600/20 blur-3xl pointer-events-none" />

      {/* Top Banner: Brand Name & Anime Edition Badge */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="h-full w-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-amber-400">
              <Clapperboard className="h-6 w-6 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
                CINE<span className="text-amber-400">SENSEI</span>
              </span>
              <span className="rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
                🎌 Anime Director
              </span>
            </div>
            <p className="text-xs text-amber-200/80 font-medium">
              The Anime-Powered Content Director for Foodies, Creators & Viral Storytellers
            </p>
          </div>
        </div>

        {/* Anime Director Voice Button */}
        <button
          onClick={handleDirectorVoice}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 transition-all active:scale-95"
          title="Play Anime Director Voice Call"
        >
          <Volume2 className={`h-4 w-4 ${isPlayingAudio ? "text-amber-400 animate-bounce" : ""}`} />
          <span>Director Voice: &ldquo;Action! 🎬&rdquo;</span>
        </button>
      </div>

      {/* Main Hero Grid: Left Content Direction Pitch & Right Rolling Anime Camera */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center pt-6 sm:pt-8">
        {/* Left Column: Mission Pitch & CTA */}
        <div className="lg:col-span-7 space-y-4 text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400">
            <Flame className="h-3.5 w-3.5 fill-current text-orange-500 animate-bounce" />
            <span>Sizzling Food Reviews • Cinematic Reels • Tanglish Slang</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Roll Camera On Your{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
              Next Viral Masterpiece
            </span>
          </h2>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            Stop juggling disconnected apps. <strong className="text-amber-300">CineSensei</strong> commands your entire production pipeline like an anime director: from authentic on-the-ground food review scripts to 4K B-roll visuals, shot lists, and viral Tanglish titles!
          </p>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <UtensilsCrossed className="h-3.5 w-3.5 text-amber-400" />
              <span>Cooking & Food Focus</span>
            </span>
            <span className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Film className="h-3.5 w-3.5 text-orange-400" />
              <span>7-Stage Pipeline</span>
            </span>
            <span className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              <span>Grok AI Video Simulator</span>
            </span>
          </div>

          {/* Primary Action Button */}
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={onScrollToForm}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-orange-500/25 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>ACTION! ROLL CAMERA & DIRECT NOW</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Animated Anime Cine Camera Rolling Simulation */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="relative w-full max-w-[340px] rounded-2xl border-2 border-amber-500/30 bg-zinc-950 p-4 shadow-2xl shadow-amber-500/10 text-left overflow-hidden">
            {/* Viewfinder HUD Overlays */}
            <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 font-bold border-b border-zinc-800/80 pb-2 mb-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
                <span className="text-red-500 uppercase tracking-widest font-black">[● REC 00:04:18]</span>
              </span>
              <span className="text-zinc-400">4K UHD &bull; 60 FPS</span>
            </div>

            {/* Rolling Camera Illustration with Rotating Reels */}
            <div className="relative h-44 w-full rounded-xl bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 flex flex-col items-center justify-center overflow-hidden">
              {/* Twin Rotating Film Reels (Anime Cine Camera Style) */}
              <div className="absolute top-2 flex items-center justify-center gap-8 w-full z-10">
                {/* Left Film Reel Gear */}
                <div className="relative h-12 w-12 rounded-full border-2 border-amber-400 bg-zinc-900 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="absolute h-full w-0.5 bg-amber-400/60" />
                  <div className="absolute w-full h-0.5 bg-amber-400/60" />
                </div>

                {/* Film Strip Feeding Across */}
                <div className="h-1 flex-1 bg-amber-400/40 border-t border-b border-dashed border-amber-300" />

                {/* Right Film Reel Gear */}
                <div className="relative h-12 w-12 rounded-full border-2 border-orange-500 bg-zinc-900 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
                  <div className="h-3 w-3 rounded-full bg-orange-400" />
                  <div className="absolute h-full w-0.5 bg-orange-400/60" />
                  <div className="absolute w-full h-0.5 bg-orange-400/60" />
                </div>
              </div>

              {/* Center Glowing Camera Lens with Anamorphic Flare */}
              <div className="relative mt-8 h-20 w-20 rounded-full border-4 border-amber-500/80 bg-zinc-950 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-amber-500/30 via-cyan-500/20 to-orange-500/40 animate-pulse flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full bg-amber-400 shadow-inner" />
                </div>
                {/* Horizontal Anamorphic Lens Flare Line */}
                <div className="absolute w-44 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
              </div>

              {/* Bottom Camera Technical Specs */}
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[9px] font-mono text-zinc-400 z-10">
                <span>T2.0 &bull; 35mm</span>
                <span className="text-amber-400 font-bold">ISO 800</span>
                <span>WB 5600K</span>
              </div>
            </div>

            {/* Clapperboard Banner */}
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🎬</span>
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    SCENE: FOOD HUNT &bull; TAKE 1
                  </p>
                  <p className="text-[11px] font-extrabold text-white">
                    &ldquo;Makkale! Star Biryani Smell Vera Level!&rdquo;
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-amber-300 bg-black/60 px-1.5 py-0.5 rounded">
                ACTION!
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: 1-Click Viral Starter Kits (Food Review, Dosa ASMR, Study Hacks, Tech) */}
      <div className="relative z-10 mt-8 pt-6 border-t border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>1-Click Viral Starter Kits (Instant Content Direction)</span>
          </span>
          <span className="text-[10px] text-zinc-400">Click any card to pre-fill</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
          {/* Preset 1: Midnight Biryani Hunt */}
          <button
            onClick={() =>
              onQuickLaunch({
                topic: "Midnight Mutton Biryani Food Hunt at 40-Year Old Secret Spot in Chennai (Honest Taste Review)",
                platform: "instagram",
                targetDuration: "60 Seconds (Short-Form)",
                targetAudience: "Foodies, Night Owls & Chennai Street Food Enthusiasts",
                tone: "casual",
                language: "Tamil (தமிழ்)"
              })
            }
            className="group p-3 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-zinc-950 hover:border-amber-400 hover:scale-[1.02] transition-all text-left space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🍗</span>
              <span className="rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5">
                Tanglish Viral
              </span>
            </div>
            <h4 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
              Midnight Biryani Hunt
            </h4>
            <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
              Sizzling firewood dum, tender mutton shreds, and Vadivelu comedy reactions!
            </p>
          </button>

          {/* Preset 2: Crispy Ghee Roast Dosa */}
          <button
            onClick={() =>
              onQuickLaunch({
                topic: "Hidden 50-Year Old Crispy Ghee Roast Dosa Stall with 4 Secret Chutneys (Food Review)",
                platform: "instagram",
                targetDuration: "60 Seconds (Short-Form)",
                targetAudience: "Breakfast Foodies, South Indian Cuisine Lovers",
                tone: "casual",
                language: "Tamil (தமிழ்)"
              })
            }
            className="group p-3 rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-500/10 to-zinc-950 hover:border-orange-400 hover:scale-[1.02] transition-all text-left space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🥞</span>
              <span className="rounded bg-orange-500/20 text-orange-300 text-[9px] font-bold px-1.5 py-0.5">
                ASMR Sizzle
              </span>
            </div>
            <h4 className="text-xs font-black text-white group-hover:text-orange-300 transition-colors">
              Crispy Dosa Crunch
            </h4>
            <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
              Audible crunch, piping hot sambar dip, and authentic street vlogger energy!
            </p>
          </button>

          {/* Preset 3: Anime Study Master */}
          <button
            onClick={() =>
              onQuickLaunch({
                topic: "How to Memorize Any Complex Syllabus 10X Faster with Active Recall & Feynman Hack",
                platform: "instagram",
                targetDuration: "60 Seconds (Short-Form)",
                targetAudience: "Students, Exam Aspirants & Young Professionals",
                tone: "educational",
                language: "Tamil (தமிழ்)"
              })
            }
            className="group p-3 rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-zinc-950 hover:border-blue-400 hover:scale-[1.02] transition-all text-left space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">📚</span>
              <span className="rounded bg-blue-500/20 text-blue-300 text-[9px] font-bold px-1.5 py-0.5">
                Exam Hacks
              </span>
            </div>
            <h4 className="text-xs font-black text-white group-hover:text-blue-300 transition-colors">
              Active Recall Master
            </h4>
            <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
              Aani pudunga venam method: Destroy the forgetting curve in 25-minute Pomodoro!
            </p>
          </button>

          {/* Preset 4: ₹20,000 Tech Shootout */}
          <button
            onClick={() =>
              onQuickLaunch({
                topic: "Best Flagship Killer Smartphone Under ₹20,000 (Camera & BGMI Gaming Test)",
                platform: "youtube",
                targetDuration: "3-5 Minutes (Punchy)",
                targetAudience: "Tech Enthusiasts, Gamers & Value Buyers",
                tone: "casual",
                language: "Tamil (தமிழ்)"
              })
            }
            className="group p-3 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 to-zinc-950 hover:border-cyan-400 hover:scale-[1.02] transition-all text-left space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">📱</span>
              <span className="rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold px-1.5 py-0.5">
                Tech Shootout
              </span>
            </div>
            <h4 className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors">
              Flagship Killer Phone
            </h4>
            <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
              120Hz display, Antutu benchmarks, and low-light camera shootout!
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
