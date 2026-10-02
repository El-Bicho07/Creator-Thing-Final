'use client';

import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  HelpCircle, 
  Vote, 
  Share2, 
  Heart, 
  Send
} from 'lucide-react';
import { InstagramIcon } from '@/components/icons';
import { Idea } from '@/types';

interface StoryValidationModalProps {
  idea: Idea | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StoryValidationModal: React.FC<StoryValidationModalProps> = ({
  idea,
  isOpen,
  onClose
}) => {
  const [copiedSticker, setCopiedSticker] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  if (!isOpen || !idea) return null;

  const validation = idea.story_validation || {
    type: 'poll',
    prompt: `Should I make a full video breakdown on ${idea.title}?`,
    options: ['Yes, please! 🔥', 'Already know this 👍'],
    sticker_preview: `Poll: Full video on ${idea.title}?`
  };

  const commenters = (idea.evidence_comments || []).map((c) => c.username);
  const taggedUsers = commenters.length > 0 ? commenters.join(' ') : '@community';
  const storyMentionCaption = idea.story_mention_caption || 
    `You asked for this! ${taggedUsers} Check out today's new breakdown on my feed 🚀`;

  const handleCopySticker = () => {
    let text = validation.prompt;
    if (validation.options && validation.options.length > 0) {
      text += `\nOptions: ${validation.options.join(' / ')}`;
    }
    navigator.clipboard.writeText(text);
    setCopiedSticker(true);
    setTimeout(() => setCopiedSticker(false), 2000);
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(storyMentionCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#141E17] rounded-3xl border border-[#E2EDE5] dark:border-slate-800 shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left: Mobile Story Simulator (9:16 Canvas) */}
        <div className="w-full md:w-72 bg-gradient-to-b from-[#1C3B24] via-[#244D30] to-[#162E1D] p-5 flex flex-col justify-between text-white relative overflow-hidden shrink-0">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#4FAD68]/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#3B8253]/20 rounded-full blur-3xl" />

          {/* Top Story Header */}
          <div className="relative z-10 space-y-3">
            {/* Story progress bars */}
            <div className="flex gap-1.5 w-full">
              <div className="h-1 flex-1 bg-white rounded-full" />
              <div className="h-1 flex-1 bg-white/40 rounded-full" />
            </div>

            {/* Profile info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7CCB91] to-[#3B8253] p-0.5">
                  <div className="w-full h-full rounded-full bg-[#162E1D] flex items-center justify-center text-xs font-bold text-white">
                    DA
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold leading-none">DevWithArjun</p>
                  <p className="text-[10px] text-white/70">Just now &bull; Story Poll</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md">
                VALIDATE
              </span>
            </div>
          </div>

          {/* Center: The Simulated Instagram Sticker */}
          <div className="relative z-10 my-8 space-y-3">
            <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 shadow-xl space-y-3 text-center">
              <span className="inline-block p-1.5 rounded-full bg-white/20 text-white">
                {validation.type === 'poll' ? <Vote className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
              </span>

              <p className="text-xs font-extrabold text-white leading-snug">
                {validation.prompt}
              </p>

              {validation.options && validation.options.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {validation.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedOption(i)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        selectedOption === i
                          ? 'bg-white text-[#152218] shadow-md'
                          : 'bg-white/20 hover:bg-white/30 text-white'
                      }`}
                    >
                      <span>{opt}</span>
                      {selectedOption === i && <span className="text-[10px] text-[#3B8253] font-bold">✓ Voted</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-white/20 text-[11px] text-white/80 italic">
                  &ldquo;Type response here...&rdquo;
                </div>
              )}
            </div>

            <p className="text-[10px] text-center text-white/70">
              Simulated 9:16 Instagram Story Preview
            </p>
          </div>

          {/* Bottom Story bar */}
          <div className="relative z-10 flex items-center justify-between text-white/80 text-xs">
            <div className="flex-1 py-1.5 px-3 rounded-full bg-white/15 text-white/70 text-[11px]">
              Send message...
            </div>
            <Heart className="w-5 h-5 ml-2.5 text-white/80" />
            <Send className="w-5 h-5 ml-2.5 text-white/80" />
          </div>
        </div>

        {/* Right: Validation Actions & Copy Controls */}
        <div className="flex-1 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3B8253] dark:text-[#6EC886]">
                  Instagram Workflow
                </span>
                <h3 className="text-lg font-bold text-[#152218] dark:text-white">
                  Validate Idea with an IG Story
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#5C6F62] hover:text-[#152218] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5C6F62] dark:text-[#8FA596] leading-relaxed">
              Validate audience demand before spending hours shooting. Drop this poll sticker directly on your Instagram Story.
            </p>

            {/* Sticker Prompt Box */}
            <div className="p-4 rounded-2xl bg-[#F8FAF8] dark:bg-[#19271E] border border-[#E2EDE5] dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#152218] dark:text-white flex items-center gap-1.5">
                  <Vote className="w-4 h-4 text-[#3B8253]" />
                  Story Sticker Text
                </span>
                <button
                  onClick={handleCopySticker}
                  className="flex items-center gap-1 text-xs font-semibold text-[#3B8253] dark:text-[#6EC886] hover:underline"
                >
                  {copiedSticker ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Sticker</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs font-semibold text-[#152218] dark:text-[#E2EBE5] bg-white dark:bg-[#141E17] p-2.5 rounded-xl border border-[#E2EDE5] dark:border-slate-800">
                {validation.prompt}
              </p>

              {validation.options && (
                <div className="flex gap-2 flex-wrap">
                  {validation.options.map((opt, i) => (
                    <span key={i} className="text-[11px] font-medium px-2 py-1 rounded-lg bg-[#EAF6EE] text-[#28663D] dark:bg-[#19271E] dark:text-[#93DBA6] border border-[#CDE9D5] dark:border-[#2D4C39]">
                      Option {i+1}: {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Story-Mention Caption Box */}
            <div className="p-4 rounded-2xl bg-[#F8FAF8] dark:bg-[#19271E] border border-[#E2EDE5] dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#152218] dark:text-white flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-[#3B8253]" />
                  Story Shoutout Caption (Tags Commenters)
                </span>
                <button
                  onClick={handleCopyCaption}
                  className="flex items-center gap-1 text-xs font-semibold text-[#3B8253] dark:text-[#6EC886] hover:underline"
                >
                  {copiedCaption ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Caption</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-[#334155] dark:text-[#CBD5E1] bg-white dark:bg-[#141E17] p-2.5 rounded-xl border border-[#E2EDE5] dark:border-slate-800 leading-relaxed">
                {storyMentionCaption}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5EFE7] dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-[#5C6F62] dark:text-[#8FA596]">
              Validated ideas rank higher in production queue
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#3B8253] hover:bg-[#2F6A44] text-white transition shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
