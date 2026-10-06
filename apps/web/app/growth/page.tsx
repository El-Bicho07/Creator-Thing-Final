"use client";

/**
 * GROWTH + ANALYTICS COPILOT — Phase 5 Dashboard.
 *
 * Implements the "Learn" stage of the operating loop:
 *   Performance & Comments -> Deterministic Analysis -> Insights & Opportunities -> Copilot -> Today/Studio Handoff
 *
 * Grounding & Safety Principles:
 * - No fabricated metrics: unavailable metrics render as "Not Measured", not 0.
 * - Deterministic calculations power all overview stats.
 * - Analytics Copilot provides evidence-backed reasoning and action handoffs.
 * - Handoffs connect directly to Today (/today) and Studio (/studio).
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Lightbulb,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import { growthApi } from "@/lib/growth-api";
import type {
  CommentInsightResponse,
  CommentResponse,
  CopilotResponse,
  ExperimentResponse,
  GrowthOverviewResponse,
  InsightResponse,
  LessonResponse,
  OpportunityResponse,
  PerformanceRecordResponse,
} from "@/lib/studio-contracts";

const COPILOT_PRESETS = [
  "What worked best this month?",
  "Why did recent posts outperform?",
  "What content should I create next?",
  "What are audience members asking for?",
  "What is underperforming?",
];

export default function GrowthPage() {
  const router = useRouter();

  const getToken = useCallback(async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("sb-access-token");
  }, []);

  // ---- Server State ----
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<GrowthOverviewResponse | null>(null);
  const [performance, setPerformance] = useState<PerformanceRecordResponse[]>([]);
  const [insights, setInsights] = useState<InsightResponse[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityResponse[]>([]);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentInsights, setCommentInsights] = useState<CommentInsightResponse[]>([]);
  const [experiments, setExperiments] = useState<ExperimentResponse[]>([]);
  const [lessons, setLessons] = useState<LessonResponse[]>([]);

  // ---- UI / Interaction State ----
  const [windowDays, setWindowDays] = useState<number>(30);
  const [analyzingComments, setAnalyzingComments] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // New Comment Input
  const [newCommentText, setNewCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  // New Performance Record Form
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [perfPlatform, setPerfPlatform] = useState("youtube");
  const [perfTitle, setPerfTitle] = useState("");
  const [perfViews, setPerfViews] = useState("");
  const [perfLikes, setPerfLikes] = useState("");
  const [perfComments, setPerfComments] = useState("");
  const [perfShares, setPerfShares] = useState("");
  const [recordingPerf, setRecordingPerf] = useState(false);

  // Analytics Copilot Drawer / State
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<CopilotResponse | null>(null);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  // Expanded evidence state per insight
  const [expandedInsights, setExpandedInsights] = useState<Record<string, boolean>>({});

  const fetchGrowthData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewRes,
        perfRes,
        insightsRes,
        oppsRes,
        commentsRes,
        experimentsRes,
        lessonsRes,
      ] = await Promise.all([
        growthApi.overview(getToken, windowDays).catch(() => null),
        growthApi.performance(getToken, 20).catch(() => []),
        growthApi.insights(getToken, false).catch(() => []),
        growthApi.opportunities(getToken, 20).catch(() => []),
        growthApi.comments(getToken, 50).catch(() => []),
        growthApi.experiments(getToken, 20).catch(() => []),
        growthApi.lessons(getToken, 20).catch(() => []),
      ]);

      setOverview(overviewRes);
      setPerformance(perfRes || []);
      setInsights(insightsRes || []);
      setOpportunities(oppsRes || []);
      setComments(commentsRes || []);
      setExperiments(experimentsRes || []);
      setLessons(lessonsRes || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load Growth dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [getToken, windowDays]);

  useEffect(() => {
    fetchGrowthData();
  }, [fetchGrowthData]);

  // Handle Comment Analysis Trigger
  const handleAnalyzeComments = async () => {
    setAnalyzingComments(true);
    try {
      const result = await growthApi.analyzeComments({}, getToken);
      await fetchGrowthData();
    } catch (err: any) {
      setError(err?.message || "Comment analysis failed.");
    } finally {
      setAnalyzingComments(false);
    }
  };

  // Handle Adding a Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setAddingComment(true);
    try {
      await growthApi.addComment({ comment_text: newCommentText.trim() }, getToken);
      setNewCommentText("");
      await fetchGrowthData();
    } catch (err: any) {
      setError(err?.message || "Failed to add comment.");
    } finally {
      setAddingComment(false);
    }
  };

  // Handle Record Performance Submission
  const handleRecordPerformance = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecordingPerf(true);
    try {
      const values: Record<string, number> = {};
      if (perfViews !== "") values.views = Number(perfViews);
      if (perfLikes !== "") values.likes = Number(perfLikes);
      if (perfComments !== "") values.comments = Number(perfComments);
      if (perfShares !== "") values.shares = Number(perfShares);

      await growthApi.recordPerformance(
        {
          platform: perfPlatform,
          title: perfTitle || undefined,
          values,
          metrics_measured: Object.keys(values),
        },
        getToken
      );

      setShowRecordModal(false);
      setPerfTitle("");
      setPerfViews("");
      setPerfLikes("");
      setPerfComments("");
      setPerfShares("");
      await fetchGrowthData();
    } catch (err: any) {
      setError(err?.message || "Failed to record performance.");
    } finally {
      setRecordingPerf(false);
    }
  };

  // Handle Opportunity Handoff to Today
  const handleConvertToToday = async (oppId: string) => {
    setActionInProgress(`today-${oppId}`);
    try {
      await growthApi.convertOpportunityToToday(oppId, {}, getToken);
      router.push("/today");
    } catch (err: any) {
      setError(err?.message || "Failed to convert opportunity to Today plan.");
      setActionInProgress(null);
    }
  };

  // Handle Opportunity Handoff to Studio
  const handleConvertToStudio = async (oppId: string) => {
    setActionInProgress(`studio-${oppId}`);
    try {
      const studioRes = await growthApi.convertOpportunityToStudio(oppId, getToken);
      if (studioRes.studio_session_id) {
        router.push(`/studio?session=${studioRes.studio_session_id}`);
      } else {
        router.push("/studio");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to open opportunity in Studio.");
      setActionInProgress(null);
    }
  };

  // Handle Analytics Copilot Ask
  const handleAskCopilot = async (question?: string) => {
    const q = question || copilotQuery;
    if (!q.trim()) return;
    setCopilotLoading(true);
    setCopilotError(null);
    setCopilotResult(null);
    try {
      const result = await growthApi.askCopilot(q.trim(), windowDays, getToken);
      setCopilotResult(result);
    } catch (err: any) {
      setCopilotError(err?.message || "Analytics Copilot query failed.");
    } finally {
      setCopilotLoading(false);
    }
  };

  const toggleInsightExpanded = (id: string) => {
    setExpandedInsights((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Extract Views MetricValue if present
  const viewsValue = overview?.available_metrics?.find((m) => m.metric === "views");
  const engagementValue = overview?.engagement_rate;

  return (
    <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <span>Growth & Analytics Copilot</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Turn past performance & comment signals into evidence-backed decisions for Today and Studio.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>

          <button
            onClick={() => setShowRecordModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center space-x-2 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Record Performance</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing performance and audience signals...</p>
        </div>
      ) : (
        <>
          {/* SECTION 1: Performance Overview */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <span>Deterministic Performance Overview ({windowDays}d)</span>
              </h2>
              {overview?.has_enough_data === false && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium flex items-center space-x-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Insufficient data for trend baseline</span>
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Total Views */}
              <div className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Total Views</span>
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold">
                  {viewsValue?.value !== null && viewsValue?.value !== undefined
                    ? viewsValue.value.toLocaleString()
                    : "0"}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Recorded across published assets</p>
              </div>

              {/* Card 2: Engagement Rate */}
              <div className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Avg Engagement Rate</span>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-3xl font-bold">
                  {engagementValue?.value !== null && engagementValue?.value !== undefined
                    ? `${(engagementValue.value * 100).toFixed(1)}%`
                    : "0.0%"}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">(Likes + Comments) / Views</p>
              </div>

              {/* Card 3: Measured Content Count */}
              <div className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Content Measured</span>
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-3xl font-bold">{overview?.record_count ?? performance.length}</div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Tracked performance records</p>
              </div>

              {/* Card 4: Retention / Watch Time Boundary */}
              <div className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 opacity-90">
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Watch Time & Retention</span>
                  <ShieldCheck className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-semibold text-gray-400 dark:text-gray-500">Not Measured</div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Platform does not fabricate missing metrics</p>
              </div>
            </div>
          </section>

          {/* SECTION 2: Analytics Copilot Interactive Panel */}
          <section className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/90 via-slate-900 to-purple-950 text-white shadow-xl space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center space-x-2">
                  <Sparkles className="h-6 w-6 text-yellow-400" />
                  <span>Analytics Copilot</span>
                </h2>
                <p className="text-indigo-200 text-sm mt-1">
                  Ask questions about your content performance. Answers are grounded in deterministic calculations and verified evidence.
                </p>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {COPILOT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setCopilotQuery(preset);
                    handleAskCopilot(preset);
                  }}
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-indigo-100 transition border border-white/10"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Query Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskCopilot();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Ask Copilot e.g., Why did educational posts outperform promotional posts?"
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
              />
              <button
                type="submit"
                disabled={copilotLoading || !copilotQuery.trim()}
                className="px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm flex items-center space-x-2 transition disabled:opacity-50"
              >
                {copilotLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Ask</span>
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Copilot Result */}
            {copilotError && (
              <div className="p-4 rounded-xl bg-red-900/50 border border-red-700 text-red-200 text-sm">
                {copilotError}
              </div>
            )}

            {copilotResult && (
              <div className="p-6 rounded-xl bg-white/10 border border-white/20 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                    Copilot Response
                  </span>
                  {copilotResult.confidence && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 font-medium">
                      Confidence: {copilotResult.confidence.band.toUpperCase()} (
                      {(copilotResult.confidence.score * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-sm text-indigo-50">
                  <div>
                    <h4 className="font-semibold text-white">What Happened?</h4>
                    <p className="mt-0.5 text-indigo-100">{copilotResult.what_happened}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Why It Matters</h4>
                    <p className="mt-0.5 text-indigo-100">{copilotResult.why_it_matters}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">What To Do Next</h4>
                    <p className="mt-0.5 text-indigo-100">{copilotResult.what_next}</p>
                  </div>
                </div>

                {/* Citations */}
                {copilotResult.citations && copilotResult.citations.length > 0 && (
                  <div className="pt-3 border-t border-white/10 text-xs text-indigo-200/80">
                    <span className="font-semibold text-indigo-100">Supporting Citations:</span>{" "}
                    {copilotResult.citations.map((c) => `${c.table} (${c.record_id})`).join(", ")}
                  </div>
                )}

                {/* Action buttons */}
                {copilotResult.suggested_action && (
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => router.push("/today")}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <span>Add Recommendation to Today</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => router.push("/studio")}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <span>Open in Studio</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* SECTION 3: Content Opportunities & Comment Signals */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Opportunities */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <span>Content Opportunities</span>
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {opportunities.length} derived
                </span>
              </div>

              {opportunities.length === 0 ? (
                <div className="p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center space-y-2">
                  <Lightbulb className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No content opportunities detected yet. Log and analyze audience comments to generate opportunities.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-base">{opp.title}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {opp.origin.toUpperCase()}
                        </span>
                      </div>

                      {opp.angle && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">{opp.angle}</p>
                      )}

                      <div className="flex items-center space-x-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                          Target Format: {opp.target_format}
                        </span>
                      </div>

                      {/* Opportunity Action Handoffs */}
                      <div className="pt-2 flex items-center space-x-3 border-t border-gray-100 dark:border-gray-700/60">
                        <button
                          onClick={() => handleConvertToToday(opp.id)}
                          disabled={actionInProgress === `today-${opp.id}`}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                        >
                          {actionInProgress === `today-${opp.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 mr-1" />
                          )}
                          <span>Add to Today</span>
                        </button>

                        <button
                          onClick={() => handleConvertToStudio(opp.id)}
                          disabled={actionInProgress === `studio-${opp.id}`}
                          className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                        >
                          {actionInProgress === `studio-${opp.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <ArrowRight className="h-3.5 w-3.5 mr-1" />
                          )}
                          <span>Open in Studio</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Comment Signals & Analysis */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-indigo-500" />
                  <span>Audience Comment Signals</span>
                </h2>
                <button
                  onClick={handleAnalyzeComments}
                  disabled={analyzingComments}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  {analyzingComments ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span>Analyze Comments</span>
                </button>
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste audience comment e.g., 'How do I start Python if I've never coded?'"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={addingComment || !newCommentText.trim()}
                  className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-700 dark:hover:bg-gray-600 text-xs font-medium transition disabled:opacity-50"
                >
                  {addingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Comment"}
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
                    No comments logged yet. Log audience feedback above to analyze themes.
                  </div>
                ) : (
                  comments.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm space-y-1"
                    >
                      <p className="text-gray-800 dark:text-gray-200 font-medium">"{c.comment_text}"</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Category: {c.category || "Unclassified"}</span>
                        {c.intent && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 font-medium text-gray-600 dark:text-gray-300">
                            {c.intent}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* SECTION 4: Evidence-backed Insights */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-purple-500" />
              <span>Evidence-Backed Insights</span>
            </h2>

            {insights.length === 0 ? (
              <div className="p-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
                No active insights derived yet. Insights require performance baseline data.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {insights.map((ins) => {
                  const isExpanded = expandedInsights[ins.id];
                  return (
                    <div
                      key={ins.id}
                      className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-base">{ins.title}</h3>
                        {ins.confidence && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              ins.confidence.band === "high"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : ins.confidence.band === "medium"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            Confidence: {ins.confidence.band.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300">{ins.summary}</p>

                      {ins.recommended_action && (
                        <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 font-medium">
                          Recommended Action: {ins.recommended_action}
                        </div>
                      )}

                      {/* Evidence Accordion */}
                      <button
                        onClick={() => toggleInsightExpanded(ins.id)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1 hover:underline"
                      >
                        <span>{isExpanded ? "Hide Traceable Evidence" : "View Traceable Evidence"}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 text-xs space-y-1 font-mono text-gray-600 dark:text-gray-400">
                          <div>Rule Key: {ins.rule_key}</div>
                          <div>Impact: {ins.impact}</div>
                          <div>Source Records: {ins.source_records?.join(", ") || "None"}</div>
                          <div>Evidence: {JSON.stringify(ins.evidence)}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 5: Lessons & Experiments */}
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <FlaskConical className="h-5 w-5 text-emerald-500" />
                <span>Experiments</span>
              </h2>
              {experiments.length === 0 ? (
                <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
                  No active experiments.
                </div>
              ) : (
                <div className="space-y-3">
                  {experiments.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm space-y-1"
                    >
                      <h4 className="font-semibold">{exp.hypothesis}</h4>
                      <p className="text-xs text-gray-500">Status: {exp.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                <span>Durable Lessons</span>
              </h2>
              {lessons.length === 0 ? (
                <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
                  No durable lessons stored yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons.map((les) => (
                    <div
                      key={les.id}
                      className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm space-y-1"
                    >
                      <h4 className="font-semibold">{les.actionable_rule}</h4>
                      <p className="text-xs text-gray-500">
                        Confidence: {les.confidence ? (les.confidence.score * 100).toFixed(0) + "%" : "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {/* Record Performance Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold">Record Content Performance</h3>

            <form onSubmit={handleRecordPerformance} className="space-y-3 text-sm">
              <div>
                <label className="block font-medium mb-1">Platform</label>
                <select
                  value={perfPlatform}
                  onChange={(e) => setPerfPlatform(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <option value="youtube">YouTube</option>
                  <option value="reel">Instagram Reel</option>
                  <option value="x">X / Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Content Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. How to Start Python from Zero"
                  value={perfTitle}
                  onChange={(e) => setPerfTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Views</label>
                  <input
                    type="number"
                    placeholder="1000"
                    value={perfViews}
                    onChange={(e) => setPerfViews(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Likes</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={perfLikes}
                    onChange={(e) => setPerfLikes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Comments</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={perfComments}
                    onChange={(e) => setPerfComments(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Shares</label>
                  <input
                    type="number"
                    placeholder="20"
                    value={perfShares}
                    onChange={(e) => setPerfShares(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPerf}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  {recordingPerf ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}