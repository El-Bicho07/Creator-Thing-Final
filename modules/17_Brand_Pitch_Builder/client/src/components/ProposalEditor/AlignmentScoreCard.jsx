import React from 'react';
import { Target, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

export function AlignmentScoreCard({ alignmentScore, alignmentSummary, keyOverlapPoints }) {
  const score = alignmentScore || 92;

  // Determine badge color
  const colorClass = score >= 90
    ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
    : score >= 80
    ? 'text-indigo-500 border-indigo-500/30 bg-indigo-500/10'
    : 'text-amber-500 border-amber-500/30 bg-amber-500/10';

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <Target className="w-6 h-6 text-brand-300" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              Audience & Brand Alignment Index
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-brand-500/30 text-brand-300 border border-brand-400/30">
                Verified Fit
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Demographic overlap, audience psychographics & buyer intent analysis
            </p>
          </div>
        </div>

        {/* Visual Score Badge */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className={`px-4 py-2 rounded-xl border flex items-baseline gap-1 ${colorClass}`}>
            <span className="text-2xl font-black">{score}%</span>
            <span className="text-xs font-semibold">Synergy</span>
          </div>
        </div>
      </div>

      {alignmentSummary && (
        <p className="text-sm text-slate-200 leading-relaxed font-normal">
          {alignmentSummary}
        </p>
      )}

      {keyOverlapPoints && keyOverlapPoints.length > 0 && (
        <div className="pt-2">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-300 mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            Core Synergy Catalysts
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {keyOverlapPoints.map((point, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
