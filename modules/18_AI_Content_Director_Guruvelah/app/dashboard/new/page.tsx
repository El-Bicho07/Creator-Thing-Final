'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/db/client';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Stepper } from '@/components/ui/Stepper';
import {
  Flame,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertCircle,
  Video,
  Target,
  Clock,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

const PLATFORMS = ['Instagram Reels', 'YouTube Shorts', 'TikTok', 'YouTube', 'LinkedIn', 'X'];
const GOALS = [
  'Increase Reach',
  'Build Authority',
  'Educate',
  'Generate Engagement',
  'Build Personal Brand',
  'Promote Product',
  'Generate Leads',
  'Drive Followers',
];
const DURATIONS = [15, 30, 45, 60, 90, 180, 300];

export default function CreateContentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stageMessage, setStageMessage] = useState('');

  // Step 1 Inputs
  const [topic, setTopic] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [lifecycleHint, setLifecycleHint] = useState('Not sure');

  // Step 2 Trend Brief Data
  const [trendAnalysis, setTrendAnalysis] = useState<any>(null);
  const [trendId, setTrendId] = useState<string | null>(null);

  // Step 3 Strategy Inputs
  const [platform, setPlatform] = useState('Instagram Reels');
  const [goal, setGoal] = useState('Increase Reach');
  const [durationSec, setDurationSec] = useState(30);

  // User Profile
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('creator_profiles').select('*').eq('user_id', user.id).single();
          if (data) {
            setProfile(data);
            if (data.platform) setPlatform(data.platform);
          }
        }
      } catch (err) {
        // Handled silently
      }
    }

    // Read prefilled query parameters if user clicked a trend from dashboard
    const params = new URLSearchParams(window.location.search);
    const prefilledTopic = params.get('topic');
    const prefilledSource = params.get('sourceText');
    if (prefilledTopic) setTopic(prefilledTopic);
    if (prefilledSource) setSourceText(prefilledSource);

    loadProfile();
  }, []);

  // STEP 1 -> STEP 2: Analyze Trend
  const handleAnalyzeTrend = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a trend topic or headline');
      return;
    }

    setLoading(true);
    setStageMessage('Analyzing trend brief...');

    try {
      const res = await fetch('/api/analyze-trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          sourceText: sourceText.trim() || undefined,
          lifecycleHint: lifecycleHint !== 'Not sure' ? lifecycleHint : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Trend analysis failed');
      }

      setTrendAnalysis(data.analysis);
      setTrendId(data.trendId);
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || 'Error analyzing trend');
    } finally {
      setLoading(false);
      setStageMessage('');
    }
  };

  // STEP 3: Generate Content Package via NDJSON Stream
  const handleGeneratePackage = async () => {
    setLoading(true);
    setStageMessage('Starting pipeline...');

    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trendId,
          topic: topic.trim(),
          sourceText: sourceText.trim() || undefined,
          lifecycleHint: lifecycleHint !== 'Not sure' ? lifecycleHint : undefined,
          platform,
          goal,
          durationSec: platform === 'LinkedIn' || platform === 'X' ? undefined : durationSec,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error?.message || 'Generation failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      let generationId = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim().length > 0);

        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.type === 'stage' && event.message) {
              setStageMessage(event.message);
            } else if (event.type === 'result') {
              generationId = event.generationId;
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('Unexpected token')) {
              throw e;
            }
          }
        }
      }

      toast.success('Content package generated!');
      if (generationId && generationId !== 'temp-id') {
        router.push(`/dashboard/generation/${generationId}`);
      } else {
        router.push('/dashboard/history');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate package');
    } finally {
      setLoading(false);
      setStageMessage('');
    }
  };

  const steps = [{ title: 'Input Trend' }, { title: 'Trend Brief' }, { title: 'Strategy & Generate' }];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Header />
        <main className="p-6 max-w-4xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create Content Package</h1>
              <p className="text-xs text-zinc-400">
                Turn a raw trend into a personalized creator package in 3 simple steps.
              </p>
            </div>
          </div>

          <Stepper steps={steps} currentStep={step} onStepClick={(s) => s < step && setStep(s)} />

          {/* STEP 1: Enter Trend */}
          {step === 1 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" /> Step 1: What trend do you want to cover?
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Enter a topic, headline, or paste source text from an article or tweet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Trend Topic / Headline *</label>
                  <Input
                    placeholder="e.g. AI Coding Agents like Google Antigravity"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Pasted Source Text / Snippets (Optional - Treat as source of truth)
                  </label>
                  <Textarea
                    placeholder="Paste tweet text, news headline, or article excerpt..."
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    rows={4}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">How new is this trend?</label>
                  <select
                    value={lifecycleHint}
                    onChange={(e) => setLifecycleHint(e.target.value)}
                    className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  >
                    <option value="Not sure">Not sure / Let AI judge</option>
                    <option value="Just emerging">Just emerging</option>
                    <option value="Rising">Rising</option>
                    <option value="At its peak">At its peak</option>
                    <option value="Fading">Fading</option>
                    <option value="Evergreen">Evergreen</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex justify-end">
                  <Button onClick={handleAnalyzeTrend} disabled={loading} className="btn-primary-gradient">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {stageMessage || 'Analyzing...'}
                      </>
                    ) : (
                      <>
                        Analyze Trend <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Review Trend Brief */}
          {step === 2 && trendAnalysis && (
            <Card className="bg-zinc-900 border-zinc-800 space-y-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="accent">{trendAnalysis.category || 'General'}</Badge>
                  <Badge variant="outline" className="text-xs">
                    Lifecycle: {trendAnalysis.lifecycle?.stage || 'unknown'}
                  </Badge>
                </div>
                <CardTitle className="text-xl text-zinc-100">{trendAnalysis.trendTitle}</CardTitle>
                <CardDescription className="text-zinc-300 leading-relaxed">
                  {trendAnalysis.explanation}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Low Confidence Notice */}
                {trendAnalysis.knowledgeConfidence === 'low' && (
                  <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">New or obscure trend noticed</span>
                      This trend may be too recent for full AI pre-training knowledge. Pasting a headline or source excerpt yields higher quality angles.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
                    <h4 className="text-xs font-semibold text-indigo-400">Why People Care</h4>
                    <p className="text-sm text-zinc-300">{trendAnalysis.whyPeopleCare}</p>
                  </div>
                  <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
                    <h4 className="text-xs font-semibold text-emerald-400">Audience Relevance</h4>
                    <p className="text-sm text-zinc-300">{trendAnalysis.audienceRelevance}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Content Opportunities</h4>
                  <ul className="space-y-1.5 text-sm text-zinc-300">
                    {trendAnalysis.contentOpportunities?.map((opp: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)} className="border-zinc-800">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="btn-primary-gradient">
                    Proceed to Strategy <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Choose Strategy & Generate */}
          {step === 3 && (
            <Card className="bg-zinc-900 border-zinc-800 space-y-4">
              <CardHeader>
                <CardTitle className="text-lg">Step 3: Strategy & Platform Parameters</CardTitle>
                <CardDescription className="text-zinc-400">
                  Select platform and goal to generate your personalized creator angle, hooks, and script.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Creator Profile Chip */}
                {profile && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <UserCheck className="w-5 h-5 text-indigo-400" />
                      <div>
                        <span className="font-semibold text-zinc-200">{profile.niche} Creator</span>
                        <span className="text-zinc-500 block">Targeting {profile.target_audience}</span>
                      </div>
                    </div>
                    <Link href="/dashboard/profile" className="text-indigo-400 hover:underline">
                      Edit Profile
                    </Link>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300">Target Platform</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PLATFORMS.map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPlatform(p)}
                        className={`p-3 rounded-xl border text-sm font-semibold transition ${
                          platform === p
                            ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300">Content Goal</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {GOALS.map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => setGoal(g)}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-center transition ${
                          goal === g
                            ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {platform !== 'LinkedIn' && platform !== 'X' && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Target Video Duration</label>
                    <div className="flex flex-wrap gap-2">
                      {DURATIONS.map((d) => (
                        <button
                          type="button"
                          key={d}
                          onClick={() => setDurationSec(d)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                            durationSec === d
                              ? 'bg-indigo-600 text-white'
                              : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          {d >= 60 ? `${d / 60}m` : `${d}s`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress Overlay */}
                {loading && (
                  <div className="p-6 bg-zinc-950 border border-indigo-500/30 rounded-xl space-y-3 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                    <div className="font-semibold text-zinc-200 text-sm" aria-live="polite">
                      {stageMessage || 'Packaging your content...'}
                    </div>
                    <p className="text-xs text-zinc-500">
                      Generating personalized angle equation, 7 hooks, script timeline & derived shot list.
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-zinc-800 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)} disabled={loading} className="border-zinc-800">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={handleGeneratePackage} disabled={loading} className="btn-primary-gradient px-8">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" /> Generate Content Package
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
