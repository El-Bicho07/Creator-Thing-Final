"use client";

import React, { useMemo } from "react";
import { detectTopicTheme } from "@/lib/topic-theme";

interface FloatingThemeElementsProps {
  topic: string;
}

export function FloatingThemeElements({ topic }: FloatingThemeElementsProps) {
  const theme = useMemo(() => detectTopicTheme(topic), [topic]);

  // Positions for 16 floating particles across the viewport with BIGGER sizes as requested
  const particlePositions = useMemo(
    () => [
      { top: "5%", left: "3%", delay: "0s", duration: "8s", size: "text-4xl sm:text-6xl", rotate: "rotate-6", isFast: false },
      { top: "12%", right: "6%", delay: "1.2s", duration: "6.5s", size: "text-3xl sm:text-5xl", rotate: "-rotate-12", isFast: true },
      { top: "24%", left: "86%", delay: "2.4s", duration: "9s", size: "text-4xl sm:text-6xl", rotate: "rotate-12", isFast: false },
      { top: "30%", left: "4%", delay: "0.8s", duration: "7s", size: "text-3xl sm:text-5xl", rotate: "-rotate-6", isFast: true },
      { top: "42%", right: "3%", delay: "3.1s", duration: "8.5s", size: "text-4xl sm:text-6xl", rotate: "rotate-45", isFast: false },
      { top: "52%", left: "5%", delay: "1.7s", duration: "6.8s", size: "text-4xl sm:text-6xl", rotate: "-rotate-12", isFast: true },
      { top: "66%", right: "5%", delay: "2.9s", duration: "9.2s", size: "text-5xl sm:text-7xl", rotate: "rotate-12", isFast: false },
      { top: "76%", left: "4%", delay: "0.4s", duration: "7.5s", size: "text-3xl sm:text-5xl", rotate: "-rotate-45", isFast: true },
      { top: "84%", right: "4%", delay: "1.9s", duration: "8.2s", size: "text-4xl sm:text-6xl", rotate: "rotate-6", isFast: false },
      { top: "15%", left: "46%", delay: "2.1s", duration: "10s", size: "text-3xl sm:text-5xl", rotate: "rotate-12", isFast: false },
      { top: "38%", left: "52%", delay: "3.5s", duration: "11s", size: "text-3xl sm:text-5xl", rotate: "-rotate-12", isFast: false },
      { top: "68%", left: "48%", delay: "1.5s", duration: "9s", size: "text-3xl sm:text-5xl", rotate: "rotate-6", isFast: true },
      { top: "88%", left: "22%", delay: "2.7s", duration: "8.4s", size: "text-4xl sm:text-6xl", rotate: "-rotate-6", isFast: false },
      { top: "88%", right: "26%", delay: "0.9s", duration: "7.8s", size: "text-3xl sm:text-5xl", rotate: "rotate-12", isFast: true },
      { top: "48%", left: "18%", delay: "1.1s", duration: "9.5s", size: "text-4xl sm:text-6xl", rotate: "rotate-45", isFast: false },
      { top: "58%", right: "18%", delay: "2.3s", duration: "8.8s", size: "text-4xl sm:text-6xl", rotate: "-rotate-12", isFast: true }
    ],
    []
  );

  // High-appetite culinary + anime director emoji array for food or general themes
  const activeEmojis = useMemo(() => {
    if (theme.category === "food") {
      return ["🍔", "🍕", "🍜", "🍗", "🌶️", "🥘", "🌮", "🍳", "🍛", "🍰", "🥩", "🍱", "🎬", "🔥", "🍿", "🍩"];
    }
    if (theme.category === "education") {
      return ["📚", "💻", "✍️", "📝", "🎓", "📖", "💡", "🎒", "⏱️", "✏️", "🧠", "🎬", "📌", "📑", "🔬", "📐"];
    }
    return ["🎬", "📹", "🍔", "🍕", "🍜", "🍗", "🔥", "🍿", "🚀", "⚡", "🎥", "🌶️", "🍱", "🍣", "🤖", "💻"];
  }, [theme.category]);

  const glowOrbColor =
    theme.category === "food"
      ? "bg-amber-500/25 dark:bg-amber-500/20"
      : theme.glowColor;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* Warm Culinary Saffron & Tandoori Glow Orbs (No washed-out pink) */}
      <div
        className={`absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] opacity-40 dark:opacity-25 transition-all duration-1000 ${glowOrbColor}`}
      />
      <div
        className={`absolute bottom-5 right-1/4 w-[500px] h-[500px] rounded-full blur-[130px] opacity-35 dark:opacity-20 transition-all duration-1000 bg-orange-500/25 dark:bg-orange-500/15`}
      />

      {/* BIG Floating Theme Emojis at the back */}
      {particlePositions.map((p, idx) => {
        const emoji = activeEmojis[idx % activeEmojis.length];
        return (
          <div
            key={idx}
            className={`absolute ${p.size} ${p.rotate} opacity-35 sm:opacity-45 dark:opacity-30 hover:opacity-85 transition-opacity ${
              p.isFast ? "animate-float-fast" : "animate-float-slow"
            }`}
            style={{
              top: p.top,
              left: p.left,
              right: p.right,
              animationDelay: p.delay,
              animationDuration: p.duration
            }}
          >
            <span className="drop-shadow-lg filter blur-[0.2px] hover:blur-none transition-all transform hover:scale-125 inline-block">
              {emoji}
            </span>
          </div>
        );
      })}
    </div>
  );
}
