import React from 'react';
import { RefreshCw, Wrench, Sparkles, Archive, Image, Layers, Video, PlaySquare } from 'lucide-react';

export function RecommendationBadge({ type, size = 'md' }) {
  const configs = {
    REPOST: {
      label: 'REPOST',
      icon: RefreshCw,
      bg: 'bg-lime-muted text-lime-bright border-lime-500/40 shadow-glow-subtle',
      desc: 'High performance & dormant',
    },
    REWORK: {
      label: 'REWORK',
      icon: Wrench,
      bg: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
      desc: 'High reach, low conversion',
    },
    REPURPOSE: {
      label: 'REPURPOSE',
      icon: Sparkles,
      bg: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
      desc: 'Prime for format upgrade',
    },
    ARCHIVE: {
      label: 'ARCHIVE',
      icon: Archive,
      bg: 'bg-slate-900 text-slate-400 border-slate-700/50',
      desc: 'Dated or low traction',
    }
  };

  const config = configs[type] || configs.ARCHIVE;
  const Icon = config.icon;

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5 gap-1'
    : size === 'lg'
    ? 'text-sm px-3.5 py-1.5 gap-2 font-bold tracking-wider'
    : 'text-xs px-2.5 py-1 gap-1.5 font-semibold';

  return (
    <span className={`inline-flex items-center rounded-full border transition-all duration-200 ${sizeClasses} ${config.bg}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {config.label}
    </span>
  );
}

export function MediaTypeBadge({ type }) {
  const configs = {
    IMAGE: { label: 'Single Image', icon: Image, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' },
    CAROUSEL: { label: 'Carousel (Multi-slide)', icon: Layers, color: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/30' },
    REEL: { label: 'Reel (Short Video)', icon: PlaySquare, color: 'text-rose-400 bg-rose-950/40 border-rose-500/30' },
    VIDEO: { label: 'Video', icon: Video, color: 'text-purple-400 bg-purple-950/40 border-purple-500/30' },
  };

  const config = configs[type] || configs.IMAGE;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
