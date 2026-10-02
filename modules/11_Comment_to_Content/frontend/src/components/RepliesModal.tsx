'use client';

import React, { useState } from 'react';
import { X, MessageSquare, Copy, Check } from 'lucide-react';
import { Idea } from '@/types';

interface RepliesModalProps {
  idea: Idea | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RepliesModal: React.FC<RepliesModalProps> = ({
  idea,
  isOpen,
  onClose
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen || !idea) return null;

  const replies = idea.replies || [];

  const handleCopySingle = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const fullText = replies.map((r) => `${r.username}: ${r.reply_text}`).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-[#141E17] rounded-2xl border border-[#E2EDE5] dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2EDE5] dark:border-slate-800 bg-[#F8FAF8] dark:bg-[#19271E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EAF6EE] text-[#28663D] flex items-center justify-center border border-[#CDE9D5]">
              <MessageSquare className="w-4 h-4 text-[#3B8253]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#152218] dark:text-white">
                &ldquo;You asked, I made it&rdquo; Reply Drafts
              </h2>
              <p className="text-xs text-[#5C6F62] dark:text-[#8FA596]">
                Personalized responses for commenters who inspired this idea
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#5C6F62] hover:text-[#152218] dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Idea Banner */}
        <div className="px-6 py-3 bg-[#EAF6EE]/50 dark:bg-[#19271E]/60 border-b border-[#CDE9D5] flex items-center justify-between">
          <div className="truncate pr-4">
            <p className="text-xs font-bold text-[#152218] dark:text-white truncate">
              {idea.title}
            </p>
            <p className="text-[11px] text-[#5C6F62]">
              Format: {idea.format} &bull; {replies.length} Commenters
            </p>
          </div>
          {replies.length > 0 && (
            <button
              onClick={handleCopyAll}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#141E17] hover:bg-[#F4FAF5] text-[#28663D] border border-[#CDE9D5] shadow-xs transition"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-[#3B8253]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'Copied All!' : 'Copy All'}</span>
            </button>
          )}
        </div>

        {/* Replies List */}
        <div className="p-6 overflow-y-auto space-y-3.5">
          {replies.length === 0 ? (
            <div className="text-center py-8 text-[#5C6F62] text-xs">
              No replies generated yet for this idea.
            </div>
          ) : (
            replies.map((reply) => (
              <div
                key={reply.id}
                className="p-4 rounded-xl bg-[#F8FAF8] dark:bg-[#19271E] border border-[#E2EDE5] dark:border-slate-800 space-y-2 hover:border-[#3B8253] transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#28663D] dark:text-[#93DBA6]">
                    {reply.username}
                  </span>
                  <button
                    onClick={() => handleCopySingle(reply.id, reply.reply_text)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-[#141E17] text-[#28663D] hover:bg-[#3B8253] hover:text-white border border-[#CDE9D5] transition shadow-xs"
                  >
                    {copiedId === reply.id ? (
                      <>
                        <Check className="w-3 h-3 text-[#3B8253]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-[#334155] dark:text-[#CBD5E1] leading-relaxed font-normal bg-white dark:bg-[#141E17] p-2.5 rounded-lg border border-[#E5EFE7] dark:border-slate-800">
                  {reply.reply_text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
