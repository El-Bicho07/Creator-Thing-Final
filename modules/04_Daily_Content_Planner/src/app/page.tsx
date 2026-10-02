'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { IntroScreen } from '@/components/intro/IntroScreen';
import { Plan } from '@/types';
import { planRepository } from '@/lib/storage';
import { planEngine } from '@/lib/engine';
import { MotionButton, FadeIn, StaggerContainer, StaggerItem, MotionCard } from '@/components/motion';
import {
  Sparkles,
  Flame,
  Calendar,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  Target,
  Clock,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showIntro, setShowIntro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const seen = await planRepository.hasSeenIntro();
        if (!seen) {
          setShowIntro(true);
          await planRepository.setSeenIntro(true);
        }
        const loaded = await planRepository.getPlans();
        setPlans(loaded);
      } catch (err) {
        console.error('Failed initializing dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const totalPlans = plans.length;
  let totalPostsDone = 0;
  plans.forEach((p) => {
    totalPostsDone += p.items.filter((i) => i.done).length;
  });

  // Calculate streak based on daily plans
  const calculateStreak = () => {
    if (plans.length === 0) return 0;
    const dates = Array.from(new Set(plans.map((p) => p.date))).sort().reverse();
    const todayStr = new Date().toISOString().split('T')[0];
    let streak = 0;
    let checkDate = new Date();

    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0 && dateStr === todayStr) {
        // Today hasn't plan yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return Math.max(streak, plans.length > 0 ? 1 : 0);
  };

  const streakCount = calculateStreak();

  // Today's Plan
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPlan = plans.find((p) => p.date === todayStr) || plans[0];

  const handleCreateToday = () => {
    router.push('/create');
  };

  const handleReuseForToday = async (sourcePlan: Plan) => {
    const freshPlan = planEngine.generatePlan(sourcePlan.form, Date.now());
    await planRepository.savePlan(freshPlan);
    router.push(`/plan/${freshPlan.id}`);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar onOpenIntro={() => setShowIntro(true)} />

      {showIntro && (
        <IntroScreen
          isModal
          onDismiss={() => {
            setShowIntro(false);
          }}
        />
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:py-12 space-y-8">
        <FadeIn>
          {/* Welcome & Quick Action Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 sm:p-8 rounded-card border-4 border-navy shadow-block-lg">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow text-navy text-xs font-heading font-black border border-navy shadow-block-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Daily Creator Hub
              </div>
              <h1 className="font-heading font-black text-3xl sm:text-4xl text-navy">
                What are you posting today?
              </h1>
              <p className="text-muted text-sm sm:text-base">
                Never wonder what to upload again. Turn your niche into today&apos;s video plan in 10 seconds.
              </p>
            </div>

            <MotionButton
              onClick={handleCreateToday}
              type="button"
              className="btn-block-orange px-6 py-4 rounded-xl font-heading font-black text-base flex items-center justify-center gap-2 shrink-0 shadow-block-navy"
            >
              <PlusCircle className="w-5 h-5" />
              Plan today&apos;s video
            </MotionButton>
          </div>
        </FadeIn>

        {/* Stats Row */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StaggerItem>
            <MotionCard className="bg-card p-5 rounded-2xl border-3 border-navy shadow-block space-y-1">
              <div className="flex items-center justify-between text-muted text-xs font-bold uppercase">
                <span>Daily Streak</span>
                <Flame className="w-5 h-5 text-orange" />
              </div>
              <p className="font-heading font-black text-3xl text-navy">{streakCount} Days</p>
              <p className="text-xs text-muted">Keep uploading daily</p>
            </MotionCard>
          </StaggerItem>

          <StaggerItem>
            <MotionCard className="bg-card p-5 rounded-2xl border-3 border-navy shadow-block space-y-1">
              <div className="flex items-center justify-between text-muted text-xs font-bold uppercase">
                <span>Plans Created</span>
                <Calendar className="w-5 h-5 text-yellow" />
              </div>
              <p className="font-heading font-black text-3xl text-navy">{totalPlans}</p>
              <p className="text-xs text-muted">Total content plans</p>
            </MotionCard>
          </StaggerItem>

          <StaggerItem>
            <MotionCard className="bg-card p-5 rounded-2xl border-3 border-navy shadow-block space-y-1">
              <div className="flex items-center justify-between text-muted text-xs font-bold uppercase">
                <span>Posts Done</span>
                <CheckCircle2 className="w-5 h-5 text-lightblue" />
              </div>
              <p className="font-heading font-black text-3xl text-navy">{totalPostsDone}</p>
              <p className="text-xs text-muted">Uploaded & ticked off</p>
            </MotionCard>
          </StaggerItem>
        </StaggerContainer>

        {/* Today's Plan Progress Banner (If plan exists) */}
        {todayPlan ? (
          <FadeIn>
            <div className="bg-card p-6 sm:p-7 rounded-card border-4 border-navy shadow-block-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-heading font-extrabold uppercase text-orange tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 fill-current" />
                    Today&apos;s Active Plan ({todayPlan.date})
                  </span>
                  <h2 className="font-heading font-black text-xl sm:text-2xl text-navy">
                    {todayPlan.form.niche} — {todayPlan.form.goal}
                  </h2>
                </div>

                <Link href={`/plan/${todayPlan.id}`}>
                  <MotionButton type="button" className="btn-block-primary px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5">
                    View & Edit Plan
                    <ExternalLink className="w-4 h-4" />
                  </MotionButton>
                </Link>
              </div>

              {/* Progress */}
              <div className="space-y-1.5 pt-2 border-t-2 border-border">
                <div className="flex justify-between text-xs font-bold text-navy">
                  <span>
                    {todayPlan.items.filter((i) => i.done).length} of {todayPlan.items.length} posts finished
                  </span>
                  <span>
                    {Math.round(
                      (todayPlan.items.filter((i) => i.done).length / todayPlan.items.length) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full h-3 bg-bg rounded-full border-2 border-navy overflow-hidden p-0.5">
                  <div
                    className="h-full bg-orange rounded-full transition-all duration-500"
                    style={{
                      width: `${(todayPlan.items.filter((i) => i.done).length / todayPlan.items.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </FadeIn>
        ) : (
          /* Empty State when no plans exist */
          <FadeIn>
            <div className="bg-card p-8 rounded-card border-4 border-navy shadow-block-lg text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-yellow text-navy flex items-center justify-center mx-auto border-3 border-navy shadow-block-sm">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-heading font-black text-xl text-navy">
                  No plans yet. Your first plan takes about ten seconds.
                </h3>
                <p className="text-muted text-xs sm:text-sm">
                  Type your niche, pick your goal, and get 3 ready-to-use posts instantly.
                </p>
              </div>
              <MotionButton
                onClick={handleCreateToday}
                type="button"
                className="btn-block-orange px-6 py-3.5 rounded-xl font-heading font-extrabold text-sm inline-flex items-center gap-2"
              >
                Plan my first video
                <ArrowRight className="w-4 h-4" />
              </MotionButton>
            </div>
          </FadeIn>
        )}

        {/* Recent Plans */}
        {plans.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-xl text-navy">Recent Content Plans</h3>
              <Link href="/history" className="text-xs font-bold text-navy hover:text-orange flex items-center gap-1">
                View all in History →
              </Link>
            </div>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.slice(0, 4).map((p) => (
                <StaggerItem key={p.id}>
                  <MotionCard className="bg-card p-5 rounded-2xl border-3 border-navy shadow-block space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="px-2.5 py-0.5 rounded-md bg-yellow text-navy border border-navy">
                        {p.date}
                      </span>
                      <span className="text-muted">{p.form.platform}</span>
                    </div>

                    <div>
                      <h4 className="font-heading font-extrabold text-lg text-navy">{p.form.niche}</h4>
                      <p className="text-xs text-muted font-medium mt-0.5 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-orange" />
                        {p.form.goal}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t-2 border-border text-xs">
                      <button
                        onClick={() => handleReuseForToday(p)}
                        type="button"
                        className="font-bold text-navy hover:text-orange flex items-center gap-1"
                      >
                        Reuse today ↻
                      </button>

                      <Link
                        href={`/plan/${p.id}`}
                        className="btn-block-primary px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1"
                      >
                        Open plan
                      </Link>
                    </div>
                  </MotionCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        )}
      </main>
    </div>
  );
}
