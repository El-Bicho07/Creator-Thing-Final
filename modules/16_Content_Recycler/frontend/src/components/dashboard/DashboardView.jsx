import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { 
  Users, TrendingUp, Sparkles, FolderGit2, ArrowRight, 
  RotateCw, Eye, Bookmark, Share2, Layers, PlaySquare, Image, RefreshCw, AlertCircle
} from 'lucide-react';
import StatCard from '../common/StatCard';
import { RecommendationBadge, MediaTypeBadge } from '../common/Badge';
import { postsAPI, recommendationsAPI } from '../../services/api';

const COLORS = ['#A3E635', '#38BDF8', '#818CF8', '#F43F5E'];

export default function DashboardView({ onNavigate, onOpenScoreModal }) {
  const [stats, setStats] = useState(null);
  const [recSummary, setRecSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, recRes] = await Promise.all([
        postsAPI.getStats(),
        recommendationsAPI.getAll({ limit: 5 })
      ]);

      if (statsRes.data?.success) {
        setStats(statsRes.data.stats);
      }
      if (recRes.data?.success) {
        setRecSummary(recRes.data.summary);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Could not connect to analytics backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RotateCw className="w-8 h-8 text-lime-accent animate-spin" />
        <p className="text-sm text-slate-400">Computing creator baseline & performance analytics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center bg-charcoal-900 border border-slate-800 rounded-3xl max-w-lg mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">Analytics Unavailable</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">{error || 'No records found.'}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 text-sm font-semibold text-white transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return (num || 0).toLocaleString();
  };

  const recyclingCounts = recSummary?.counts || { REPOST: 0, REWORK: 0, REPURPOSE: 0, ARCHIVE: 0 };
  const primeOpportunities = (recyclingCounts.REPOST || 0) + (recyclingCounts.REPURPOSE || 0);

  // Pie chart data
  const pieData = (stats.mediaTypeBreakdown || []).map(item => ({
    name: item.name,
    value: item.count,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Welcome Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl card-glass border border-slate-800/80 overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-muted border border-lime-500/30 text-lime-bright text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            AI Intelligence Briefing
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Revitalize your historical Instagram archive
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Identified <strong className="text-lime-accent">{primeOpportunities} high-potential posts</strong> ready for re-entry. 
            Recycling evergreen assets yields up to 80% of original reach with zero new scriptwriting.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => onNavigate('recommendations')}
              className="py-2.5 px-5 rounded-xl bg-lime-accent hover:bg-lime-bright text-charcoal-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-glow-lime transition-all"
            >
              Explore AI Recommendations
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('similarity')}
              className="py-2.5 px-4 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 text-slate-200 font-semibold text-xs sm:text-sm border border-slate-700 transition-colors"
            >
              Thematic Bundler
            </button>
          </div>
        </div>

        {/* Decorative Glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-lime-accent/5 to-transparent pointer-events-none" />
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Historical Posts"
          value={stats.totalPosts}
          subvalue="Synthetic demonstration set"
          icon={FolderGit2}
          badgeText="Verified"
        />
        <StatCard
          title="Cumulative Reach"
          value={formatNumber(stats.totalReach)}
          subvalue={`${formatNumber(stats.totalViews)} total impressions`}
          icon={Eye}
          trend="+14.2% vs last cycle"
          trendPositive={true}
        />
        <StatCard
          title="Creator Baseline ER"
          value={`${stats.avgEngagementRate}%`}
          subvalue={`σ = ±${stats.baselineStandardDeviation || '0.8'}% standard deviation`}
          icon={TrendingUp}
          highlight={true}
        />
        <StatCard
          title="Recycling Candidates"
          value={primeOpportunities}
          subvalue={`${recyclingCounts.REPOST} Repost • ${recyclingCounts.REPURPOSE} Repurpose`}
          icon={Sparkles}
          badgeText="High ROI"
        />
      </div>

      {/* Analytical Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Reach & Engagement Timeline (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-3xl card-glass border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-lime-accent" />
                Historical Reach & Engagement Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Timeline distribution of organic reach across ingested posts
              </p>
            </div>
            <span className="text-[11px] font-mono text-lime-bright bg-lime-muted px-2 py-0.5 rounded border border-lime-500/30">
              Mean: {formatNumber(Math.round(stats.totalReach / (stats.totalPosts || 1)))} / post
            </span>
          </div>

          <div className="h-64 w-full">
            {stats.performanceTimeline?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.performanceTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A3E635" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#A3E635" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="#475569" 
                    tick={{ fontSize: 11, fill: '#94A3B8' }} 
                  />
                  <YAxis 
                    stroke="#475569" 
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#111722', 
                      borderColor: '#1E293B', 
                      borderRadius: '12px',
                      color: '#F8FAFC' 
                    }}
                    formatter={(val) => [val.toLocaleString(), 'Reach']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="reach" 
                    stroke="#A3E635" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#reachGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Timeline requires at least 2 dated posts
              </div>
            )}
          </div>
        </div>

        {/* Media Type Breakdown (1 Column) */}
        <div className="p-6 rounded-3xl card-glass border border-slate-800/80 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Content Format Distribution
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Portfolio split across post formats
            </p>
          </div>

          <div className="h-52 w-full my-auto flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#111722', 
                      borderColor: '#1E293B', 
                      borderRadius: '12px',
                      color: '#F8FAFC' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-800/80">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-slate-300 truncate">{d.name}</span>
                <span className="text-white font-bold ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Tactical Recycling Matrix Overview */}
      <div className="p-6 rounded-3xl card-glass border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lime-accent" />
              Tactical Recycling Portfolio Split
            </h3>
            <p className="text-xs text-slate-400">
              Categorized by engagement velocity, dormant half-life, and topic evergreen propensity
            </p>
          </div>
          <button
            onClick={() => onNavigate('recommendations')}
            className="text-xs font-semibold text-lime-bright hover:text-white flex items-center gap-1 transition-colors"
          >
            View all {stats.totalPosts} evaluated posts <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          <div 
            onClick={() => onNavigate('recommendations')}
            className="p-4 rounded-2xl bg-charcoal-850/80 border border-lime-500/30 hover:border-lime-500/60 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-lime-bright uppercase tracking-wider">Repost</span>
              <RefreshCw className="w-4 h-4 text-lime-accent" />
            </div>
            <h4 className="text-2xl font-black text-white mt-2">{recyclingCounts.REPOST}</h4>
            <p className="text-[11px] text-slate-400 mt-1">High ER + dormant &gt;60d</p>
          </div>

          <div 
            onClick={() => onNavigate('recommendations')}
            className="p-4 rounded-2xl bg-charcoal-850/80 border border-amber-500/30 hover:border-amber-500/60 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Rework</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <h4 className="text-2xl font-black text-white mt-2">{recyclingCounts.REWORK}</h4>
            <p className="text-[11px] text-slate-400 mt-1">High reach, weak hook/CTA</p>
          </div>

          <div 
            onClick={() => onNavigate('recommendations')}
            className="p-4 rounded-2xl bg-charcoal-850/80 border border-cyan-500/30 hover:border-cyan-500/60 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Repurpose</span>
              <PlaySquare className="w-4 h-4 text-cyan-400" />
            </div>
            <h4 className="text-2xl font-black text-white mt-2">{recyclingCounts.REPURPOSE}</h4>
            <p className="text-[11px] text-slate-400 mt-1">Image/Carousel &rarr; Reel</p>
          </div>

          <div 
            onClick={() => onNavigate('recommendations')}
            className="p-4 rounded-2xl bg-charcoal-850/80 border border-slate-700/50 hover:border-slate-600 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Archive</span>
              <FolderGit2 className="w-4 h-4 text-slate-500" />
            </div>
            <h4 className="text-2xl font-black text-white mt-2">{recyclingCounts.ARCHIVE}</h4>
            <p className="text-[11px] text-slate-400 mt-1">Outdated / Low traction</p>
          </div>

        </div>
      </div>

      {/* Top Performing Historical Posts */}
      <div className="p-6 rounded-3xl card-glass border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-lime-accent" />
              Top Historical Performers (Highest Bookmark & Save Velocity)
            </h3>
            <p className="text-xs text-slate-400">
              Posts that generated the highest audience intent and value retention
            </p>
          </div>
          <button
            onClick={() => onNavigate('library')}
            className="text-xs font-semibold text-lime-bright hover:text-white transition-colors"
          >
            Explore Library &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-800/80">
          {(stats.topPerformingPosts || []).map((post) => (
            <div key={post.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-charcoal-850/40 p-3 rounded-2xl transition-colors">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <MediaTypeBadge type={post.mediaType} />
                  <span className="text-slate-400 text-[11px]">
                    {new Date(post.postDate).toLocaleDateString()}
                  </span>
                  <span className="text-lime-bright font-bold text-xs bg-lime-muted px-2 py-0.5 rounded border border-lime-500/20">
                    {post.calculatedER}% ER
                  </span>
                </div>
                <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">
                  {post.caption}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right text-xs">
                  <p className="text-white font-bold">{formatNumber(post.reach)} reach</p>
                  <p className="text-slate-400">{formatNumber(post.saves)} saves</p>
                </div>

                <button
                  onClick={() => onOpenScoreModal(post.id)}
                  className="px-3.5 py-2 rounded-xl bg-charcoal-800 hover:bg-lime-accent hover:text-charcoal-950 text-slate-200 text-xs font-bold transition-all border border-slate-700 hover:border-lime-bright flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Analyze
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
