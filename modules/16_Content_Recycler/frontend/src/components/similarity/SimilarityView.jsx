import React, { useState, useEffect } from 'react';
import { 
  Network, GitMerge, Sparkles, Layers, ArrowRight, 
  RotateCw, Sliders, CheckCircle2, Bookmark, Eye, Calendar, ExternalLink 
} from 'lucide-react';
import { MediaTypeBadge } from '../common/Badge';
import { similarityAPI, plannerAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export default function SimilarityView({ onNavigate }) {
  const { notify } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(0.28);
  const [activeTab, setActiveTab] = useState('clusters'); // 'clusters' or 'pairs'
  const [addingClusterId, setAddingClusterId] = useState(null);

  const fetchSimilarityData = async (thresh = threshold) => {
    setLoading(true);
    try {
      const res = await similarityAPI.getAnalysis(thresh);
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
      notify('Failed to run similarity vectorizer', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimilarityData(threshold);
  }, []);

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setThreshold(val);
  };

  const handleSliderRelease = () => {
    fetchSimilarityData(threshold);
  };

  const handleAddClusterToPlanner = async (cluster) => {
    setAddingClusterId(cluster.clusterId);
    try {
      const d = new Date();
      d.setDate(d.getDate() + 5);

      await plannerAPI.createItem({
        postId: cluster.posts[0]?.id || `CLUSTER_${Date.now()}`,
        postSnapshot: {
          caption: `[THEMATIC BUNDLE]: ${cluster.title}. Synthesizing ${cluster.postCount} related posts.`,
          mediaType: 'CAROUSEL',
          reach: cluster.aggregateReach,
          saves: cluster.aggregateSaves,
          hashtags: cluster.keywords,
        },
        recommendationType: 'REPURPOSE',
        targetFormat: cluster.suggestedFormat.includes('CAROUSEL') ? 'CAROUSEL' : 'REEL',
        plannedDate: d.toISOString(),
        notes: `Synergy Bundle: Merge ${cluster.posts.length} historical posts into an authoritative guide. Keywords: ${cluster.keywords.join(', ')}`,
        status: 'planned',
      });

      notify(`Cluster "${cluster.title}" scheduled to Content Planner!`, 'success');
    } catch (err) {
      notify('Failed to add cluster to planner', 'error');
    } finally {
      setAddingClusterId(null);
    }
  };

  const handleAddPairToPlanner = async (pair) => {
    try {
      const d = new Date();
      d.setDate(d.getDate() + 4);

      await plannerAPI.createItem({
        postId: pair.postA.id,
        postSnapshot: {
          caption: `[REPURPOSE PAIR]: ${pair.postA.caption.slice(0, 60)}... + ${pair.postB.caption.slice(0, 60)}...`,
          mediaType: 'CAROUSEL',
          reach: (pair.postA.reach || 0) + (pair.postB.reach || 0),
          saves: (pair.postA.saves || 0) + (pair.postB.saves || 0),
          hashtags: pair.sharedKeywords,
        },
        recommendationType: 'REPURPOSE',
        targetFormat: 'CAROUSEL',
        plannedDate: d.toISOString(),
        notes: pair.repurposingSuggestion,
        status: 'planned',
      });

      notify('Similar post pair scheduled to Content Planner!', 'success');
    } catch (err) {
      notify('Failed to add pair to planner', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Intro Header */}
      <div className="p-6 rounded-3xl card-glass border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-lime-accent animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-lime-bright">
              Zero-Cost Pure JS NLP Engine
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-lime-accent" />
            TF-IDF Semantic Overlap & Carousel Bundler
          </h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Identifies conceptual overlaps across your Instagram captions and hashtags using Inverse Document Frequency and Cosine Vector Similarity. Groups related single-idea posts into high-value masterclass Carousels or Reel series.
          </p>
        </div>

        {/* Sensitivity Slider */}
        <div className="p-4 rounded-2xl bg-charcoal-850/90 border border-slate-800 min-w-[260px] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-lime-accent" />
              Similarity Threshold
            </span>
            <span className="text-white font-mono font-bold">{(threshold * 100).toFixed(0)}%</span>
          </div>

          <input
            type="range"
            min="0.15"
            max="0.55"
            step="0.01"
            value={threshold}
            onChange={handleSliderChange}
            onMouseUp={handleSliderRelease}
            onTouchEnd={handleSliderRelease}
            className="w-full accent-lime-accent bg-charcoal-800 h-2 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Broad Clusters (15%)</span>
            <span>Tight Match (55%)</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center p-1 rounded-2xl bg-charcoal-900 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('clusters')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'clusters'
                ? 'bg-lime-accent text-charcoal-950 font-bold shadow-glow-lime'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            Thematic Synergy Clusters
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-charcoal-950/20 font-bold">
              {data?.totalClustersFound || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pairs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'pairs'
                ? 'bg-lime-accent text-charcoal-950 font-bold shadow-glow-lime'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Pairwise Semantic Overlaps
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-charcoal-950/20 font-bold">
              {data?.totalPairsFound || 0}
            </span>
          </button>
        </div>

        <button
          onClick={() => fetchSimilarityData(threshold)}
          className="p-2 rounded-xl text-slate-400 hover:text-white bg-charcoal-900 border border-slate-800 hover:border-slate-700 transition-colors"
          title="Recompute Matrix"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-lime-accent' : ''}`} />
        </button>
      </div>

      {/* Content Body */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <RotateCw className="w-8 h-8 text-lime-accent animate-spin" />
          <p className="text-xs text-slate-400">Computing TF-IDF vector matrix & cosine similarities...</p>
        </div>
      ) : activeTab === 'clusters' ? (
        /* CLUSTERS VIEW */
        <div className="space-y-6">
          {(!data?.clusters || data.clusters.length === 0) ? (
            <div className="p-12 text-center rounded-3xl card-glass border border-slate-800/80">
              <Network className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-white">No multi-post clusters found at this sensitivity</p>
              <p className="text-xs text-slate-400 mt-1">
                Try dragging the similarity threshold slider to the left (e.g. 20%) to discover broader topic connections.
              </p>
            </div>
          ) : (
            data.clusters.map((cluster) => (
              <div
                key={cluster.clusterId}
                className="p-6 rounded-3xl card-glass border border-slate-800/80 hover:border-lime-500/40 transition-all space-y-5"
              >
                
                {/* Cluster Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-lime-muted text-lime-bright border border-lime-500/30">
                        {cluster.suggestedFormat}
                      </span>
                      <span className="text-xs text-slate-400">
                        {cluster.postCount} connected historical posts
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {cluster.title}
                    </h3>
                  </div>

                  {/* Aggregate Metrics & Planner CTA */}
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs">
                      <p className="text-slate-400">Combined Reach</p>
                      <p className="text-white font-mono font-bold text-sm">
                        {cluster.aggregateReach?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-slate-400">Cumulative Saves</p>
                      <p className="text-lime-bright font-mono font-bold text-sm">
                        {cluster.aggregateSaves?.toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAddClusterToPlanner(cluster)}
                      disabled={addingClusterId === cluster.clusterId}
                      className="py-2.5 px-4 rounded-xl bg-lime-accent hover:bg-lime-bright text-charcoal-950 font-bold text-xs flex items-center gap-2 shadow-glow-lime transition-all whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {addingClusterId === cluster.clusterId ? 'Scheduling...' : 'Bundle in Planner'}
                    </button>
                  </div>
                </div>

                {/* Strategic Repurposing Rationale */}
                <div className="p-3.5 rounded-2xl bg-charcoal-850/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <strong className="text-lime-bright uppercase tracking-wider text-[10px] mr-1.5">
                    Recycling Rationale:
                  </strong>
                  {cluster.strategicRationale}
                </div>

                {/* Sub-posts included in Cluster */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {cluster.posts.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-charcoal-900/90 border border-slate-800/80 text-xs space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <MediaTypeBadge type={p.mediaType} />
                          <span className="text-[10px] text-slate-500">
                            {new Date(p.postDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-200 line-clamp-2 italic">
                          "{p.caption}"
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>{p.reach?.toLocaleString()} reach</span>
                        <span className="text-lime-bright font-semibold">{p.saves?.toLocaleString()} saves</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))
          )}
        </div>
      ) : (
        /* PAIRWISE OVERLAPS VIEW */
        <div className="space-y-4">
          {(!data?.topPairs || data.topPairs.length === 0) ? (
            <div className="p-12 text-center rounded-3xl card-glass border border-slate-800/80">
              <Network className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-white">No pairwise matches at {Math.round(threshold * 100)}% threshold</p>
              <p className="text-xs text-slate-400 mt-1">Lower the slider to find looser semantic associations.</p>
            </div>
          ) : (
            data.topPairs.map((pair, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl card-glass border border-slate-800/80 space-y-4"
              >
                {/* Pair Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-lime-muted text-lime-bright border border-lime-500/30">
                      {pair.similarityPercentage}% Semantic Match
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {pair.sharedKeywords.map((kw, ki) => (
                        <span key={ki} className="text-[10px] px-2 py-0.5 rounded-md bg-charcoal-800 text-slate-300">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddPairToPlanner(pair)}
                    className="py-1.5 px-3 rounded-lg bg-charcoal-800 hover:bg-lime-accent hover:text-charcoal-950 text-slate-200 text-xs font-bold transition-all border border-slate-700 hover:border-lime-bright flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Schedule Pair
                  </button>
                </div>

                {/* Side by side comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-charcoal-850/80 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Post A ({pair.postA.id})</span>
                      <MediaTypeBadge type={pair.postA.mediaType} />
                    </div>
                    <p className="text-slate-200 line-clamp-3 italic">"{pair.postA.caption}"</p>
                    <p className="text-[11px] text-slate-400 font-mono pt-1">
                      {pair.postA.reach?.toLocaleString()} reach • {pair.postA.saves?.toLocaleString()} saves
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-charcoal-850/80 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Post B ({pair.postB.id})</span>
                      <MediaTypeBadge type={pair.postB.mediaType} />
                    </div>
                    <p className="text-slate-200 line-clamp-3 italic">"{pair.postB.caption}"</p>
                    <p className="text-[11px] text-slate-400 font-mono pt-1">
                      {pair.postB.reach?.toLocaleString()} reach • {pair.postB.saves?.toLocaleString()} saves
                    </p>
                  </div>
                </div>

                {/* Repurpose Strategy */}
                <div className="p-3 rounded-xl bg-charcoal-900 border border-lime-500/20 text-xs text-lime-bright flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-lime-accent" />
                  <span className="text-slate-200 font-medium">
                    <strong className="text-lime-bright">AI Repurpose Suggestion:</strong> {pair.repurposingSuggestion}
                  </span>
                </div>

              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
