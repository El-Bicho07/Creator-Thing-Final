'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { IntroScreen } from '@/components/intro/IntroScreen';
import {
  GoalOption,
  TimeOption,
  ToneOption,
  PlatformOption,
  PlanForm,
} from '@/types';
import { planEngine } from '@/lib/engine';
import { planRepository } from '@/lib/storage';
import { MotionButton, FadeIn } from '@/components/motion';
import {
  Sparkles,
  AlertCircle,
  Target,
  Clock,
  MessageSquare,
  Share2,
  ArrowRight,
  Youtube,
  Instagram,
  Linkedin,
  Twitter,
  Video,
} from 'lucide-react';

const GOAL_OPTIONS: { label: GoalOption; desc: string }[] = [
  { label: 'Get more subscribers', desc: 'Focus on broad discovery & high-conversion CTAs' },
  { label: 'Get more comments', desc: 'Spark debate, discussions, and viewer feedback' },
  { label: 'Promote something', desc: 'Drive traffic to your product, link, or sponsor' },
  { label: 'Teach something', desc: 'Step-by-step tutorial with actionable value' },
  { label: 'Build trust', desc: 'Behind the scenes story and authentic connection' },
];

const TIME_OPTIONS: { label: TimeOption; formatBadge: string; desc: string }[] = [
  { label: '15 min', formatBadge: 'Community Post', desc: 'Quick written update & poll' },
  { label: '45 min', formatBadge: 'Short / Reel', desc: 'Fast vertical video breakdown' },
  { label: 'A full shoot', formatBadge: 'Full Video', desc: 'Comprehensive video with thumbnail idea' },
];

const TONE_OPTIONS: ToneOption[] = ['Conversational', 'Professional', 'Funny'];

const PLATFORM_OPTIONS: { label: PlatformOption; icon: React.ElementType }[] = [
  { label: 'YouTube', icon: Youtube },
  { label: 'Instagram', icon: Instagram },
  { label: 'TikTok', icon: Video },
  { label: 'LinkedIn', icon: Linkedin },
  { label: 'X', icon: Twitter },
];

