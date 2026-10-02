import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronLeft,
  Sliders,
  Mail,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Flame,
  Briefcase,
  Smile,
  Minimize2
} from 'lucide-react';
import confetti from 'canvas-confetti';

const TONE_OPTIONS = [
  {
    id: 'professional',
    label: 'Professional & Executive',
    description: 'Polished, data-driven, and enterprise-ready. Perfect for established brands and corporate marketing heads.',
    icon: Briefcase
  },
  {
    id: 'friendly',
    label: 'Friendly & Conversational',
    description: 'Warm, authentic, community-centric, and approachable. Ideal for lifestyle and DTC brands.',
    icon: Smile
  },
  {
    id: 'bold',
    label: 'Bold & Disruptive',
    description: 'High-energy, assertive, direct, and focused on exponential ROI and category dominance.',
    icon: Flame
  },
  {
    id: 'minimalist',
    label: 'Minimalist & Direct',
    description: 'Clean, no-fluff, bulleted clarity. Maximizes executive readability and rapid response.',
    icon: Minimize2
  }
];

const FORMAT_OPTIONS = [
  {
    id: 'deck',
    label: 'Full Proposal Deck (8 Sections)',
    description: 'Comprehensive partnership presentation with deep alignment analysis, 3 concepts, timeline, packages, and social proof.',
    badge: 'Recommended'
  },
  {
    id: 'email',
    label: 'Short Pitch Email',
    description: 'Punchy, condensed 60-second read structure designed for direct cold outreach via Gmail / LinkedIn.',
    badge: 'Quick Send'
  }
];

export function GenerateStep({
  profile,
  brandInfo,
  config,
  setConfig,
  onGenerate,
  isGenerating,
  onBack
}) {
  const [currentProgressStep, setCurrentProgressStep] = useState(0);

  const progressSteps = [
    "Analyzing Creator audience demographics & Brand alignment...",
    "Brainstorming 3 tailored creative hooks & content concepts...",
    "Structuring production timeline & tier-based pricing packages...",
    "Synthesizing alignment score & crafting 3 email subject lines..."
  ];

  useEffect(() => {
    let interval;
    if (isGenerating) {
      setCurrentProgressStep(0);
      interval = setInterval(() => {
        setCurrentProgressStep(prev => (prev < progressSteps.length - 1 ? prev + 1 : prev));
      }, 900);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleStartGeneration = async () => {
    await onGenerate();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // confetti fallback
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-700 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30">
              Step 3 of 4
            </span>
            <h2 className="text-xl font-bold">Pitch Strategy & Generation</h2>
          </div>
          <p className="text-sm text-brand-100 mt-1 max-w-xl">
            Configure the tone, length, and strategic focus of your proposal. Our AI models inject your actual credentials directly into the pitch.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-2 rounded-xl border border-white/20">
          <span className="font-medium text-brand-100">Pitching:</span>
          <span className="font-bold text-white">{brandInfo.brandName || 'Target Brand'}</span>
        </div>
      </div>

      {/* Target Synergy Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-700">
            {profile.name?.slice(0, 2).toUpperCase() || 'CR'}
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">{profile.name || 'Creator'}</div>
            <div className="text-slate-500">{profile.niche} &bull; {profile.metrics?.totalReach || 'Verified'} Reach</div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-slate-400 font-semibold">
          <span>&times;</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Partnership
          </span>
          <span>&times;</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-bold text-slate-900 dark:text-white text-sm">{brandInfo.brandName || 'Brand'}</div>
            <div className="text-slate-500">{brandInfo.industry || 'Sponsor'}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center font-bold text-brand-600 dark:text-brand-400 text-sm border border-brand-200 dark:border-brand-800">
            {brandInfo.brandName?.slice(0, 2).toUpperCase() || 'BR'}
          </div>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-8">
        {/* Tone Selection */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <Sliders className="w-5 h-5 text-brand-500" />
            Proposal Tone
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {TONE_OPTIONS.map((item) => {
              const Icon = item.icon;
              const isSelected = config.tone === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setConfig({ ...config, tone: item.id })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 shadow-sm ring-1 ring-brand-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`} />
                    <span className={`text-sm font-bold ${isSelected ? 'text-brand-900 dark:text-brand-200' : 'text-slate-900 dark:text-white'}`}>
                      {item.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <Mail className="w-5 h-5 text-indigo-500" />
            Deliverable Format & Length
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {FORMAT_OPTIONS.map((item) => {
              const isSelected = config.format === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setConfig({ ...config, format: item.id })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-bold ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-900 dark:text-white'}`}>
                      {item.label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Custom Instructions */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Custom Prompt Directives (Optional)
          </label>
          <input
            type="text"
            value={config.customInstructions || ''}
            onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
            placeholder="e.g. Emphasize creator's high newsletter click-through rate; suggest Q3 back-to-school timing"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
          />
        </div>
      </div>

      {/* Generation Loading State Animation */}
      {isGenerating && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-brand-300 dark:border-brand-800 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/60 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Generating Tailored Collaboration Proposal...
              </h4>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                {progressSteps[currentProgressStep]}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-500 to-indigo-500 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${((currentProgressStep + 1) / progressSteps.length) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isGenerating}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Brand
        </button>

        <button
          type="button"
          onClick={handleStartGeneration}
          disabled={isGenerating}
          className="flex items-center gap-2.5 px-8 py-3 text-sm font-bold text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 rounded-xl transition-all shadow-xl shadow-brand-500/30 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Crafting Proposal...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Collaboration Pitch
            </>
          )}
        </button>
      </div>
    </div>
  );
}
