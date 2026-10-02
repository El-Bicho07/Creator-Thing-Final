'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Video, 
  Layers, 
  Flame, 
  Copy, 
  Check, 
  Clock, 
  MessageSquare, 
  Calendar as CalendarIcon, 
  Vote, 
  ArrowRight,
  BookmarkCheck,
  Bookmark
} from 'lucide-react';
import { Idea, IdeaStatus } from '@/types';

interface IdeaCardProps {
  idea: Idea;
  onSelectIdea: (idea: Idea) => void;
  onStatusChange: (ideaId: string, status: IdeaStatus) => void;
  onOpenSchedule: (idea: Idea) => void;
  onOpenStoryValidation: (idea: Idea) => void;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({
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

  const isSaved = idea.status === 'saved' || idea.status === 'planned' || idea.status === 'posted';
  const formatLower = (idea.format || 'reel').toLowerCase();
  const topComment = idea.evidence_comments && idea.evidence_comments.length > 0 ? idea.evidence_comments[0] : null;

  return (
    <div 
      onClick={() => onSelectIdea(idea)}
      className="group cursor-pointer rounded-2xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 hover:border-[#4FAD68] hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between space-y-3.5"
    >
      <div className="space-y-2.5">
        {/* Row 1: Badges & Score */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF6EE] text-[#28663D] border border-[#CDE9D5]">
              {formatLower === 'carousel' ? <Layers className="w-3 h-3" /> : <Video className="w-3 h-3" />}
              {idea.format.toUpperCase()}
              {idea.suggested_length && ` • ${idea.suggested_length}`}
            </span>

            {idea.gap_status === 'new_opportunity' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF6EE] text-[#28663D] border border-[#CDE9D5]">
                <Sparkles className="w-3 h-3 text-[#3B8253]" />
                New
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Covered
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EAF6EE] border border-[#CDE9D5] text-[#28663D] text-xs font-extrabold">
            <Flame className="w-3 h-3 text-[#3B8253]" />
            <span>{idea.demand_score}%</span>
          </div>
        </div>

        {/* Row 2: Title */}
        <h3 className="text-base font-bold text-[#152218] dark:text-white group-hover:text-[#3B8253] transition-colors line-clamp-2 leading-snug">
          {idea.title}
        </h3>

        {/* Row 3: Hook Snippet */}
        <p className="text-xs text-[#5C6F62] dark:text-[#8FA596] italic line-clamp-2 leading-relaxed bg-[#F8FAF8] dark:bg-[#19271E] p-2.5 rounded-xl border border-[#E5EFE7] dark:border-slate-800">
          &ldquo;{idea.hook}&rdquo;
        </p>

        {/* Row 4: Evidence Trigger */}
        {topComment && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#5C6F62] dark:text-[#8FA596] truncate pt-0.5">
            <MessageSquare className="w-3 h-3 text-[#3B8253] shrink-0" />
            <span className="font-semibold text-[#28663D] dark:text-[#93DBA6] shrink-0">
              {topComment.username} ({topComment.likes} likes):
            </span>
            <span className="truncate italic">
              &ldquo;{topComment.clean_text || topComment.text}&rdquo;
            </span>
          </div>
        )}
      </div>

      {/* Row 5: Concise Action Toolbar */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="pt-3 border-t border-[#E5EFE7] dark:border-slate-800 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenStoryValidation(idea)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EAF6EE] text-[#28663D] hover:bg-[#D5ECDC] border border-[#CDE9D5] transition"
            title="IG Story Poll Validator"
          >
            <Vote className="w-3 h-3 text-[#3B8253]" />
            <span>Story Poll</span>
          </button>

          <button
            onClick={() => onOpenSchedule(idea)}
            className="p-1.5 rounded-lg text-[#5C6F62] hover:text-[#152218] hover:bg-[#F4FAF5] border border-[#E2EDE5] transition"
            title="Schedule in Calendar"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-[#3B8253]" />
          </button>

          <button
            onClick={() => onStatusChange(idea.id, isSaved && idea.status === 'saved' ? 'new' : 'saved')}
            className={`p-1.5 rounded-lg border text-xs transition ${
              isSaved
                ? 'bg-[#EAF6EE] text-[#28663D] border-[#CDE9D5]'
                : 'text-[#5C6F62] hover:text-[#152218] border-[#E2EDE5]'
            }`}
            title={isSaved ? 'Saved' : 'Save'}
          >
            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-[#3B8253]" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPost}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-[#141E17] hover:bg-[#F4FAF5] text-[#28663D] border border-[#CDE9D5] transition shadow-xs"
            title="Copy caption and hashtags"
          >
            {copied ? <Check className="w-3 h-3 text-[#3B8253]" /> : <Copy className="w-3 h-3 text-[#3B8253]" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
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
    </div>
  );
};
