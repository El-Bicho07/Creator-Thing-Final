'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  MessageSquare, 
  Sparkles, 
  Layers, 
  Flame,
  Video,
  Image,
  Share2,
  Lightbulb
} from 'lucide-react';
import { InsightsResponse } from '@/types';

interface InsightsViewProps {
  insights: InsightsResponse | null;
  isLoading: boolean;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ insights, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#EAF6EE]/50 border border-[#E2EDE5]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-2xl bg-[#EAF6EE]/50 border border-[#E2EDE5]" />
          <div className="h-80 rounded-2xl bg-[#EAF6EE]/50 border border-[#E2EDE5]" />
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-center py-16 bg-white dark:bg-[#141E17] rounded-3xl border border-[#E2EDE5] dark:border-slate-800 p-8">
        <BarChart3 className="w-12 h-12 mx-auto text-[#3B8253] mb-3" />
        <h3 className="text-base font-bold text-[#152218] dark:text-white">
          No Insights Available
        </h3>
        <p className="text-xs text-[#5C6F62] mt-1 max-w-sm mx-auto">
          Run the comment analysis engine from the Idea Board to generate audience analytics.
        </p>
      </div>
    );
  }

  const {
    total_raw_comments,
    total_cleaned_comments,
    intent_distribution,
    top_themes,
    timeline,
    opportunity_stats,
    format_intent_matrix = [],
    format_takeaways = []
  } = insights;

  const kpis = [
    {
      label: 'Comments Analyzed',
      value: total_raw_comments,
      sub: 'Across 18 creator posts',
      icon: MessageSquare,
      bg: 'bg-[#EAF6EE] text-[#28663D] border-[#CDE9D5]'
    },
    {
      label: 'High-Signal Feedback',
      value: total_cleaned_comments,
      sub: 'Cleaned of spam & bots',
      icon: Sparkles,
      bg: 'bg-[#EAF6EE] text-[#28663D] border-[#CDE9D5]'
    },
    {
      label: 'New Content Gaps',
      value: opportunity_stats?.new_opportunity || 0,
      sub: `${opportunity_stats?.already_covered || 0} covered previously`,
      icon: Flame,
      bg: 'bg-[#EAF6EE] text-[#28663D] border-[#CDE9D5]'
    },
    {
      label: 'Friend @Mentions',
      value: format_intent_matrix.reduce((sum, item) => sum + (item.share_mentions || 0), 0),
      sub: 'Viral shareability signals',
      icon: Share2,
      bg: 'bg-[#EAF6EE] text-[#28663D] border-[#CDE9D5]'
    }
  ];

  // Prepare chart data for Format vs Intent Matrix
  const formatChartData = format_intent_matrix.map((f) => ({
    name: f.format.toUpperCase(),
    Questions: f.intent_counts?.question || 0,
    Requests: f.intent_counts?.request || 0,
    Confusion: f.intent_counts?.confusion || 0,
    PainPoints: f.intent_counts?.pain_point || 0,
    Praise: f.intent_counts?.praise || 0,
    Mentions: f.share_mentions || 0
  }));

  return (
    <div className="space-y-8">
      {/* KPI Cards (Clean White + Pista) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#5C6F62] dark:text-[#8FA596]">
                  {kpi.label}
                </span>
                <div className={`p-2 rounded-xl border ${kpi.bg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-[#152218] dark:text-white">
                  {kpi.value.toLocaleString()}
                </p>
                <p className="text-[11px] text-[#5C6F62] mt-0.5">
                  {kpi.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* POST-LEVEL ANALYSIS: Post Format vs Comment Type */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF6EE] text-[#28663D] border border-[#CDE9D5]">
                POST-LEVEL ANALYSIS
              </span>
              <h3 className="text-base font-bold text-[#152218] dark:text-white">
                Which Post Formats Generate Which Types of Comments?
              </h3>
            </div>
            <p className="text-xs text-[#5C6F62] dark:text-[#8FA596] mt-1">
              Correlating Reels, Carousels, and Static Images with audience response patterns
            </p>
          </div>
        </div>

        {/* Format Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {format_intent_matrix.map((fmt) => {
            const isReel = fmt.format.toLowerCase() === 'reel';
            const isCarousel = fmt.format.toLowerCase() === 'carousel';
            return (
              <div
                key={fmt.format}
                className="p-5 rounded-2xl bg-[#F8FAF8] dark:bg-[#19271E] border border-[#E2EDE5] dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAF6EE] text-[#28663D] border border-[#CDE9D5]">
                    {isReel ? <Video className="w-3.5 h-3.5" /> : isCarousel ? <Layers className="w-3.5 h-3.5" /> : <Image className="w-3.5 h-3.5" />}
                    {fmt.format.toUpperCase()}S
                  </span>
                  <span className="text-xs font-extrabold text-[#152218] dark:text-white">
                    {fmt.total_comments} comments
                  </span>
                </div>

                <div>
                  <p className="text-[11px] text-[#5C6F62]">Primary Signal</p>
                  <p className="text-sm font-bold text-[#152218] dark:text-white capitalize">
                    {fmt.top_intent.replace('_', ' ')}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E5EFE7] dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[#5C6F62] flex items-center gap-1">
                    <Share2 className="w-3 h-3 text-[#3B8253]" />
                    Share @mentions:
                  </span>
                  <span className="font-bold text-[#28663D] dark:text-[#93DBA6]">
                    {fmt.share_mentions}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grouped Bar Chart */}
        {formatChartData.length > 0 && (
          <div className="pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C6F62] mb-3">
              Intent Distribution by Post Format
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formatChartData} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-3 rounded-xl bg-white dark:bg-[#141E17] text-[#152218] dark:text-white text-xs shadow-lg border border-[#E2EDE5] space-y-1">
                            <p className="font-bold">{label}</p>
                            {payload.map((entry, idx) => (
                              <p key={idx} style={{ color: entry.color }}>
                                {entry.name}: {entry.value}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Questions" fill="#3B8253" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Requests" fill="#52B773" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Confusion" fill="#E5A855" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="PainPoints" fill="#D9534F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Praise" fill="#7CCB91" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Creator Content Strategy Takeaways */}
        {format_takeaways.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#EAF6EE] dark:bg-[#19271E] border border-[#CDE9D5] space-y-2">
            <h4 className="text-xs font-bold text-[#28663D] dark:text-[#93DBA6] flex items-center gap-1.5 uppercase tracking-wider">
              <Lightbulb className="w-3.5 h-3.5 text-[#3B8253]" />
              Creator Production Takeaways
            </h4>
            <ul className="space-y-1 text-xs text-[#152218] dark:text-[#E2EBE5] leading-relaxed">
              {format_takeaways.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Main Charts: Intent Donut + Themes Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intent Distribution Donut Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#152218] dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#3B8253]" />
                  Audience Intent Classification
                </h3>
                <p className="text-xs text-[#5C6F62] mt-0.5">
                  Breakdown including Hinglish requests & confusion
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={intent_distribution}
                    dataKey="count"
                    nameKey="intent"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {intent_distribution.map((entry, index) => {
                      const pistaColors = ['#3B8253', '#52B773', '#7CCB91', '#E5A855', '#D9534F', '#4B9CD3', '#8FA596', '#2F6A44'];
                      return <Cell key={`cell-${index}`} fill={pistaColors[index % pistaColors.length]} />;
                    })}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as any;
                        return (
                          <div className="p-2.5 rounded-xl bg-white dark:bg-[#141E17] text-[#152218] dark:text-white text-xs shadow-md border border-[#E2EDE5]">
                            <p className="font-bold capitalize">{data.intent}</p>
                            <p className="text-[#5C6F62]">
                              {data.count} comments ({data.percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Intent Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-[#E5EFE7] dark:border-slate-800">
            {intent_distribution.map((item, idx) => {
              const pistaColors = ['#3B8253', '#52B773', '#7CCB91', '#E5A855', '#D9534F', '#4B9CD3', '#8FA596', '#2F6A44'];
              const col = pistaColors[idx % pistaColors.length];
              return (
                <div key={item.intent} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: col }}
                  />
                  <span className="capitalize text-[#152218] dark:text-[#E2EBE5] font-medium truncate">
                    {item.intent}
                  </span>
                  <span className="text-[11px] text-[#5C6F62] font-bold ml-auto">
                    {item.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Themes Leaderboard */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#152218] dark:text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#3B8253]" />
                  Top Content Themes by Demand
                </h3>
                <p className="text-xs text-[#5C6F62] mt-0.5">
                  Ranked by unique commenters, likes, and intent score
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {top_themes.slice(0, 6).map((theme, idx) => (
                <div
                  key={theme.cluster_id}
                  className="p-3 rounded-2xl bg-[#F8FAF8] dark:bg-[#19271E] border border-[#E2EDE5] dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#EAF6EE] dark:bg-[#141E17] text-[#28663D] dark:text-[#93DBA6] font-bold text-xs flex items-center justify-center shrink-0 border border-[#CDE9D5]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#152218] dark:text-white truncate">
                        {theme.name}
                      </p>
                      <p className="text-[10px] text-[#5C6F62]">
                        {theme.unique_commenters} creators &bull; {theme.total_likes} likes
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-extrabold text-[#3B8253] dark:text-[#6EC886] shrink-0 bg-[#EAF6EE] dark:bg-[#141E17] px-2 py-0.5 rounded-full border border-[#CDE9D5]">
                    {theme.demand_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      {timeline.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#152218] dark:text-white">
              Comment Volume & Engagement Timeline
            </h3>
            <p className="text-xs text-[#5C6F62] mt-0.5">
              Tracking spikes in audience feedback across posts
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="pistaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B8253" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B8253" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="p-3 rounded-xl bg-white dark:bg-[#141E17] text-xs shadow-md border border-[#E2EDE5] space-y-1">
                          <p className="font-bold">{label}</p>
                          <p className="text-[#3B8253]">Comments: {payload[0]?.value}</p>
                          <p className="text-[#52B773]">Likes: {payload[1]?.value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="comment_count"
                  stroke="#3B8253"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#pistaGrad)"
                  name="Comments"
                />
                <Area
                  type="monotone"
                  dataKey="likes_count"
                  stroke="#52B773"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                  name="Likes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
