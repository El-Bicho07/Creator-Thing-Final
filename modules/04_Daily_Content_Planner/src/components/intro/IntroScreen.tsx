'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Target, Clock, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { IsometricSlabHero } from './IsometricSlabHero';
import { MotionButton, FadeIn } from '@/components/motion';

interface IntroScreenProps {
  onDismiss?: () => void;
  isModal?: boolean;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onDismiss, isModal = false }) => {
  const steps = [
    {
      num: '01',
      title: 'Tell us your niche',
      desc: 'Gaming, personal finance, Tech reviews, or fitness — just type what your channel is about.',
      icon: Target,
      badgeBg: 'bg-yellow text-navy',
    },
    {
      num: '02',
      title: 'Pick a goal & your time',
      desc: 'Whether you have 15 mins for a Community post or a full shoot day, get tailored formats.',
      icon: Clock,
      badgeBg: 'bg-orange text-white',
    },
    {
      num: '03',
      title: 'Post & tick it off',
      desc: 'Copy hooks, alternate titles, scripts & thumbnails, then track your daily streak.',
      icon: CheckCircle2,
      badgeBg: 'bg-lightblue text-navy',
    },
  ];

  const content = (
    <div className="relative w-full max-w-4xl mx-auto bg-card rounded-card border-4 border-navy shadow-block-lg p-6 sm:p-10 my-4">
      {isModal && onDismiss && (
        <button
          onClick={onDismiss}
          type="button"
          aria-label="Close intro"
          className="absolute top-4 right-4 w-10 h-10 rounded-xl border-2 border-border bg-bg text-ink flex items-center justify-center font-bold hover:bg-navy hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Headline & Steps */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow text-navy border-2 border-navy text-xs font-bold shadow-block-sm">
            <Sparkles className="w-4 h-4 text-navy" />
            YouTube-First Daily Content Planner
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-navy tracking-tight leading-tight">
            Never wonder what to upload again.
          </h1>

          <p className="text-muted text-base sm:text-lg leading-relaxed">
            Get 3 tailored video & post ideas tailored to your niche, available time, and growth goals in under 10 seconds.
          </p>

          {/* 3 Steps */}
          <div className="space-y-3 pt-2">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="flex items-start gap-3.5 p-3.5 rounded-xl border-2 border-border bg-bg hover:border-navy transition-colors"
                >
                  <span
                    className={`w-8 h-8 rounded-lg ${step.badgeBg} border-2 border-navy flex items-center justify-center font-heading font-black text-xs shrink-0 shadow-block-sm`}
                  >
                    {step.num}
                  </span>
                  <div>
                    <h3 className="font-heading font-bold text-ink text-sm sm:text-base flex items-center gap-1.5">
                      {step.title}
                      <Icon className="w-4 h-4 text-muted inline" />
                    </h3>
                    <p className="text-muted text-xs sm:text-sm leading-normal mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link href="/create" onClick={onDismiss} className="w-full sm:w-auto">
              <MotionButton type="button" className="btn-block-orange w-full sm:w-auto px-6 py-3.5 rounded-xl font-heading font-bold text-base flex items-center justify-center gap-2">
                Plan my first video
                <ArrowRight className="w-5 h-5" />
              </MotionButton>
            </Link>

            {isModal && onDismiss && (
              <button
                onClick={onDismiss}
                type="button"
                className="btn-block-outline px-5 py-3 rounded-xl font-semibold text-sm text-center"
              >
                Close tutorial
              </button>
            )}
          </div>
        </div>

        {/* Right Column: 3D Slab Hero */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <IsometricSlabHero />
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center">
        <FadeIn className="w-full max-w-4xl">{content}</FadeIn>
      </div>
    );
  }

  return <FadeIn>{content}</FadeIn>;
};
