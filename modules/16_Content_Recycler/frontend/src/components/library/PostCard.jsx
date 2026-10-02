import React from 'react';
import { 
  Sparkles, Calendar, Heart, MessageCircle, Share2, 
  Bookmark, Eye, Users, Trash2, ExternalLink 
} from 'lucide-react';
import { MediaTypeBadge } from '../common/Badge';

export default function PostCard({ post, onAnalyze, onAddToPlanner, onDelete }) {
  const formatNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return (n || 0).toLocaleString();
  };

  const hashtagsArray = Array.isArray(post.hashtags) 
    ? post.hashtags 
    : typeof post.hashtags === 'string' 
      ? post.hashtags.split(/[\s,]+/).filter(Boolean) 
      : [];

  return (
    <div className="p-5 rounded-2xl card-glass border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between group">
      
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <MediaTypeBadge type={post.mediaType} />
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{new Date(post.postDate).toLocaleDateString()}</span>
            {post.isSynthetic && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-charcoal-800 text-slate-500 font-mono">
                SYNTH
              </span>
            )}
          </div>
        </div>

        {/* Caption */}
        <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed mb-3 group-hover:text-white transition-colors">
          {post.caption}
        </p>

        {/* Hashtags */}
        {hashtagsArray.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {hashtagsArray.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-md bg-charcoal-800 text-slate-400 font-medium"
              >
                #{tag.replace(/^#/, '')}
              </span>
            ))}
            {hashtagsArray.length > 4 && (
              <span className="text-[11px] text-slate-500 self-center">
                +{hashtagsArray.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="grid grid-cols-4 gap-1 text-center bg-charcoal-900/60 p-2 rounded-xl text-xs">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold flex items-center justify-center gap-1">
              <Eye className="w-3 h-3 text-slate-400" /> Reach
            </p>
            <p className="font-bold text-white mt-0.5">{formatNum(post.reach)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold flex items-center justify-center gap-1">
              <Heart className="w-3 h-3 text-rose-400" /> Likes
            </p>
            <p className="font-bold text-white mt-0.5">{formatNum(post.likes)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold flex items-center justify-center gap-1">
              <Share2 className="w-3 h-3 text-sky-400" /> Shares
            </p>
            <p className="font-bold text-white mt-0.5">{formatNum(post.shares)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold flex items-center justify-center gap-1">
              <Bookmark className="w-3 h-3 text-amber-400" /> Saves
            </p>
            <p className="font-bold text-white mt-0.5">{formatNum(post.saves)}</p>
          </div>
        </div>

        {/* Calculated ER & Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              ER:
            </span>
            <span className="text-xs font-black text-lime-bright bg-lime-muted px-2 py-0.5 rounded border border-lime-500/30">
              {post.calculatedER || 0}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onAnalyze(post.originalId || post._id)}
              className="py-1.5 px-3 rounded-lg bg-charcoal-800 hover:bg-lime-accent hover:text-charcoal-950 text-slate-200 text-xs font-bold transition-all border border-slate-700 hover:border-lime-bright flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Recycle
            </button>
            <button
              onClick={() => onDelete(post.originalId || post._id)}
              title="Delete from Library"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-charcoal-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
