"use client";

import { HelpCircle, Sparkles, BookOpen, Compass, ShieldCheck, Mail } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="animate-fade-in-up max-w-4xl">
      <header className="mb-10">
        <span className="text-xs font-bold text-blue-accent uppercase tracking-wider block mb-1">Knowledge Base</span>
        <h1 className="text-3xl font-bold mb-2">Help & Creator Guide</h1>
        <p className="text-secondary-text">Learn how to accelerate your research-to-publish workflow.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-soft-sky">
          <div className="w-10 h-10 rounded-xl bg-pastel-blue/30 text-blue-accent flex items-center justify-center mb-4">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg mb-2">The Creator Workflow</h3>
          <p className="text-sm text-secondary-text leading-relaxed">
            Follow the 8-step pipeline: <strong>Discover → Research → Understand → Find Angles → Create Instagram Ideas → Write → Save → Publish</strong>. Let the AI do the heavy factual lifting while you infuse your unique voice.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-soft-sky">
          <div className="w-10 h-10 rounded-xl bg-pastel-lavender/30 text-purple-accent flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg mb-2">Source Credibility</h3>
          <p className="text-sm text-secondary-text leading-relaxed">
            Every insight links back to verified research papers, universities, or official institutions. Never worry about misquoting a statistic or sharing unverified claims with your community.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-soft-sky">
          <div className="w-10 h-10 rounded-xl bg-soft-pink/30 text-pink-accent flex items-center justify-center mb-4">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg mb-2">Hook Lab & Formulas</h3>
          <p className="text-sm text-secondary-text leading-relaxed">
            Use the Hook Lab to test 7 psychology-backed angles: Curiosity, Contrarian, Question, Statistic, Story, Problem, and Educational. Test different first lines across your Reels and Carousels.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-soft-sky">
          <div className="w-10 h-10 rounded-xl bg-peach/30 text-orange-400 flex items-center justify-center mb-4">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-lg mb-2">Creator Support</h3>
          <p className="text-sm text-secondary-text leading-relaxed">
            Need help fine-tuning prompts or connecting external data sources? Reach out to our community team anytime at <strong>creator-support@researchassistant.io</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
