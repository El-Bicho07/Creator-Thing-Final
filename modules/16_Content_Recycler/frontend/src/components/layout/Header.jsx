import React from 'react';
import { Menu, Sparkles, ShieldCheck, Database, Calendar } from 'lucide-react';

export default function Header({ 
  currentTab, 
  onOpenMobileMenu, 
  user, 
  postCount, 
  dbStatus 
}) {
  const titles = {
    dashboard: {
      title: 'Analytics & Recycling Dashboard',
      subtitle: 'Creator performance baseline, historical decay curves, and recycling opportunities.',
    },
    library: {
      title: 'Historical Content Library',
      subtitle: 'Filter, inspect, and analyze all ingested Instagram posts and interactions.',
    },
    recommendations: {
      title: 'AI Content Recommendation Engine',
      subtitle: 'Tactical categorization into REPOST, REWORK, REPURPOSE, or ARCHIVE buckets.',
    },
    similarity: {
      title: 'Thematic Similarity & Carousel Bundler',
      subtitle: 'Zero-cost TF-IDF NLP vectorizer grouping related posts into high-synergy packs.',
    },
    planner: {
      title: 'Production Content Planner',
      subtitle: 'Schedule recycled assets across Draft, Planned, and Published pipelines.',
    },
    importer: {
      title: 'CSV Data Ingestion & Validation',
      subtitle: 'Upload historical export CSVs with schema validation and duplicate detection.',
    },
    settings: {
      title: 'Creator Settings & Algorithmic Weights',
      subtitle: 'Customize baseline formulas, saves multipliers, and platform preferences.',
    },
  };

  const current = titles[currentTab] || titles.dashboard;

  return (
    <header className="sticky top-0 z-30 bg-charcoal-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-4 flex items-center justify-between">
      
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-slate-300 hover:text-white bg-charcoal-900 border border-slate-800 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-lg lg:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {current.title}
          </h2>
          <p className="text-xs text-slate-400 hidden sm:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Badges & SIH Notice */}
      <div className="flex items-center gap-2.5">
        
        {/* Synthetic Data Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-charcoal-900 border border-slate-800 text-xs text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-lime-bright" />
          <span>SIH Demo: <strong className="text-slate-100">{postCount} Posts</strong></span>
        </div>

        {/* Database indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-charcoal-900 border border-slate-800 text-xs">
          <Database className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-300 text-[11px] hidden sm:inline">
            {dbStatus?.isMemoryFallback ? 'In-Memory Engine' : 'Atlas MongoDB'}
          </span>
        </div>

        {/* Creator Handle Pill */}
        {user?.creatorProfile?.handle && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-muted border border-lime-500/30 text-lime-bright text-xs font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>{user.creatorProfile.handle}</span>
          </div>
        )}
      </div>

    </header>
  );
}
