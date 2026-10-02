"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, Sparkles, Globe, ExternalLink, Compass, Flame, Newspaper } from 'lucide-react';

const SUGGESTED_TOPICS = [
  "What is ML",
  "How does photosynthesis work",
  "Why do people procrastinate",
  "What is quantum computing",
  "CRISPR gene editing",
  "Index fund investing for beginners"
];

export default function LandingPage() {
  const [topicInput, setTopicInput] = useState("What is ML");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (topicInput.trim()) {
      router.push(`/research?topic=${encodeURIComponent(topicInput.trim())}`);
    }
  };

  const handleQuickTopic = (t: string) => {
    setTopicInput(t);
    router.push(`/research?topic=${encodeURIComponent(t)}`);
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen text-stone-900 selection:bg-rose-100 selection:text-rose-900">
      {/* Newspaper Masthead Top Wire */}
      <div className="border-b border-[#E8E2D5] bg-white/50 backdrop-blur-md py-1.5 px-4 text-center text-[10px] sm:text-[11px] font-bold tracking-widest text-stone-500 uppercase flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>DAILY RESEARCH GAZETTE</span>
          <span>•</span>
          <span>{formattedDate}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span>VOL. IV — SPECIAL DISPATCH</span>
          <span>•</span>
          <span>PEER-REVIEWED & WEB WIRE</span>
        </div>
      </div>

      {/* Glassmorphic Navbar */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-4 glass-masthead sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-[2px] rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm">
            <div className="w-9 h-9 rounded-[14px] bg-[#FAF7F2] text-stone-900 flex items-center justify-center font-headline font-black text-sm border border-white/60">
              TI
            </div>
          </div>
          <div>
            <span className="font-headline font-bold text-lg text-stone-900 tracking-tight block leading-none">
              Topic Intel
            </span>
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mt-0.5">
              Facts • Angles • Sources
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/research"
            className="p-[1.5px] rounded-2xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm hover:shadow-md hover:shadow-rose-500/20 transition-all duration-300"
          >
            <div className="bg-gradient-to-r from-[#e6683c] via-[#dc2743] to-[#bc1888] text-white text-xs sm:text-sm px-5 py-2 rounded-[14px] font-bold tracking-wide flex items-center gap-1.5 hover:opacity-95">
              <span>Open Gazette</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </nav>

      {/* Hero Editorial Section */}
      <main className="flex flex-col items-center justify-center pt-12 pb-24 px-4 sm:px-6 relative max-w-5xl mx-auto">
        <div className="text-center max-w-3xl z-10 animate-fade-in-up">
          {/* Tagline Badge with Instagram Gradient Accent */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#E8E2D5] text-stone-700 text-xs font-bold mb-6 shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-[#dc2743]" />
            <span>Live Encyclopedic & Academic Knowledge Dispatch</span>
          </div>

          {/* Newspaper Main Headline */}
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 leading-[1.15] text-stone-900">
            Turn any topic into <br className="hidden sm:inline" />
            <span className="insta-gradient-text">key facts, angles & useful sources.</span>
          </h1>

          <p className="font-editorial-body italic text-base sm:text-xl text-stone-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Inquire about any scientific phenomenon, historical event, or concept. Read verified factual bullets, multi-perspective angles, and accredited publications without cognitive clutter.
          </p>

          {/* Floating Glassmorphic Search Dock */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group mb-4">
            <div className="glass-dock rounded-3xl p-1.5 transition-all duration-300 focus-within:ring-4 focus-within:ring-rose-500/10 focus-within:border-rose-400">
              <div className="flex items-center gap-2 pl-4 pr-1.5 py-1">
                <Search className="w-5 h-5 text-stone-400 group-focus-within:text-[#dc2743] transition-colors shrink-0" />
                <input
                  type="text"
                  placeholder="Inquire any question (e.g. What is ML, Photosynthesis, Procrastination)..."
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className="w-full bg-transparent text-sm sm:text-base md:text-lg text-stone-900 placeholder-stone-400 focus:outline-none py-2 font-sans"
                />
                <button
                  type="submit"
                  className="shrink-0 p-[1.5px] rounded-2xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm hover:shadow-md hover:shadow-rose-500/20 transition-all duration-200"
                >
                  <div className="bg-gradient-to-r from-[#e6683c] via-[#dc2743] to-[#bc1888] text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-[14px] font-sans font-bold text-xs sm:text-sm tracking-wide flex items-center gap-1.5 hover:opacity-95">
                    <span>Dispatch</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>
          </form>

          {/* Story Ring Quick Topic Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-14">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1 mr-1">
              <Flame className="w-3.5 h-3.5 text-[#f09433]" /> Trending:
            </span>
            {SUGGESTED_TOPICS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleQuickTopic(t)}
                className="group p-[1.5px] rounded-full bg-stone-200 hover:bg-gradient-to-r hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] transition-all duration-300"
              >
                <div className="px-3 py-1 rounded-full text-xs font-semibold text-stone-600 bg-white/80 backdrop-blur-md group-hover:bg-white group-hover:text-stone-900 transition-colors">
                  {t}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* The 3 Core Pillars Showcase (Glassmorphic Newspaper Columns) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
          {/* Column 1: Key Facts */}
          <div className="glass-card glass-card-hover p-6 sm:p-7 rounded-3xl border border-white/95 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center font-headline font-bold text-sm">
                  01
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                  Section I
                </span>
              </div>
              <h3 className="font-headline font-bold text-xl text-stone-900 mb-2">
                Key Facts
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-4 font-sans">
                Verified, digestible factual points extracted directly from live encyclopedias, with highlighting metric badges and exact source citations.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-stone-200/70 text-[11px] text-stone-700 font-medium">
              ✦ Definitions • Foundations • Mechanisms • Timelines
            </div>
          </div>

          {/* Column 2: Content Angles */}
          <div className="glass-card glass-card-hover p-6 sm:p-7 rounded-3xl border border-white/95 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center font-headline font-bold text-sm">
                  02
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 text-[#dc2743] border border-rose-200/50">
                  Section II
                </span>
              </div>
              <h3 className="font-headline font-bold text-xl text-stone-900 mb-2">
                Content Angles
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-4 font-sans">
                Multi-dimensional perspectives exploring core mechanisms, practical applications, controversies, beginner analogies, and future frontiers.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-stone-200/70 text-[11px] text-stone-700 font-medium">
              ✦ Mechanisms • Real-World Use • Open Debates • Models
            </div>
          </div>

          {/* Column 3: Useful Sources */}
          <div className="glass-card glass-card-hover p-6 sm:p-7 rounded-3xl border border-white/95 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-headline font-bold text-sm">
                  03
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Section III
                </span>
              </div>
              <h3 className="font-headline font-bold text-xl text-stone-900 mb-2">
                Useful Sources
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-4 font-sans">
                Real external publications with verified links—including Wikipedia entries, CrossRef peer-reviewed scientific papers, and academic indexes.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-stone-200/70 text-[11px] text-stone-700 font-medium">
              ✦ Clickable Links • Academic DOIs • Publisher Metadata
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
