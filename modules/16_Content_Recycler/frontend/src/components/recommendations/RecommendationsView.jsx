import React, { useState, useEffect } from 'react';
import { 
  Sparkles, RefreshCw, Layers, Wrench, Archive, 
  ArrowRight, TrendingUp, Clock, BookOpen, RotateCw, Filter, SlidersHorizontal 
} from 'lucide-react';
import { RecommendationBadge, MediaTypeBadge } from '../common/Badge';
import { recommendationsAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export default function RecommendationsView({ onOpenScoreModal }) {
  const { notify } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('ALL');
  const [sortBy, setSortBy] = useState('compositeScore');

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await recommendationsAPI.getAll({
        type: selectedType,
        limit: 100,
      });
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
      notify('Failed to generate recommendations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [selectedType]);

  const summary = data?.summary;
  const counts = summary?.counts || { REPOST: 0, REWORK: 0, REPURPOSE: 0, ARCHIVE: 0 };
  const baseline = summary?.baseline;

  // Sorting
  const sortedRecommendations = [...(data?.recommendations || [])].sort((a, b) => {
    if (sortBy === 'compositeScore') return b.compositeScore - a.compositeScore;
    if (sortBy === 'er') return (b.metrics?.calculatedER || 0) - (a.metrics?.calculatedER || 0);
    if (sortBy === 'age') return (b.metrics?.ageDays || 0) - (a.metrics?.ageDays || 0);
    return 0;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Creator Baseline Diagnostic Bar */}
      {baseline && (
        <div className="p-5 rounded-3xl card-glass border border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-accent animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Creator Historical Baseline (Evaluated from {summary.totalAnalyzed} posts)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual post metrics are statistically normalized against your historical account performance.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-charcoal-850 border border-slate-700/60">
              <span className="text-slate-400">Mean ER:</span>{' '}
              <strong className="text-lime-bright">{baseline.meanER}%</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-charcoal-850 border border-slate-700/60">
              <span className="text-slate-400">Std Dev:</span>{' '}
              <strong className="text-slate-200">±{baseline.stdER}%</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-charcoal-850 border border-slate-700/60 hidden sm:block">
              <span className="text-slate-400">Avg Reach:</span>{' '}
              <strong className="text-slate-200">{baseline.meanReach?.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Category Filter Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-charcoal-900 border border-slate-800 text-xs overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Recommendations', count: summary?.totalAnalyzed || 0 },
            { id: 'REPOST', label: 'Repost', count: counts.REPOST, color: 'text-lime-bright' },
            { id: 'REWORK', label: 'Rework', count: counts.REWORK, color: 'text-amber-300' },
            { id: 'REPURPOSE', label: 'Repurpose', count: counts.REPURPOSE, color: 'text-cyan-300' },
            { id: 'ARCHIVE', label: 'Archive', count: counts.ARCHIVE, color: 'text-slate-400' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                selectedType === tab.id
                  ? 'bg-lime-accent text-charcoal-950 font-bold shadow-glow-lime'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedType === tab.id ? 'bg-charcoal-950/20 text-charcoal-950' : 'bg-charcoal-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-charcoal-900 border border-slate-800 text-xs text-slate-200 font-medium focus:outline-none focus:border-lime-accent"
          >
            <option value="compositeScore">Highest Opportunity Index</option>
            <option value="er">Highest Historical ER</option>
            <option value="age">Longest Dormant (Feed Freshness)</option>
          </select>
        </div>

      </div>

      {/* Recommendations Cards List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <RotateCw className="w-8 h-8 text-lime-accent animate-spin" />
          <p className="text-xs text-slate-400">Evaluating post decay vectors and evergreen propensity...</p>
        </div>
      ) : sortedRecommendations.length === 0 ? (
        <div className="p-12 text-center rounded-3xl card-glass border border-slate-800/80">
          <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">No posts match this category</p>
          <p className="text-xs text-slate-400 mt-1">Try switching tabs to view other recycling opportunities.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRecommendations.map((rec) => {
            const { post, recommendationType, compositeScore, targetFormat, metrics, breakdown, explainability } = rec;

            return (
              <div
                key={post.originalId || post._id}
                className="p-6 rounded-3xl card-glass border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6"
              >
                
                {/* Left: Badge, Post Caption & Diagnosis */}
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <RecommendationBadge type={recommendationType} size="md" />
                    <MediaTypeBadge type={post.mediaType} />
                    <span className="text-xs text-slate-400">
                      Posted: {new Date(post.postDate).toLocaleDateString()} ({metrics?.ageDays} days ago)
                    </span>
                    <span className="text-[11px] text-lime-bright font-mono bg-lime-muted px-2 py-0.5 rounded border border-lime-500/20">
                      Target: {targetFormat}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-100 line-clamp-2 leading-relaxed italic">
                    "{post.caption}"
                  </p>

                  <div className="p-3.5 rounded-2xl bg-charcoal-850/80 border border-slate-800 text-xs space-y-1">
                    <p className="text-slate-300">
                      <strong className="text-lime-bright uppercase tracking-wider text-[10px] mr-1.5">Diagnosis:</strong>
                      {explainability?.primaryReason}
                    </p>
                    <p className="text-slate-400">
                      <strong className="text-sky-400 uppercase tracking-wider text-[10px] mr-1.5">Action:</strong>
                      {explainability?.tacticalAdvice}
                    </p>
                  </div>
                </div>

                {/* Right: Score Ring & Action CTA */}
                <div className="flex sm:flex-row lg:flex-col items-center justify-between lg:justify-center gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                  
                  {/* Opportunity Score Meter */}
                  <div className="text-center">
                    <div className="inline-flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-charcoal-850 border border-lime-500/30 text-white shadow-glow-subtle">
                      <span className="text-xl font-black text-lime-bright leading-none">
                        {compositeScore}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-slate-500 mt-0.5">
                        ROI Index
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => onOpenScoreModal(post.originalId || post._id)}
                    className="py-2.5 px-4 rounded-xl bg-lime-accent hover:bg-lime-bright text-charcoal-950 font-bold text-xs flex items-center gap-1.5 shadow-glow-lime transition-all whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Inspect & Schedule
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
