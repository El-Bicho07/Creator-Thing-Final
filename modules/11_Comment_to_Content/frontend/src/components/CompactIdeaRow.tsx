'use client';

import React, { useState } from 'react';
import { 
  Video, 
  Layers, 
  Flame, 
  Copy, 
  Check, 
  Calendar as CalendarIcon, 
  Vote, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Idea, IdeaStatus } from '@/types';

interface CompactIdeaRowProps {
  idea: Idea;
  onSelectIdea: (idea: Idea) => void;
  onStatusChange: (ideaId: string, status: IdeaStatus) => void;
  onOpenSchedule: (idea: Idea) => void;
  onOpenStoryValidation: (idea: Idea) => void;
}

export const CompactIdeaRow: React.FC<CompactIdeaRowProps> = ({
  idea,
  onSelectIdea,
  onStatusChange,
  onOpenSchedule,
  onOpenStoryValidation
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyPost = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullText = `${idea.caption_draft}\n\n${(idea.hashtags || []).join(' ')}`;
    navigator.clipboard.writeText(fullText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLower = (idea.format || 'reel').toLowerCase();
  const topComment = idea.evidence_comments && idea.evidence_comments.length > 0 ? idea.evidence_comments[0] : null;

  return (
    <div 
      onClick={() => onSelectIdea(idea)}
      className="group cursor-pointer p-4 rounded-xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 hover:border-[#4FAD68] hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
    >
      {/* Left: Format, Title & Hook */}
      <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#EAF6EE] text-[#28663D] border border-[#CDE9D5]">
          {formatLower === 'carousel' ? <Layers className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          {idea.format.toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-[#152218] dark:text-white group-hover:text-[#3B8253] transition-colors truncate">
              {idea.title}
            </h4>
            {idea.gap_status === 'new_opportunity' && (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.2 bg-[#EAF6EE] text-[#28663D] rounded-full border border-[#CDE9D5]">
                New Gap
              </span>
            )}
          </div>
          <p className="text-xs text-[#5C6F62] dark:text-[#8FA596] truncate">
            {idea.hook} {topComment && `• Inspired by ${topComment.username}`}
          </p>
        </div>
      </div>

      {/* Right: Demand Score & Actions */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="flex items-center gap-2.5 shrink-0 justify-between md:justify-end"
      >
        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#3B8253] bg-[#EAF6EE] px-2.5 py-1 rounded-lg border border-[#CDE9D5]">
          <Flame className="w-3 h-3 text-[#3B8253]" />
          {idea.demand_score}%
        </span>

        <button
          onClick={() => onOpenStoryValidation(idea)}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EAF6EE] text-[#28663D] hover:bg-[#D5ECDC] border border-[#CDE9D5] transition"
          title="Validate with IG Story Poll"
        >
          <Vote className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onOpenSchedule(idea)}
          className="p-1.5 rounded-lg text-[#5C6F62] hover:text-[#152218] hover:bg-[#F4FAF5] border border-[#E2EDE5] transition"
          title="Schedule"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-[#3B8253]" />
        </button>

        <button
          onClick={handleCopyPost}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-[#141E17] hover:bg-[#F4FAF5] text-[#28663D] border border-[#CDE9D5] transition shadow-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#3B8253]" /> : <Copy className="w-3.5 h-3.5 text-[#3B8253]" />}
        </button>

        <button
          onClick={() => onSelectIdea(idea)}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#3B8253] hover:bg-[#2F6A44] text-white transition shadow-xs"
        >
          <span>Blueprint</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
