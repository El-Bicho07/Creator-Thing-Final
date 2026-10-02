'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { IntroScreen } from '@/components/intro/IntroScreen';
import { PostCard } from '@/components/plan/PostCard';
import { Plan, PlanItem } from '@/types';
import { planRepository } from '@/lib/storage';
import { planEngine } from '@/lib/engine';
import { MotionButton, FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';
import {
  Sparkles,
  Copy,
  Download,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  Tag,
  Clock,
  Target,
  Trophy,
  Check,
  AlertTriangle,
} from 'lucide-react';

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params?.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIntroModal, setShowIntroModal] = useState(false);

  const [copiedPlan, setCopiedPlan] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  useEffect(() => {
    async function loadPlan() {
      if (!planId) return;
      try {
        const found = await planRepository.getPlan(planId);
        setPlan(found);
      } catch (err) {
        console.error('Failed to load plan', err);
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, [planId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-orange animate-spin mx-auto" />
            <p className="font-heading font-bold text-navy">Loading your content plan...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-card p-8 rounded-card border-4 border-navy shadow-block-lg max-w-md text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red mx-auto" />
            <h2 className="font-heading font-extrabold text-2xl text-navy">Plan Not Found</h2>
            <p className="text-muted text-sm">
              We couldn&apos;t find this content plan. It might have been deleted or not created yet.
            </p>
            <Link href="/create" className="inline-block">
              <MotionButton type="button" className="btn-block-orange px-6 py-3 rounded-xl font-bold text-sm">
                Create a new plan in 10 seconds
              </MotionButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const doneCount = plan.items.filter((i) => i.done).length;
  const totalCount = plan.items.length;
  const progressPercent = Math.round((doneCount / totalCount) * 100);
  const isAllDone = doneCount === totalCount && totalCount > 0;

  // Toggle item done
  const handleToggleDone = async (itemId: string) => {
    const updatedItems = plan.items.map((i) =>
      i.id === itemId ? { ...i, done: !i.done } : i
    );
    const updatedPlan = { ...plan, items: updatedItems };
    setPlan(updatedPlan);
    await planRepository.savePlan(updatedPlan);

    const newDoneCount = updatedItems.filter((i) => i.done).length;
    if (newDoneCount === totalCount && !celebrated) {
      setCelebrated(true);
    }
  };

  // Swap single item idea
  const handleSwapIdea = async (itemToSwap: PlanItem) => {
    const freshItem = planEngine.swapIdea(plan.form, itemToSwap);
    const updatedItems = plan.items.map((i) => (i.id === itemToSwap.id ? freshItem : i));
    const updatedPlan = { ...plan, items: updatedItems };
    setPlan(updatedPlan);
    await planRepository.savePlan(updatedPlan);
  };

  // New hook for single item
  const handleNewHook = async (itemToHook: PlanItem) => {
    const freshHook = planEngine.newHook(plan.form.niche, plan.form.tone, itemToHook.hook);
    const updatedItems = plan.items.map((i) =>
      i.id === itemToHook.id ? { ...i, hook: freshHook } : i
    );
    const updatedPlan = { ...plan, items: updatedItems };
    setPlan(updatedPlan);
    await planRepository.savePlan(updatedPlan);
  };

  // Update caption
  const handleUpdateCaption = async (itemId: string, newCaption: string) => {
    const updatedItems = plan.items.map((i) =>
      i.id === itemId ? { ...i, caption: newCaption } : i
    );
    const updatedPlan = { ...plan, items: updatedItems };
    setPlan(updatedPlan);
    await planRepository.savePlan(updatedPlan);
  };

  // Regenerate whole plan
  const handleRegenerateWholePlan = async () => {
    if (window.confirm("Regenerate the entire plan? This will replace all 3 post suggestions.")) {
      const nextSalt = (plan.salt || 0) + 1;
      const freshPlan = planEngine.generatePlan(plan.form, nextSalt);
      freshPlan.id = plan.id; // Keep existing plan ID
      setPlan(freshPlan);
      await planRepository.savePlan(freshPlan);
    }
  };

  // Copy full plan
  const handleCopyFullPlan = async () => {
    const header = `POSTTODAY CONTENT PLAN FOR ${plan.form.niche.toUpperCase()}\nDate: ${plan.date}\nGoal: ${plan.form.goal} | Format: ${plan.form.time} | Tone: ${plan.form.tone}\n========================================\n\n`;
    const postsText = plan.items
      .map(
        (item, idx) =>
          `[POST ${idx + 1}: ${item.slotName.toUpperCase()} - ${item.format}]\nTitle: ${item.title}\nAlt Title: ${item.altTitle}\n\nHook:\n${item.hook}\n\nDescription:\n${item.caption}\n\nBest Posting Time: ${item.best}\nTip: ${item.note}\n----------------------------------------`
      )
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(header + postsText);
      setCopiedPlan(true);
      setTimeout(() => setCopiedPlan(false), 2000);
    } catch {
      alert('Plan copied to clipboard!');
    }
  };

  // Download TXT
  const handleDownloadTXT = () => {
    const header = `POSTTODAY CONTENT PLAN FOR ${plan.form.niche.toUpperCase()}\nDate: ${plan.date}\nGoal: ${plan.form.goal} | Format: ${plan.form.time} | Tone: ${plan.form.tone}\n========================================\n\n`;
    const postsText = plan.items
      .map(
        (item, idx) =>
          `[POST ${idx + 1}: ${item.slotName.toUpperCase()} - ${item.format}]\nTitle: ${item.title}\nAlt Title: ${item.altTitle}\n\nHook:\n${item.hook}\n\nDescription:\n${item.caption}\n\nBest Posting Time: ${item.best}\nTip: ${item.note}\n----------------------------------------`
      )
      .join('\n\n');

    const blob = new Blob([header + postsText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PostToday_Plan_${plan.form.niche.replace(/\s+/g, '_')}_${plan.date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar onOpenIntro={() => setShowIntroModal(true)} />

      {showIntroModal && <IntroScreen isModal onDismiss={() => setShowIntroModal(false)} />}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:py-12 space-y-8">
        <FadeIn>
          {/* Top Bar Navigation & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-orange transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Today
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
              <MotionButton
                onClick={handleRegenerateWholePlan}
                type="button"
                className="btn-block-outline px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate plan
              </MotionButton>

              <MotionButton
                onClick={handleDownloadTXT}
                type="button"
                className="btn-block-outline px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-navy" />
                Download TXT
              </MotionButton>

              <MotionButton
                onClick={handleCopyFullPlan}
                type="button"
                className="btn-block-orange px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {copiedPlan ? <Check className="w-4 h-4 text-yellow" /> : <Copy className="w-4 h-4" />}
                {copiedPlan ? 'Copied full plan!' : 'Copy full plan'}
              </MotionButton>
            </div>
          </div>

          {/* Plan Summary Header */}
          <div className="bg-card p-6 sm:p-8 rounded-card border-4 border-navy shadow-block-lg space-y-6 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-muted">
                  <Calendar className="w-4 h-4 text-yellow" />
                  <span>{plan.date}</span>
                  <span>•</span>
                  <Tag className="w-4 h-4 text-navy" />
                  <span className="text-navy font-bold uppercase">{plan.form.niche}</span>
                </div>
                <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-navy">
                  Today&apos;s Content Plan
                </h1>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="px-3 py-1 rounded-xl bg-yellow text-navy border-2 border-navy flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  {plan.form.goal}
                </span>
                <span className="px-3 py-1 rounded-xl bg-orange text-white border-2 border-navy flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {plan.form.time}
                </span>
                <span className="px-3 py-1 rounded-xl bg-lightblue text-navy border-2 border-navy">
                  {plan.form.tone}
                </span>
              </div>
            </div>

            {/* Progress Bar & Celebratory Pop */}
            <div className="space-y-2 pt-2 border-t-2 border-border">
              <div className="flex items-center justify-between text-xs font-heading font-extrabold text-navy">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-orange" />
                  Progress: {doneCount} of {totalCount} posts finished
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-3 bg-bg rounded-full border-2 border-navy overflow-hidden p-0.5">
                <div
                  className="h-full bg-orange rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {isAllDone && (
                <div className="p-3.5 rounded-xl bg-yellow border-2 border-navy text-navy flex items-center gap-3 animate-bounce shadow-block-sm mt-3">
                  <Trophy className="w-6 h-6 text-orange shrink-0" />
                  <div>
                    <h4 className="font-heading font-black text-sm">🎉 Day complete! All posts uploaded & ticked off!</h4>
                    <p className="text-xs font-semibold text-navy/80">Great job staying consistent. See you back here tomorrow!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        {/* 3 Post Cards Staggered List */}
        <StaggerContainer className="space-y-6">
          {plan.items.map((item) => (
            <StaggerItem key={item.id}>
              <PostCard
                item={item}
                niche={plan.form.niche}
                tone={plan.form.tone}
                onToggleDone={handleToggleDone}
                onSwapIdea={handleSwapIdea}
                onNewHook={handleNewHook}
                onUpdateCaption={handleUpdateCaption}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </main>
    </div>
  );
}
