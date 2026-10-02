'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { IntroScreen } from '@/components/intro/IntroScreen';
import { Plan } from '@/types';
import { planRepository } from '@/lib/storage';
import { planEngine } from '@/lib/engine';
import { MotionButton, FadeIn, StaggerContainer, StaggerItem, MotionCard } from '@/components/motion';
import {
  Search,
  Calendar,
  Trash2,
  ExternalLink,
  PlusCircle,
  Repeat,
  AlertCircle,
  CheckCircle2,
  X,
  Target,
  Clock,
} from 'lucide-react';

export default function HistoryPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showIntroModal, setShowIntroModal] = useState(false);

  // Delete modal state
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const loaded = await planRepository.getPlans();
        setPlans(loaded);
      } catch (err) {
        console.error('Failed loading history', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const filteredPlans = plans.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.form.niche.toLowerCase().includes(q) ||
      p.form.goal.toLowerCase().includes(q) ||
      p.form.platform.toLowerCase().includes(q) ||
      p.date.includes(q) ||
      p.items.some((i) => i.title.toLowerCase().includes(q) || i.hook.toLowerCase().includes(q))
    );
  });

  const handleReuseToday = async (sourcePlan: Plan) => {
    const freshPlan = planEngine.generatePlan(sourcePlan.form, Date.now());
    await planRepository.savePlan(freshPlan);
    router.push(`/plan/${freshPlan.id}`);
  };

  const confirmDelete = async () => {
    if (!planToDelete) return;
    await planRepository.deletePlan(planToDelete.id);
    setPlans(plans.filter((p) => p.id !== planToDelete.id));
    setPlanToDelete(null);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar onOpenIntro={() => setShowIntroModal(true)} />

      {showIntroModal && <IntroScreen isModal onDismiss={() => setShowIntroModal(false)} />}

      {/* Delete Confirmation Modal */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-card p-6 sm:p-8 rounded-card border-4 border-navy shadow-block-lg max-w-md w-full space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red text-white flex items-center justify-center border-2 border-navy shadow-block-sm">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading font-black text-xl text-navy">Delete Content Plan?</h3>
              <p className="text-xs sm:text-sm text-muted">
                Are you sure you want to delete the plan for &ldquo;<span className="font-bold text-navy">{planToDelete.form.niche}</span>&rdquo; ({planToDelete.date})? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPlanToDelete(null)}
                type="button"
                className="btn-block-outline px-4 py-2.5 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                type="button"
                className="bg-red text-white border-2 border-navy px-4 py-2.5 rounded-xl font-heading font-extrabold text-xs shadow-block-navy hover:bg-red-hover transition-colors"
              >
                Yes, delete plan
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:py-12 space-y-8">
        <FadeIn>
          {/* Header & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-heading font-black text-3xl sm:text-4xl text-navy">Plan History</h1>
              <p className="text-muted text-sm">
                Search, reopen, or reuse your past content plans for today.
              </p>
            </div>

            <Link href="/create">
              <MotionButton type="button" className="btn-block-orange px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Plan new video
              </MotionButton>
            </Link>
          </div>

          {/* Search Box */}
          <div className="relative mt-4">
            <Search className="w-5 h-5 text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by niche, title, platform, or date..."
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-3 border-navy bg-card text-ink text-sm font-semibold focus:border-orange focus:outline-none shadow-block transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                type="button"
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </FadeIn>

        {/* History List */}
        {loading ? (
          <div className="p-12 text-center text-muted font-heading font-bold">Loading history...</div>
        ) : filteredPlans.length === 0 ? (
          <FadeIn>
            <div className="bg-card p-8 sm:p-12 rounded-card border-4 border-navy shadow-block-lg text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-lightblue text-navy flex items-center justify-center mx-auto border-2 border-navy shadow-block-sm">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-heading font-black text-xl text-navy">
                  {searchQuery ? `No matching plans found for "${searchQuery}"` : 'No plans yet. Your first plan takes about ten seconds.'}
                </h3>
                <p className="text-muted text-xs sm:text-sm">
                  {searchQuery ? 'Try clearing your search query or searching for a different keyword.' : 'Get started by creating your very first daily video plan.'}
                </p>
              </div>
              {!searchQuery && (
                <Link href="/create" className="inline-block">
                  <MotionButton type="button" className="btn-block-orange px-6 py-3 rounded-xl font-bold text-sm">
                    Plan my first video
                  </MotionButton>
                </Link>
              )}
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlans.map((p) => {
              const doneCount = p.items.filter((i) => i.done).length;
              const totalCount = p.items.length;

              return (
                <StaggerItem key={p.id}>
                  <MotionCard className="bg-card p-6 rounded-card border-3 border-navy shadow-block space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="px-3 py-1 rounded-full bg-yellow text-navy border border-navy flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {p.date}
                        </span>
                        <span className="text-muted font-mono">{p.form.platform}</span>
                      </div>

                      <div>
                        <h3 className="font-heading font-black text-xl text-navy">{p.form.niche}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted font-semibold">
                          <span className="flex items-center gap-1">
                            <Target className="w-3.5 h-3.5 text-orange" />
                            {p.form.goal}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-navy" />
                            {p.form.time}
                          </span>
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="space-y-1.5 bg-bg p-3 rounded-xl border border-border">
                        {p.items.map((item) => (
                          <div key={item.id} className="text-xs font-semibold text-ink truncate flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${item.done ? 'bg-orange' : 'bg-muted/40'}`} />
                            <span className="truncate">{item.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t-2 border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MotionButton
                          onClick={() => handleReuseToday(p)}
                          type="button"
                          className="px-3 py-2 rounded-xl border-2 border-navy bg-yellow text-navy font-bold text-xs flex items-center gap-1 shadow-block-sm hover:bg-yellow-light"
                        >
                          <Repeat className="w-3.5 h-3.5" />
                          Reuse today
                        </MotionButton>

                        <button
                          onClick={() => setPlanToDelete(p)}
                          type="button"
                          aria-label="Delete plan"
                          className="p-2 rounded-xl text-muted hover:text-red hover:bg-red-light transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <Link href={`/plan/${p.id}`}>
                        <MotionButton type="button" className="btn-block-primary px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1">
                          Open plan
                          <ExternalLink className="w-3.5 h-3.5" />
                        </MotionButton>
                      </Link>
                    </div>
                  </MotionCard>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </main>
    </div>
  );
}
