import React, { useState } from 'react';
import { X, Calendar, Sparkles, TrendingUp, Clock, BookOpen, Layers, Check, ArrowRight } from 'lucide-react';
import { RecommendationBadge, MediaTypeBadge } from './Badge';

export default function ScoreModal({ postAnalysis, isOpen, onClose, onAddToPlanner }) {
  if (!isOpen || !postAnalysis) return null;

  const { post, recommendationType, compositeScore, targetFormat, metrics, breakdown, explainability } = postAnalysis;
  const [plannedDate, setPlannedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [selectedFormat, setSelectedFormat] = useState(targetFormat || 'REEL');
  const [notes, setNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const handlePlanSubmit = async () => {
    setIsAdding(true);
    try {
      await onAddToPlanner({
        postId: post.originalId || post._id,
        postSnapshot: {
          caption: post.caption,
          mediaType: post.mediaType,
          postDate: post.postDate,
          reach: post.reach,
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          saves: post.saves,
          hashtags: post.hashtags,
          calculatedER: metrics?.calculatedER,
        },
        recommendationType,
        targetFormat: selectedFormat,
        plannedDate,
        notes: notes || explainability?.tacticalAdvice,
        hookRevision: '',
        status: 'planned',
      });
      setAddedSuccess(true);
      setTimeout(() => {
        setAddedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-charcoal-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-start justify-between bg-charcoal-850">
          <div className="flex items-center gap-3">
            <RecommendationBadge type={recommendationType} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Score Analysis & Intelligence
              </h2>
              <p className="text-xs text-slate-400">
                Explainable AI heuristic breakdown for post {post.originalId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-charcoal-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Post Snippet */}
          <div className="p-4 rounded-2xl bg-charcoal-950/60 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <MediaTypeBadge type={post.mediaType} />
              <span>Published: {new Date(post.postDate).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-slate-200 line-clamp-3 italic">
              "{post.caption}"
            </p>
          </div>

          {/* Composite Opportunity Meter */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-charcoal-850 to-charcoal-900 border border-lime-500/20 shadow-glow-subtle flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-lime-bright">
                Recycling Opportunity Index
              </p>
              <h3 className="text-3xl font-extrabold text-white mt-1">
                {compositeScore} <span className="text-base font-normal text-slate-400">/ 100</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Target Recommended Format: <strong className="text-lime-accent">{selectedFormat}</strong>
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block p-4 rounded-2xl bg-lime-muted border border-lime-500/30 text-lime-bright">
                <Sparkles className="w-8 h-8" />
              </div>
            </div>
          </div>

          {/* Explainable Factor Progress Bars */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Explainable Scoring Breakdown
            </h4>

            {/* Performance Score */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <TrendingUp className="w-3.5 h-3.5 text-lime-accent" />
                  Historical Engagement Performance
                </span>
                <span className="text-white font-bold">{breakdown?.performanceScore || 0}%</span>
              </div>
              <div className="w-full h-2 bg-charcoal-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-lime-accent rounded-full transition-all duration-500"
                  style={{ width: `${breakdown?.performanceScore || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Post ER: {metrics?.calculatedER}% (Z-Score: {metrics?.zScore > 0 ? `+${metrics?.zScore}` : metrics?.zScore}σ vs creator average)
              </p>
            </div>

            {/* Reusability Score */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  Feed Freshness & Re-Exposure Safety
                </span>
                <span className="text-white font-bold">{breakdown?.reusabilityScore || 0}%</span>
              </div>
              <div className="w-full h-2 bg-charcoal-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full transition-all duration-500"
                  style={{ width: `${breakdown?.reusabilityScore || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {metrics?.ageDays} days since original post (Threshold: 60 days for zero audience fatigue)
              </p>
            </div>

            {/* Evergreen Confidence */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  Evergreen Topic Propensity
                </span>
                <span className="text-white font-bold">{breakdown?.evergreenConfidence || 0}%</span>
              </div>
              <div className="w-full h-2 bg-charcoal-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${breakdown?.evergreenConfidence || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Evaluated timeless concepts vs time-bound markers (discounts, holidays, live dates)
              </p>
            </div>

            {/* Format Score */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Repurposing Conversion Potential
                </span>
                <span className="text-white font-bold">{breakdown?.formatPotentialScore || 0}%</span>
              </div>
              <div className="w-full h-2 bg-charcoal-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                  style={{ width: `${breakdown?.formatPotentialScore || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                High bookmark density ({post.saves?.toLocaleString()} saves) qualifies for short-form video or carousel expansion
              </p>
            </div>
          </div>

          {/* Reasoning & Tactical Playbook */}
          <div className="p-4 rounded-2xl bg-charcoal-850 border border-slate-800 space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Algorithmic Diagnosis
              </p>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed">
                {explainability?.primaryReason}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-lime-bright">
                Tactical Creator Playbook
              </p>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed">
                {explainability?.tacticalAdvice}
              </p>
            </div>
          </div>

          {/* Quick Schedule to Planner Box */}
          <div className="p-4 rounded-2xl bg-charcoal-950/80 border border-lime-500/30 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-lime-accent" />
              Schedule directly to Content Planner
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Target Format
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-charcoal-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-lime-accent"
                >
                  <option value="REEL">Reel (Short Video 30s-60s)</option>
                  <option value="CAROUSEL">Carousel (Multi-slide Guide)</option>
                  <option value="IMAGE">Single Infographic Image</option>
                  <option value="STORY_SERIES">Interactive Story Series</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Planned Date
                </label>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-charcoal-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-lime-accent"
                >
                </input>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Custom Production Notes / Revised Hook
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or updated 2026 hook idea..."
                rows="2"
                className="w-full px-3 py-2 rounded-xl bg-charcoal-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-lime-accent resize-none placeholder:text-slate-600"
              />
            </div>

            <button
              onClick={handlePlanSubmit}
              disabled={isAdding || addedSuccess}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                addedSuccess
                  ? 'bg-emerald-500 text-white'
                  : 'bg-lime-accent hover:bg-lime-bright text-charcoal-950 shadow-glow-lime'
              }`}
            >
              {addedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Scheduled in Planner!
                </>
              ) : isAdding ? (
                'Scheduling...'
              ) : (
                <>
                  Save to Content Planner
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
