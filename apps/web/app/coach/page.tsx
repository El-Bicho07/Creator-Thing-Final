"use client";

import React, { useState, useEffect } from "react";
import {
  Target,
  Award,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Send,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import {
  CoachGoal,
  CoachFeedback,
  LearningRecord,
  GoalCategory,
  LearningCategory,
  LearningStatus,
  listGoals,
  createGoal,
  evaluateGoalProgress,
  provideFeedback,
  recommendProducerAction,
  listLearnings,
  createLearning,
  applyCreatorCorrection,
  updateLearningStatus,
  CoachRecommendation,
} from "@/lib/coach-api";

// Dummy token provider for web app environment or local testing
const getMockToken = async (): Promise<string | null> => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("supabase_token") ?? "mock_jwt_token";
  }
  return "mock_jwt_token";
};

export default function CoachPage() {
  const [activeTab, setActiveTab] = useState<"goals" | "sessions" | "learnings">("goals");

  // Goals state
  const [goals, setGoals] = useState<CoachGoal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState<GoalCategory>("hook_retention");
  const [goalDescription, setGoalDescription] = useState("");
  const [recommendationMap, setRecommendationMap] = useState<Record<string, CoachRecommendation>>({});

  // Sessions / Feedback state
  const [sessionTopic, setSessionTopic] = useState("");
  const [draftText, setDraftText] = useState("");
  const [feedbacks, setFeedbacks] = useState<CoachFeedback[]>([]);
  const [analyzingFeedback, setAnalyzingFeedback] = useState(false);

  // Learning Vault state
  const [learnings, setLearnings] = useState<LearningRecord[]>([]);
  const [loadingLearnings, setLoadingLearnings] = useState(false);
  const [correctionTargetId, setCorrectionTargetId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [newLearningSummary, setNewLearningSummary] = useState("");
  const [newLearningCategory, setNewLearningCategory] = useState<LearningCategory>("creator_preference");

  // Error & Info messaging
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals();
    fetchLearnings();
  }, []);

  const fetchGoals = async () => {
    setLoadingGoals(true);
    try {
      const data = await listGoals(getMockToken);
      setGoals(data);
    } catch (err: any) {
      console.warn("Failed to fetch goals:", err);
    } finally {
      setLoadingGoals(false);
    }
  };

  const fetchLearnings = async () => {
    setLoadingLearnings(true);
    try {
      const data = await listLearnings(getMockToken);
      setLearnings(data);
    } catch (err: any) {
      console.warn("Failed to fetch learnings:", err);
    } finally {
      setLoadingLearnings(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    setErrorMessage(null);
    try {
      const newGoal = await createGoal(getMockToken, {
        title: goalTitle,
        category: goalCategory,
        description: goalDescription || undefined,
      });
      setGoals((prev) => [newGoal, ...prev]);
      setGoalTitle("");
      setGoalDescription("");
      setInfoMessage(`Goal "${newGoal.title}" created successfully.`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to create goal.");
    }
  };

  const handleEvaluateGoal = async (goalId: string) => {
    setErrorMessage(null);
    try {
      const updated = await evaluateGoalProgress(getMockToken, goalId);
      setGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)));
      setInfoMessage(`Evaluated progress for goal: ${updated.progress_status}`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to evaluate goal progress.");
    }
  };

  const handleRecommendAction = async (goalId: string) => {
    setErrorMessage(null);
    try {
      const rec = await recommendProducerAction(getMockToken, goalId);
      setRecommendationMap((prev) => ({ ...prev, [goalId]: rec }));
      setInfoMessage(`Recommendation generated for ${rec.recommendation_target.toUpperCase()}`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to generate recommendation.");
    }
  };

  const handleRequestFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftText.trim() && !sessionTopic.trim()) return;
    setAnalyzingFeedback(true);
    setErrorMessage(null);
    try {
      const fb = await provideFeedback(getMockToken, {
        session_topic: sessionTopic || "General Content Feedback",
        draft_text: draftText,
      });
      setFeedbacks((prev) => [fb, ...prev]);
      setDraftText("");
      setSessionTopic("");
      setInfoMessage("Coach feedback generated.");
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to generate feedback.");
    } finally {
      setAnalyzingFeedback(false);
    }
  };

  const handleUpdateStatus = async (learningId: string, status: LearningStatus) => {
    setErrorMessage(null);
    try {
      const updated = await updateLearningStatus(getMockToken, learningId, status);
      setLearnings((prev) => prev.map((l) => (l.id === learningId ? updated : l)));
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update learning status.");
    }
  };

  const handleApplyCorrection = async (learningId: string) => {
    if (!correctionText.trim()) return;
    setErrorMessage(null);
    try {
      const updated = await applyCreatorCorrection(getMockToken, {
        learning_id: learningId,
        correction_text: correctionText,
      });
      fetchLearnings();
      setCorrectionTargetId(null);
      setCorrectionText("");
      setInfoMessage("Creator correction saved with high authority.");
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to apply correction.");
    }
  };

  const handleCreateExplicitLearning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLearningSummary.trim()) return;
    setErrorMessage(null);
    try {
      const record = await createLearning(getMockToken, {
        category: newLearningCategory,
        summary: newLearningSummary,
        confidence: 1.0,
        status: "confirmed",
      });
      setLearnings((prev) => [record, ...prev]);
      setNewLearningSummary("");
      setInfoMessage("Explicit learning record saved.");
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save learning.");
    }
  };

  const progressBadge = (status: string) => {
    switch (status) {
      case "improving":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Improving</span>;
      case "stable":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Stable</span>;
      case "needs_attention":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Needs Attention</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Insufficient Evidence</span>;
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
            <Award className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            Coach & Learning Workspace
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Improve content skills, receive evidence-backed feedback, and curate durable creator learnings.
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 font-bold ml-4">✕</button>
        </div>
      )}
      {infoMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between">
          <span>{infoMessage}</span>
          <button onClick={() => setInfoMessage(null)} className="text-emerald-500 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-800 mb-8">
        <button
          onClick={() => setActiveTab("goals")}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "goals"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <Target className="h-4 w-4" /> Goals & Progress
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "sessions"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <MessageSquare className="h-4 w-4" /> Coaching Sessions
        </button>
        <button
          onClick={() => setActiveTab("learnings")}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "learnings"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <BookOpen className="h-4 w-4" /> Learning Vault
        </button>
      </div>

      {/* Tab 1: Goals & Progress */}
      {activeTab === "goals" && (
        <div className="space-y-8">
          {/* Create Goal Form */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Set Improvement Goal
            </h2>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Goal Title
                  </label>
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="e.g. Improve 3-second hook retention"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value as GoalCategory)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="hook_retention">Hook Retention</option>
                    <option value="storytelling">Storytelling</option>
                    <option value="audience_engagement">Audience Engagement</option>
                    <option value="cta_conversion">CTA Conversion</option>
                    <option value="workflow_consistency">Workflow Consistency</option>
                    <option value="content_pacing">Content Pacing</option>
                    <option value="general_improvement">General Improvement</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Description / Practice Context
                </label>
                <textarea
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  placeholder="Optional details on what you want to practice..."
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors"
              >
                Create Goal
              </button>
            </form>
          </div>

          {/* Goal List */}
          <div>
            <h2 className="text-xl font-bold mb-4">Active Goals</h2>
            {loadingGoals ? (
              <p className="text-gray-500 text-sm">Loading goals...</p>
            ) : goals.length === 0 ? (
              <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-900 text-center border border-dashed border-gray-300 dark:border-gray-800">
                <Target className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">No improvement goals defined yet.</p>
                <p className="text-gray-400 text-xs mt-1">Set a goal above to get tailored practice guidance.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {goal.category.replace("_", " ")}
                        </span>
                        {progressBadge(goal.progress_status)}
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{goal.description}</p>
                      )}
                    </div>

                    {/* Producer / Today Recommendation card if generated */}
                    {recommendationMap[goal.id] && (
                      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-indigo-700 dark:text-indigo-300">
                          <span>Handoff Target: {recommendationMap[goal.id].recommendation_target.toUpperCase()}</span>
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-gray-800 dark:text-gray-200">
                          <strong>Practice Prompt:</strong> {recommendationMap[goal.id].practice_prompt}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 italic">
                          Rationale: {recommendationMap[goal.id].rationale}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => handleEvaluateGoal(goal.id)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Evaluate
                      </button>
                      <button
                        onClick={() => handleRecommendAction(goal.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center gap-1"
                      >
                        <ArrowRight className="h-3.5 w-3.5" /> Handoff to Producer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Coaching Sessions & Feedback */}
      {activeTab === "sessions" && (
        <div className="space-y-8">
          {/* Request Feedback Form */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Request Structured Feedback
            </h2>
            <form onSubmit={handleRequestFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Topic / Area of Focus
                </label>
                <input
                  type="text"
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  placeholder="e.g. Critique my 30-second tech demo script hook"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Script / Content Draft Text
                </label>
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Paste your script draft or idea text here..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                />
              </div>
              <button
                type="submit"
                disabled={analyzingFeedback}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {analyzingFeedback ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Get Evidence-Backed Feedback
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Feedback History */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Feedback History</h2>
            {feedbacks.length === 0 ? (
              <p className="text-gray-500 text-sm">No feedback generated in this workspace session yet.</p>
            ) : (
              feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4"
                >
                  <h3 className="font-bold text-md text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Structured Coaching Response
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <span className="font-semibold text-gray-900 dark:text-white block mb-1">Observation</span>
                      <p className="text-gray-600 dark:text-gray-300 text-xs">{fb.observation}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <span className="font-semibold text-gray-900 dark:text-white block mb-1">Why It Matters</span>
                      <p className="text-gray-600 dark:text-gray-300 text-xs">{fb.why_it_matters}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <span className="font-semibold text-gray-900 dark:text-white block mb-1">What to Improve</span>
                      <p className="text-gray-600 dark:text-gray-300 text-xs">{fb.what_to_improve}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <span className="font-semibold text-gray-900 dark:text-white block mb-1">How to Practice</span>
                      <p className="text-gray-600 dark:text-gray-300 text-xs">{fb.how_to_practice}</p>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-0.5">What to Try Next</span>
                    <p className="text-gray-800 dark:text-gray-200">{fb.what_to_try_next}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Learning Vault */}
      {activeTab === "learnings" && (
        <div className="space-y-8">
          {/* Explicit Learning Form */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Add Explicit Creator Preference / Learning
            </h2>
            <form onSubmit={handleCreateExplicitLearning} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newLearningCategory}
                    onChange={(e) => setNewLearningCategory(e.target.value as LearningCategory)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="creator_preference">Creator Preference</option>
                    <option value="content_strength">Content Strength</option>
                    <option value="content_weakness">Content Weakness</option>
                    <option value="workflow_pattern">Workflow Pattern</option>
                    <option value="audience_pattern">Audience Pattern</option>
                    <option value="skill_progress">Skill Progress</option>
                    <option value="lesson">Lesson</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Learning Summary
                  </label>
                  <input
                    type="text"
                    value={newLearningSummary}
                    onChange={(e) => setNewLearningSummary(e.target.value)}
                    placeholder="e.g. I explicitly prefer dark mode code demos without voiceover."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors"
              >
                Save Creator Learning
              </button>
            </form>
          </div>

          {/* Learning Records List */}
          <div>
            <h2 className="text-xl font-bold mb-4">Durable Creator Learnings</h2>
            {loadingLearnings ? (
              <p className="text-gray-500 text-sm">Loading learnings...</p>
            ) : learnings.length === 0 ? (
              <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-900 text-center border border-dashed border-gray-300 dark:border-gray-800">
                <BookOpen className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">No learning records curated yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {learnings.map((lr) => (
                  <div
                    key={lr.id}
                    className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {lr.category.replace("_", " ")}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          lr.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : lr.status === "rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {lr.status}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> {lr.source}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{lr.summary}</p>
                    </div>

                    {/* Actions & Creator Correction */}
                    <div className="flex items-center gap-2">
                      {lr.status === "candidate" && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(lr.id, "confirmed")}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(lr.id, "rejected")}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 flex items-center gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setCorrectionTargetId(correctionTargetId === lr.id ? null : lr.id)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200"
                      >
                        Correct
                      </button>
                    </div>

                    {/* Inline Correction Form */}
                    {correctionTargetId === lr.id && (
                      <div className="w-full mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                        <input
                          type="text"
                          value={correctionText}
                          onChange={(e) => setCorrectionText(e.target.value)}
                          placeholder="Provide explicit correction..."
                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs"
                        />
                        <button
                          onClick={() => handleApplyCorrection(lr.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium"
                        >
                          Submit Correction
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}