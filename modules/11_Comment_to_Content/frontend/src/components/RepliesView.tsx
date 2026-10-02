'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquareShare, 
  Copy, 
  Check
} from 'lucide-react';
import { api } from '@/lib/api';
import { FullReplyDraftItem } from '@/types';

export const RepliesView: React.FC = () => {
  const [replies, setReplies] = useState<FullReplyDraftItem[]>([]);
  const [postedOnly, setPostedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPostTitle, setCopiedPostTitle] = useState<string | null>(null);

  const fetchReplies = async () => {
    setIsLoading(true);
    try {
      const data = await api.getReplies(postedOnly);
      setReplies(data);
    } catch (err) {
      console.error('Failed to fetch replies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [postedOnly]);

  const handleCopySingle = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group replies by idea_id
  const groupedReplies = replies.reduce<Record<string, FullReplyDraftItem[]>>((acc, item) => {
    acc[item.idea_id] = acc[item.idea_id] || [];
    acc[item.idea_id].push(item);
    return acc;
  }, {});

  const handleCopyAllForIdea = (ideaTitle: string, ideaReplies: FullReplyDraftItem[]) => {
    const formatted = ideaReplies.map(r => `${r.username}: ${r.reply_text}`).join('\n\n');
    navigator.clipboard.writeText(formatted);
    setCopiedPostTitle(ideaTitle);
    setTimeout(() => setCopiedPostTitle(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAF6EE] text-[#28663D] flex items-center justify-center border border-[#CDE9D5]">
            <MessageSquareShare className="w-5 h-5 text-[#3B8253]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#152218] dark:text-white">
              &ldquo;You asked, I made it&rdquo; Reply Engine
            </h2>
            <p className="text-xs text-[#5C6F62] dark:text-[#8FA596]">
              Close the feedback loop with commenters whose questions inspired your content
            </p>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-1.5 bg-[#F4FAF5] dark:bg-[#19271E] p-1.5 rounded-xl border border-[#E2EDE5] dark:border-slate-800">
          <button
            onClick={() => setPostedOnly(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              !postedOnly
                ? 'bg-[#3B8253] text-white shadow-xs'
                : 'text-[#5C6F62] hover:text-[#152218] dark:text-[#8FA596]'
            }`}
          >
            All Drafts ({replies.length})
          </button>
          <button
            onClick={() => setPostedOnly(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              postedOnly
                ? 'bg-[#3B8253] text-white shadow-xs'
                : 'text-[#5C6F62] hover:text-[#152218] dark:text-[#8FA596]'
            }`}
          >
            Posted Only
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-[#EAF6EE]/50 border border-[#E2EDE5]" />
          ))}
        </div>
      ) : Object.keys(groupedReplies).length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#141E17] rounded-2xl border border-[#E2EDE5] dark:border-slate-800 p-8 space-y-3">
          <MessageSquareShare className="w-12 h-12 mx-auto text-[#3B8253]" />
          <h3 className="text-base font-bold text-[#152218] dark:text-white">
            {postedOnly ? 'No Posted Ideas Found' : 'No Reply Drafts Available'}
          </h3>
          <p className="text-xs text-[#5C6F62] max-w-md mx-auto">
            {postedOnly
              ? 'Mark an idea as "Posted" on the Idea Board or Calendar to view ready-to-paste replies.'
              : 'Run the comment analysis engine to generate personalized creator reply drafts.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedReplies).map(([ideaId, items]) => {
            const first = items[0];
            return (
              <div
                key={ideaId}
                className="rounded-2xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 shadow-xs overflow-hidden"
              >
                {/* Post Banner */}
                <div className="p-4 px-6 bg-[#F8FAF8] dark:bg-[#19271E] border-b border-[#E2EDE5] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF6EE] text-[#28663D] border border-[#CDE9D5]">
                      {first.idea_format}
                    </span>
                    <h3 className="text-sm font-bold text-[#152218] dark:text-white">
                      {first.idea_title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      first.idea_status === 'posted'
                        ? 'bg-[#EAF6EE] text-[#28663D]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {first.idea_status}
                    </span>

                    <button
                      onClick={() => handleCopyAllForIdea(first.idea_title, items)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#141E17] hover:bg-[#F4FAF5] text-[#28663D] border border-[#CDE9D5] shadow-xs transition"
                    >
                      {copiedPostTitle === first.idea_title ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#3B8253]" />
                          <span>Copied All!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy All ({items.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Reply Items for this Idea */}
                <div className="p-6 divide-y divide-[#E5EFE7] dark:divide-slate-800">
                  {items.map((rep) => (
                    <div key={rep.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                      {/* Original Comment snippet */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-[#28663D] dark:text-[#93DBA6]">
                          {rep.username} asked:
                        </span>
                        <span className="text-[#5C6F62] italic truncate max-w-xl">
                          &ldquo;{rep.original_comment_text}&rdquo;
                        </span>
                      </div>

                      {/* Drafted Reply Box */}
                      <div className="p-3.5 rounded-xl bg-[#F8FAF8] dark:bg-[#19271E] border border-[#E2EDE5] dark:border-slate-800 flex items-start justify-between gap-4">
                        <p className="text-xs text-[#334155] dark:text-[#CBD5E1] leading-relaxed">
                          {rep.reply_text}
                        </p>

                        <button
                          onClick={() => handleCopySingle(rep.id, rep.reply_text)}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#141E17] hover:bg-[#3B8253] hover:text-white text-[#28663D] border border-[#CDE9D5] shadow-xs transition"
                        >
                          {copiedId === rep.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Reply</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
