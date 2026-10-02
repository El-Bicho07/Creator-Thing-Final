"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Laugh,
  Search,
  Sparkles,
  Download,
  Copy,
  Check,
  Clapperboard,
  Film,
  Shuffle,
  Layers,
  ArrowRight,
  Smile,
  AlertCircle
} from "lucide-react";
import { MemeTemplate, Project } from "@/lib/types";
import {
  MEME_TEMPLATES,
  findMemesForSituation,
  getAutoSituationsForTopic
} from "@/lib/meme-registry";
import { copyToClipboard } from "@/lib/utils";

interface MemeStudioProps {
  project: Project | null;
  onAttachMemeToProject?: (meme: {
    comedian: string;
    movieRef: string;
    iconicDialogue: string;
    memeContext: string;
    imageUrl: string;
    topText: string;
    bottomText: string;
  }) => void;
}

export function MemeStudio({ project, onAttachMemeToProject }: MemeStudioProps) {
  const isTamil = useMemo(
    () =>
      (project?.language || "").toLowerCase().includes("tamil") ||
      (project?.language || "").toLowerCase().includes("tanglish"),
    [project?.language]
  );

  const autoSituations = useMemo(
    () => getAutoSituationsForTopic(project?.topic || "Food Review", isTamil),
    [project?.topic, isTamil]
  );

  // Search & Filter State
  const [situationQuery, setSituationQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "tamil" | "universal">(
    isTamil ? "tamil" : "all"
  );

  // Selected Meme Template for Creation
  const [selectedMeme, setSelectedMeme] = useState<MemeTemplate>(MEME_TEMPLATES[0]);

  // Canvas Editor State
  const [topText, setTopText] = useState<string>(MEME_TEMPLATES[0].defaultTopText);
  const [bottomText, setBottomText] = useState<string>(MEME_TEMPLATES[0].defaultBottomText);
  const [fontSize, setFontSize] = useState<number>(26);
  const [textColor, setTextColor] = useState<string>("#FFFFFF");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isAttached, setIsAttached] = useState<boolean>(false);

  // Matched Memes
  const filteredMemes = useMemo(() => {
    return findMemesForSituation(situationQuery, categoryFilter);
  }, [situationQuery, categoryFilter]);

  const handleSelectTemplate = (meme: MemeTemplate) => {
    setSelectedMeme(meme);
    setTopText(meme.defaultTopText);
    setBottomText(meme.defaultBottomText);
    setIsAttached(false);
  };

  const handleQuickSituation = (situation: string) => {
    setSituationQuery(situation);
  };

  // Generate & Download PNG using HTML Canvas
  const handleDownloadMeme = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = selectedMeme.imageUrl;

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;

      // Draw background image
      ctx.drawImage(img, 0, 0, 600, 600);

      // Dark vignette gradient for contrast
      const gradient = ctx.createLinearGradient(0, 0, 0, 600);
      gradient.addColorStop(0, "rgba(0,0,0,0.6)");
      gradient.addColorStop(0.3, "rgba(0,0,0,0)");
      gradient.addColorStop(0.7, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 600, 600);

      // Setup classic Impact text styling
      ctx.fillStyle = textColor;
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 6;
      ctx.textAlign = "center";
      ctx.font = `900 ${fontSize * 1.4}px Impact, "Arial Black", sans-serif`;

      // Draw Top Text
      if (topText.trim()) {
        ctx.strokeText(topText.toUpperCase(), 300, 60);
        ctx.fillText(topText.toUpperCase(), 300, 60);
      }

      // Draw Bottom Text
      if (bottomText.trim()) {
        ctx.strokeText(bottomText.toUpperCase(), 300, 560);
        ctx.fillText(bottomText.toUpperCase(), 300, 560);
      }

      // Download
      const link = document.createElement("a");
      link.download = `meme-${selectedMeme.character.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  const handleCopyMemeText = async () => {
    const text = `🎭 MEME CUTAWAY: ${selectedMeme.character} (${selectedMeme.movieOrOrigin})\n\nTOP: "${topText}"\nBOTTOM: "${bottomText}"\n\nPUNCHLINE: "${selectedMeme.iconicDialogue}"`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleAttachToProject = () => {
    if (onAttachMemeToProject) {
      onAttachMemeToProject({
        comedian: selectedMeme.character,
        movieRef: selectedMeme.movieOrOrigin,
        iconicDialogue: selectedMeme.iconicDialogue,
        memeContext: `Situational cutaway: ${situationQuery || selectedMeme.vibe}`,
        imageUrl: selectedMeme.imageUrl,
        topText,
        bottomText
      });
      setIsAttached(true);
      setTimeout(() => setIsAttached(false), 2500);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* Studio Header Banner */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/10 p-5 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider">
            <Laugh className="h-4 w-4" />
            <span>Meme Director & Situational Creator Studio 🎭</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-500">
              Vadivelu &bull; Santhanam &bull; Vivek &bull; Universal
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Situational Video Meme Studio 🎬
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Never insert random memes. Enter the exact awkward, funny, or shocking moment in your video to find the perfect iconic reaction dialogue.
          </p>
        </div>

        {/* Current Project Topic Context Indicator */}
        {project && (
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Content Topic:</span>
            <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-foreground">
              {project.topic}
            </span>
            <span className="text-muted-foreground/60">&bull;</span>
            <span>Platform: <strong className="capitalize text-primary">{project.platform}</strong></span>
          </div>
        )}
      </div>

      {/* Situational Search & Smart Topic Chips */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <span>Search by Specific Situation or Moment 🔍</span>
          </h3>
          <span className="text-xs text-muted-foreground">e.g. food bill, spicy food, code crash</span>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <input
            type="text"
            value={situationQuery}
            onChange={(e) => setSituationQuery(e.target.value)}
            placeholder="Type your situation (e.g. 'Waiter brings 5000 Rs bill for 2 dosas', 'Biting elaichi in biryani')..."
            className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          {situationQuery && (
            <button
              onClick={() => setSituationQuery("")}
              className="absolute right-3.5 top-3 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Smart Suggested Situations for Content */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Quick Situations for &ldquo;{project?.topic || "This Content"}&rdquo;:</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {autoSituations.map((sit, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickSituation(sit)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all text-left ${
                  situationQuery === sit
                    ? "bg-amber-500/20 text-amber-500 border-amber-500/40 font-bold"
                    : "bg-secondary/40 text-foreground/80 border-border hover:bg-secondary hover:border-amber-500/30"
                }`}
              >
                &ldquo;{sit}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          <span className="text-xs text-muted-foreground">Filter:</span>
          <button
            onClick={() => setCategoryFilter("all")}
            className={`text-xs px-3 py-1 rounded-lg border font-medium ${
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            All Memes ({MEME_TEMPLATES.length})
          </button>
          <button
            onClick={() => setCategoryFilter("tamil")}
            className={`text-xs px-3 py-1 rounded-lg border font-medium ${
              categoryFilter === "tamil"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            🎭 Tamil Cinema Legends
          </button>
          <button
            onClick={() => setCategoryFilter("universal")}
            className={`text-xs px-3 py-1 rounded-lg border font-medium ${
              categoryFilter === "universal"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            🌍 Universal Viral Memes
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Template Gallery (Left) + Interactive Creator Canvas (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Matched Meme Templates (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>Matched Situational Memes ({filteredMemes.length})</span>
            </h3>
            <span className="text-xs text-muted-foreground">Click template to customize</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredMemes.map((meme) => {
              const isSelected = selectedMeme.id === meme.id;
              return (
                <div
                  key={meme.id}
                  onClick={() => handleSelectTemplate(meme)}
                  className={`group rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 shadow-md"
                      : "border-border bg-card hover:border-amber-500/40 hover:bg-secondary/30"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Image Preview with Character Badge */}
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-950 border border-border/80">
                      <img
                        src={meme.imageUrl}
                        alt={meme.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                      />
                      <span className="absolute top-2 left-2 rounded-md bg-black/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-400/20">
                        {meme.character}
                      </span>
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                        {meme.movieOrOrigin}
                      </span>
                    </div>

                    {/* Title & Iconic Dialogue */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-amber-500 transition-colors">
                        {meme.name}
                      </h4>
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 italic mt-0.5">
                        &ldquo;{meme.iconicDialogue}&rdquo;
                      </p>
                    </div>

                    {/* Vibe & Situations */}
                    <div className="text-[11px] text-muted-foreground">
                      <strong>Vibe: </strong>{meme.vibe}
                    </div>
                  </div>

                  {/* Select Indicator */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      {meme.category === "tamil" ? "Tamil Cinema" : "Universal"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        isSelected ? "text-amber-500" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <span>{isSelected ? "Currently Editing" : "Select & Edit"}</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Interactive Meme Canvas & Editor (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20 rounded-2xl border border-amber-500/40 bg-card p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Smile className="h-4 w-4 text-amber-500" />
                <span>Live Meme Creator Canvas 🎨</span>
              </h3>
              <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                {selectedMeme.character}
              </span>
            </div>

            {/* LIVE PREVIEW CANVAS */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-950 border-2 border-zinc-800 shadow-2xl flex flex-col justify-between p-4 group select-none">
              {/* Background Template Image */}
              <img
                src={selectedMeme.imageUrl}
                alt={selectedMeme.name}
                className="absolute inset-0 w-full h-full object-cover opacity-85 pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/60 pointer-events-none" />

              {/* TOP MEME TEXT */}
              <div className="relative z-10 text-center px-2">
                <p
                  className="font-black uppercase tracking-wider drop-shadow-[0_4px_4px_rgba(0,0,0,1)] break-words leading-tight"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: textColor,
                    textShadow:
                      "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 6px #000",
                    fontFamily: 'Impact, "Arial Black", sans-serif'
                  }}
                >
                  {topText || "ENTER TOP TEXT"}
                </p>
              </div>

              {/* BOTTOM MEME TEXT */}
              <div className="relative z-10 text-center px-2">
                <p
                  className="font-black uppercase tracking-wider drop-shadow-[0_4px_4px_rgba(0,0,0,1)] break-words leading-tight"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: textColor,
                    textShadow:
                      "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 6px #000",
                    fontFamily: 'Impact, "Arial Black", sans-serif'
                  }}
                >
                  {bottomText || "ENTER BOTTOM TEXT"}
                </p>
              </div>
            </div>

            {/* EDITING CONTROLS */}
            <div className="space-y-3.5 pt-1">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Top Text (Hook / Setup)
                </label>
                <input
                  type="text"
                  value={topText}
                  onChange={(e) => setTopText(e.target.value)}
                  placeholder="WHEN THE FOOD BILL ARRIVES..."
                  className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs sm:text-sm text-foreground focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Bottom Text (Punchline)
                </label>
                <input
                  type="text"
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                  placeholder="VENAAM... VALIKIDHU... AZHUDHUDUVEN!"
                  className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs sm:text-sm text-foreground focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Text Style Sliders & Color */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Font Size ({fontSize}px)
                  </label>
                  <input
                    type="range"
                    min="18"
                    max="40"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    {["#FFFFFF", "#FACC15", "#22D3EE", "#F43F5E"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setTextColor(c)}
                        className={`h-6 w-6 rounded-full border-2 transition-all ${
                          textColor === c ? "border-amber-500 scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleDownloadMeme}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Download className="h-4 w-4" />
                <span>Download Meme PNG for Video 📥</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyMemeText}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span>{isCopied ? "Copied!" : "Copy Details"}</span>
                </button>

                {onAttachMemeToProject && (
                  <button
                    onClick={handleAttachToProject}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition-colors"
                  >
                    {isAttached ? <Check className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
                    <span>{isAttached ? "Attached!" : "Attach to Project"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
