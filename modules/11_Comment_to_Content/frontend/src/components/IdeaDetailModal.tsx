'use client';

import React, { useState } from 'react';
import { 
  X, 
  Video, 
  Layers, 
  Flame, 
  Copy, 
  Check, 
  Clock, 
  Type, 
  MessageSquare, 
  Heart, 
  Calendar as CalendarIcon, 
  Vote, 
  Sparkles,
  Share2,
  CheckCircle2,
  BookmarkCheck,
  Bookmark
} from 'lucide-react';
import { Idea, IdeaStatus } from '@/types';

interface IdeaDetailModalProps {
  idea: Idea | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (ideaId: string, status: IdeaStatus) => void;
  onOpenSchedule: (idea: Idea) => void;
  onOpenStoryValidation: (idea: Idea) => void;
}

export const IdeaDetailModal: React.FC<IdeaDetailModalProps> = ({
  idea,
  isOpen,
  onClose,
  onStatusChange,
  onOpenSchedule,
  onOpenStoryValidation
}) => {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHook, setCopiedHook] = useState(false);
  const [copiedOverlay, setCopiedOverlay] = useState(false);

  if (!isOpen || !idea) return null;

  const handleCopyCaption = () => {
    const fullText = `${idea.caption_draft}\n\n${(idea.hashtags || []).join(' ')}`;
    navigator.clipboard.writeText(fullText.trim());
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyHook = () => {
    navigator.clipboard.writeText(idea.hook);
    setCopiedHook(true);
    setTimeout(() => setCopiedHook(false), 2000);
  };

  const handleCopyOverlay = () => {
    if (idea.on_screen_text) {
      navigator.clipboard.writeText(idea.on_screen_text);
      setCopiedOverlay(true);
      setTimeout(() => setCopiedOverlay(false), 2000);
    }
  };

  const isSaved = idea.status === 'saved' || idea.status === 'planned' || idea.status === 'posted';
  const formatLower = (idea.format || 'reel').toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-[#141E17] rounded-3xl border border-[#E2EDE5] dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#E2EDE5] dark:border-slate-800 bg-[#F8FAF8] dark:bg-[#19271E] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAF6EE] text-[#28663D] border border-[#CDE9D5]">
                {formatLower === 'carousel' ? <Layers className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                {idea.format.toUpperCase()}
              </span>

              {idea.suggested_length && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-[#141E17] text-[#475A4E] dark:text-[#8FA596] border border-[#E2EDE5] dark:border-slate-700">
                  <Clock className="w-3 h-3 text-[#3B8253]" />
                  {idea.suggested_length}
                </span>
              )}

              {idea.gap_status === 'new_opportunity' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF6EE] text-[#28663D] border border-[#CDE9D5]">
                  <Sparkles className="w-3 h-3 text-[#3B8253]" />
                  New Opportunity
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Covered Previously
                </span>
              )}

              <span className="text-xs font-extrabold text-[#3B8253] bg-[#EAF6EE] px-2.5 py-0.5 rounded-full border border-[#CDE9D5]">
                {idea.demand_score}/100 Demand
              </span>
            </div>

            <h2 className="text-xl font-bold text-[#152218] dark:text-white pt-1">
              {idea.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#5C6F62] hover:text-[#152218] hover:bg-[#EAF6EE] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. Hook & On-Screen Overlay */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C6F62] dark:text-[#8FA596]">
              Creative Blueprint
            </h4>

            {/* Hook */}
            <div className="p-4 rounded-2xl bg-[#F8FAF8] dark:bg-[#19271E] border border-[#E2EDE5] dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#28663D] dark:text-[#93DBA6]">
                <span className="flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[#3B8253]" />
                  Attention-Grabbing Hook (First 3 Seconds)
                </span>
                <button
                  onClick={handleCopyHook}
                  className="flex items-center gap-1 text-[11px] text-[#3B8253] hover:underline"
                >
                  {copiedHook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHook ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-sm font-semibold text-[#152218] dark:text-[#E2EBE5] italic leading-relaxed">
                &ldquo;{idea.hook}&rdquo;
              </p>
            </div>

            {/* On-screen text */}
            {idea.on_screen_text && (
              <div className="p-3.5 rounded-2xl bg-[#EAF6EE]/50 dark:bg-[#19271E]/60 border border-[#CDE9D5] flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#28663D] dark:text-[#93DBA6] flex items-center gap-1">
                    <Type className="w-3 h-3" />
                    On-Screen Text Overlay
                  </span>
                  <p className="text-xs font-bold text-[#152218] dark:text-[#E2EBE5] mt-0.5">
                    {idea.on_screen_text}
                  </p>
                </div>
                <button
                  onClick={handleCopyOverlay}
                  className="text-[#5C6F62] hover:text-[#3B8253] p-1"
                >
                  {copiedOverlay ? <Check className="w-4 h-4 text-[#3B8253]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* 2. Carousel Slides (if any) */}
          {idea.slide_outline && idea.slide_outline.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C6F62] dark:text-[#8FA596] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#3B8253]" />
                {idea.slide_outline.length}-Slide Carousel Outline
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {idea.slide_outline.map((slide) => (
                  <div
                    key={slide.slide_number}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#19271E] border border-[#E2EDE5] dark:border-slate-800 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#EAF6EE] text-[#28663D] font-bold text-[10px] flex items-center justify-center shrink-0">
                        {slide.slide_number}
                      </span>
                      <p className="text-xs font-bold text-[#152218] dark:text-white truncate">
                        {slide.title}
                      </p>
                    </div>
                    <p className="text-[11px] text-[#5C6F62] dark:text-[#8FA596]">
                      <strong className="text-[#28663D]">Visual:</strong> {slide.visual}
                    </p>
                    <p className="text-xs text-[#334155] dark:text-[#CBD5E1] pt-1">
                      {slide.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Ready-to-Post Caption Draft & Hashtags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C6F62] dark:text-[#8FA596]">
                Instagram Caption & Hashtags
              </h4>
              <button
                onClick={handleCopyCaption}
                className="flex items-center gap-1.5 text-xs font-bold text-[#3B8253] hover:underline"
              >
                {copiedCaption ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCaption ? 'Copied Caption!' : 'Copy Caption & Tags'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAF8] dark:bg-[#19271E] border border-[#E2EDE5] dark:border-slate-800 space-y-3">
              <p className="text-xs text-[#334155] dark:text-[#CBD5E1] leading-relaxed whitespace-pre-line">
                {idea.caption_draft}
              </p>

              {idea.hashtags && idea.hashtags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#E5EFE7] dark:border-slate-800">
                  {idea.hashtags.map((tag, idx) => (
                    <span key={idx} className="text-xs font-medium text-[#28663D] dark:text-[#93DBA6] bg-[#EAF6EE] dark:bg-[#141E17] px-2.5 py-1 rounded-lg border border-[#CDE9D5]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Audience Evidence (Comments that inspired this idea) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C6F62] dark:text-[#8FA596] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#3B8253]" />
              Audience Evidence ({idea.evidence_comments?.length || 3} Comments)
            </h4>

            <div className="space-y-2">
              {(idea.evidence_comments || []).map((comm) => (
                <div
                  key={comm.comment_id}
                  className="p-3.5 rounded-2xl bg-[#F8FAF8] dark:bg-[#19271E] border border-[#E2EDE5] dark:border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#28663D] dark:text-[#93DBA6]">
                      {comm.username}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-[#5C6F62]">
                      <Heart className="w-3 h-3 text-[#3B8253]" />
                      {comm.likes} likes
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 italic">
                    &ldquo;{comm.clean_text || comm.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 bg-[#F8FAF8] dark:bg-[#19271E] border-t border-[#E2EDE5] dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenStoryValidation(idea);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#EAF6EE] text-[#28663D] hover:bg-[#D5ECDC] border border-[#CDE9D5] transition shadow-xs"
            >
              <Vote className="w-4 h-4 text-[#3B8253]" />
              <span>Validate with Story Poll</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenSchedule(idea);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#141E17] text-[#5C6F62] hover:text-[#152218] border border-[#E2EDE5] dark:border-slate-700 transition"
            >
              <CalendarIcon className="w-4 h-4 text-[#3B8253]" />
              <span>Schedule</span>
            </button>

            <button
              onClick={() => onStatusChange(idea.id, isSaved && idea.status === 'saved' ? 'new' : 'saved')}
              className={`p-2 rounded-xl border text-xs transition ${
                isSaved
                  ? 'bg-[#EAF6EE] text-[#28663D] border-[#CDE9D5]'
                  : 'bg-white dark:bg-[#141E17] text-[#5C6F62] border-[#E2EDE5]'
              }`}
              title={isSaved ? 'Saved in library' : 'Save idea'}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4 text-[#3B8253]" /> : <Bookmark className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleCopyCaption}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#3B8253] hover:bg-[#2F6A44] text-white shadow-xs transition"
          >
            {copiedCaption ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCaption ? 'Copied Full Post!' : 'Copy Ready Post'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
