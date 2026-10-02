'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  RefreshCw,
  Zap,
  Copy,
  Check,
  Clock,
  Sparkles,
  Lightbulb,
  Youtube,
  Instagram,
  Share2,
} from 'lucide-react';
import { PlanItem, PlatformOption, ToneOption } from '@/types';
import { TiltedThumbnail3D } from './TiltedThumbnail3D';
import { MotionCard, MotionButton } from '@/components/motion';

interface PostCardProps {
  item: PlanItem;
  niche: string;
  tone: ToneOption;
  onToggleDone: (itemId: string) => void;
  onSwapIdea: (item: PlanItem) => void;
  onNewHook: (item: PlanItem) => void;
  onUpdateCaption: (itemId: string, caption: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  item,
  niche,
  onToggleDone,
  onSwapIdea,
  onNewHook,
  onUpdateCaption,
}) => {
  const [copied, setCopied] = useState(false);
  const [captionText, setCaptionText] = useState(item.caption);
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    setCaptionText(item.caption);
  }, [item.caption]);

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCaptionText(val);
    setIsSaved(false);
    onUpdateCaption(item.id, val);
    setTimeout(() => setIsSaved(true), 600);
  };

  const handleCopyPost = async () => {
    const fullText = `[${item.slotName.toUpperCase()} - ${item.format}]\nTitle: ${item.title}\nAlt Title: ${item.altTitle}\n\nHook:\n${item.hook}\n\nDescription:\n${captionText}\n\nCTA: ${item.cta}\nBest Time: ${item.best}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Copied post details to clipboard!');
    }
  };

  const slotBadges: Record<string, { bg: string; text: string }> = {
    main: { bg: 'bg-orange text-white', text: 'Main Post' },
    quick: { bg: 'bg-yellow text-navy', text: 'Quick Engage' },
    trust: { bg: 'bg-lightblue text-navy', text: 'Trust Builder' },
  };

  const badge = slotBadges[item.slot] || slotBadges.main;

  return (
    <MotionCard
      className={`rounded-card border-4 ${
        item.done ? 'border-border bg-bg/80 opacity-90' : 'border-navy bg-card shadow-block-lg'
      } p-5 sm:p-7 space-y-5 transition-all`}
    >
      {/* Top Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-4">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-heading font-extrabold uppercase tracking-wide border-2 border-navy ${badge.bg}`}>
            {badge.text}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-navy/10 dark:bg-lightblue/20 text-navy dark:text-lightblue text-xs font-bold border border-navy/20">
            {item.format}
          </span>
        </div>

        {/* Right side best time & done check */}
        <div className="flex items-center gap-2.5">
          <div className="text-xs font-semibold text-muted flex items-center gap-1.5 bg-bg px-2.5 py-1 rounded-lg border border-border">
            <Clock className="w-3.5 h-3.5 text-orange" />
            <span>{item.best}</span>
          </div>

          <MotionButton
            onClick={() => onToggleDone(item.id)}
            type="button"
            className={`px-3 py-1.5 rounded-xl font-heading font-extrabold text-xs flex items-center gap-1.5 transition-all border-2 ${
              item.done
                ? 'bg-navy text-white border-navy shadow-block-sm'
                : 'bg-card text-muted border-border hover:border-navy hover:text-navy'
            }`}
          >
            {item.done ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-yellow fill-navy" />
                Done!
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 text-muted" />
                Mark done
              </>
            )}
          </MotionButton>
        </div>
      </div>

      {/* Title & Alt Title */}
      <div className="space-y-1.5">
        <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-navy tracking-tight leading-snug">
          {item.title}
        </h2>
        <p className="text-xs text-muted font-medium flex items-center gap-1">
          <span className="font-bold text-navy dark:text-lightblue">Alt title:</span> &ldquo;{item.altTitle}&rdquo;
        </p>
      </div>

      {/* Hook Box */}
      <div className="rounded-2xl bg-yellow/20 border-3 border-yellow p-4 space-y-2 relative">
        <div className="flex items-center justify-between">
          <span className="text-xs font-heading font-extrabold uppercase text-navy tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-orange fill-current" />
            Opening Hook (First 5 Seconds)
          </span>

          <button
            onClick={() => onNewHook(item)}
            type="button"
            className="text-xs font-bold text-navy hover:text-orange flex items-center gap-1 bg-white dark:bg-navy/80 px-2.5 py-1 rounded-lg border border-navy/20 shadow-block-sm transition-transform active:scale-95"
          >
            <RefreshCw className="w-3 h-3" />
            New hook
          </button>
        </div>
        <p className="text-sm sm:text-base font-semibold text-ink leading-relaxed font-sans">
          &ldquo;{item.hook}&rdquo;
        </p>
      </div>

      {/* Thumbnail 3D Preview (if Video) */}
      {item.thumb && <TiltedThumbnail3D thumb={item.thumb} niche={niche} />}

      {/* Outline */}
      {item.outline && item.outline.length > 0 && (
        <div className="space-y-2 bg-bg p-4 rounded-xl border-2 border-border">
          <h4 className="text-xs font-heading font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange" />
            Timed Content Outline
          </h4>
          <ul className="space-y-1.5 text-xs text-ink font-medium">
            {item.outline.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange shrink-0 mt-1.5" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Editable Caption / Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor={`caption-${item.id}`} className="font-heading font-bold text-navy uppercase tracking-wider">
            Video Description / Caption
          </label>
          <span className="text-[11px] font-mono text-muted">
            {isSaved ? '✓ Autosaved' : 'Saving...'}
          </span>
        </div>
        <textarea
          id={`caption-${item.id}`}
          value={captionText}
          onChange={handleCaptionChange}
          rows={4}
          className="w-full rounded-xl border-2 border-border bg-card p-3.5 text-xs sm:text-sm text-ink focus:border-orange focus:ring-0 resize-y leading-relaxed font-sans"
          placeholder="Edit video description..."
        />
      </div>

      {/* Pro Tip Note */}
      {item.note && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-lightblue/30 border-2 border-lightblue text-navy text-xs">
          <Lightbulb className="w-4 h-4 text-orange shrink-0 mt-0.5" />
          <p className="font-medium">{item.note}</p>
        </div>
      )}

      {/* Footer Action Buttons */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t-2 border-border">
        <div className="flex items-center gap-2">
          <MotionButton
            onClick={() => onSwapIdea(item)}
            type="button"
            className="btn-block-outline px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-navy" />
            Swap idea
          </MotionButton>
        </div>

        <MotionButton
          onClick={handleCopyPost}
          type="button"
          className="btn-block-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
        >
          {copied ? <Check className="w-4 h-4 text-yellow" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy this post'}
        </MotionButton>
      </div>
    </MotionCard>
  );
};