export default function CreatePlanPage() {
  const router = useRouter();
  const [showIntroModal, setShowIntroModal] = useState(false);

  const [niche, setNiche] = useState('');
  const [goal, setGoal] = useState<GoalOption>('Get more subscribers');
  const [time, setTime] = useState<TimeOption>('A full shoot');
  const [tone, setTone] = useState<ToneOption>('Conversational');
  const [platform, setPlatform] = useState<PlatformOption>('YouTube');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!niche.trim()) {
      setErrorMsg("Please enter your channel niche (e.g. 'Tech Reviews', 'Personal Finance', or 'Guitar Lessons') to generate your plan.");
      return;
    }

    setIsSubmitting(true);

    try {
      const form: PlanForm = {
        niche: niche.trim(),
        goal,
        time,
        tone,
        platform,
      };

      const plan = planEngine.generatePlan(form);
      await planRepository.savePlan(plan);
      router.push(`/plan/${plan.id}`);
    } catch (err) {
      console.error(err);
      setErrorMsg("We couldn't generate your plan right now. Please try clicking 'Generate' again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar onOpenIntro={() => setShowIntroModal(true)} />

      {showIntroModal && <IntroScreen isModal onDismiss={() => setShowIntroModal(false)} />}

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 sm:py-12">
        <FadeIn>
          <div className="space-y-8">
            {/* Page Header */}
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow text-navy border-2 border-navy text-xs font-bold shadow-block-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Step 1 of 2 — Create Today&apos;s Plan
              </div>
              <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-navy tracking-tight">
                Tell us about your content
              </h1>
              <p className="text-muted text-sm sm:text-base">
                Niche is all we need. Everything else has sensible defaults ready to go.
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-red-light border-3 border-red text-red flex items-start gap-3 shadow-block-red"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm font-semibold">{errorMsg}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8 bg-card p-6 sm:p-8 rounded-card border-4 border-navy shadow-block-lg">
              {/* 1. NICHE INPUT */}
              <div className="space-y-2">
                <label htmlFor="niche-input" className="block font-heading font-extrabold text-navy text-base sm:text-lg flex items-center justify-between">
                  <span>1. What is your niche? <span className="text-orange">*</span></span>
                  <span className="text-xs font-sans font-semibold text-muted">Required</span>
                </label>
                <input
                  id="niche-input"
                  type="text"
                  value={niche}
                  onChange={(e) => {
                    setNiche(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="e.g. Personal Finance, Desk Setups, Indie Game Dev, Vegan Cooking..."
                  className="w-full px-4 py-3.5 rounded-xl border-3 border-border bg-bg text-ink text-base font-semibold focus:border-navy focus:bg-card transition-colors placeholder:text-muted/60"
                  autoFocus
                />
              </div>

              {/* 2. GOAL SELECTION */}
              <div className="space-y-3">
                <label className="block font-heading font-extrabold text-navy text-base sm:text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange" />
                  2. What is your primary goal for today?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {GOAL_OPTIONS.map((g) => {
                    const isSelected = goal === g.label;
                    return (
                      <button
                        key={g.label}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setGoal(g.label)}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-navy bg-navy text-white shadow-block-orange'
                            : 'border-border bg-bg text-ink hover:border-navy'
                        }`}
                      >
                        <div className="font-heading font-bold text-sm">{g.label}</div>
                        <div className={`text-xs mt-1 ${isSelected ? 'text-lightblue' : 'text-muted'}`}>{g.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. TIME AVAILABLE */}
              <div className="space-y-3">
                <label className="block font-heading font-extrabold text-navy text-base sm:text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow shrink-0" />
                  3. How much time do you have today?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TIME_OPTIONS.map((t) => {
                    const isSelected = time === t.label;
                    return (
                      <button
                        key={t.label}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setTime(t.label)}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between min-h-[96px] ${
                          isSelected
                            ? 'border-navy bg-orange text-white shadow-block-navy'
                            : 'border-border bg-bg text-ink hover:border-navy'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-heading font-extrabold text-base">{t.label}</span>
                          </div>
                          <p className={`text-xs mt-1 ${isSelected ? 'text-white/90' : 'text-muted'}`}>{t.desc}</p>
                        </div>
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md mt-2 self-start border ${
                          isSelected ? 'bg-navy text-yellow border-navy' : 'bg-lightblue/30 text-navy border-lightblue'
                        }`}>
                          {t.formatBadge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. TONE */}
              <div className="space-y-3">
                <label className="block font-heading font-extrabold text-navy text-base sm:text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-lightblue shrink-0" />
                  4. Pick a video tone
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {TONE_OPTIONS.map((t) => {
                    const isSelected = tone === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setTone(t)}
                        className={`px-4 py-2.5 rounded-xl font-heading font-bold text-sm border-2 transition-all min-h-[44px] ${
                          isSelected
                            ? 'border-navy bg-yellow text-navy shadow-block-navy'
                            : 'border-border bg-bg text-ink hover:border-navy'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. PLATFORM */}
              <div className="space-y-3">
                <label className="block font-heading font-extrabold text-navy text-base sm:text-lg flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-red shrink-0" />
                  5. Target Platform (Default: YouTube)
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {PLATFORM_OPTIONS.map((p) => {
                    const Icon = p.icon;
                    const isSelected = platform === p.label;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setPlatform(p.label)}
                        className={`px-4 py-2.5 rounded-xl font-heading font-bold text-sm border-2 flex items-center gap-2 transition-all min-h-[44px] ${
                          isSelected
                            ? 'border-navy bg-navy text-white shadow-block-orange'
                            : 'border-border bg-bg text-ink hover:border-navy'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-yellow' : 'text-muted'}`} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t-2 border-border">
                <MotionButton
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-block-orange w-full py-4 rounded-xl font-heading font-black text-lg flex items-center justify-center gap-3 shadow-block-navy"
                >
                  {isSubmitting ? (
                    <span>Generating today&apos;s plan...</span>
                  ) : (
                    <>
                      <span>Generate today&apos;s content plan</span>
                      <ArrowRight className="w-6 h-6" />
                    </>
                  )}
                </MotionButton>
              </div>
            </form>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}
