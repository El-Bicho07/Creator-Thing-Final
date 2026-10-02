import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Zap,
  Sparkles,
  ArrowRight,
  Flame,
  UserCheck,
  Video,
  FileText,
  Target,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/20 selection:text-indigo-400 flex flex-col">
      {/* Navigation Header */}
      <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-fuchsia-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span className="font-bold text-lg tracking-tight">TrendEngine</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition">
              Sign In
            </Link>
            <Link href="/signup">
              <Button size="sm" className="btn-primary-gradient">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 md:py-24 space-y-20">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <Badge variant="accent" className="px-3 py-1 text-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline text-indigo-400" />
            Personalized Creator Strategy Engine
          </Badge>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Turn trends into content that <span className="text-gradient">actually fits YOU.</span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl leading-relaxed">
            Stop generating generic AI scripts. Inject your unique creator identity, audience pain points, and target platform into every viral trend.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard/new" className="w-full sm:w-auto">
              <Button size="lg" className="btn-primary-gradient w-full text-base font-semibold px-8 py-6">
                Create Your Content Strategy
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full text-base border-zinc-800 hover:bg-zinc-900">
                Explore Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Content Pipeline Visual */}
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-semibold text-center text-zinc-500">
            End-to-End Execution Pipeline
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-zinc-900/60 p-4 border border-zinc-800 rounded-2xl">
            {[
              { title: '1. Raw Trend', desc: 'Verified live sources or user topic', icon: Flame },
              { title: '2. Angle Equation', desc: 'Trend + You + Pain Point = Angle', icon: UserCheck },
              { title: '3. 7 Viral Hooks', desc: 'Curiosity, Contrarian, Story & more', icon: Sparkles },
              { title: '4. Tailored Script', desc: 'Video timeline or text post union', icon: Video },
              { title: '5. Full Package', desc: 'Shot list, CTA, Caption & Hashtags', icon: FileText },
            ].map((step, idx) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="bg-zinc-950/80 border-zinc-800/80 relative">
                  <CardContent className="p-4 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="font-semibold text-sm text-zinc-200">{step.title}</div>
                    <div className="text-xs text-zinc-400 leading-snug">{step.desc}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Differentiator Comparison */}
        <div className="grid md:grid-cols-2 gap-8 pt-8">
          <Card className="bg-zinc-900/40 border-zinc-800/80">
            <CardContent className="p-8 space-y-4">
              <div className="inline-block p-2 rounded-lg bg-red-500/10 text-red-400 font-semibold text-xs uppercase tracking-wider">
                Generic AI Tools
              </div>
              <h3 className="text-xl font-bold text-zinc-200">Trend → LLM → Generic Script</h3>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">✕</span> Sounds like every other creator using ChatGPT
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">✕</span> Cliches: "In today's fast-paced world...", "Game-changer"
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">✕</span> Ignores your specific niche experience and tone
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">✕</span> Arbitrary timestamps and hallucinated statistics
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-indigo-950/20 border-indigo-500/30">
            <CardContent className="p-8 space-y-4">
              <div className="inline-block p-2 rounded-lg bg-indigo-500/20 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                Trend-to-Content Engine
              </div>
              <h3 className="text-xl font-bold text-zinc-100">Trend + Creator Identity = Personal Angle</h3>
              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Angle Equation card explains exactly why this trend fits YOU
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  7 distinct hook frameworks (Curiosity, Contrarian, Problem)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Discriminated union scripts for Video vs. LinkedIn/X Threads
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Derived shot lists, spoken CTAs, and verified live trend feeds
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-8 px-6 bg-zinc-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <div>Trend-to-Content Engine © 2026. Built with Next.js, Supabase & Google Gemini.</div>
          <div className="flex space-x-4">
            <Link href="/api/health" target="_blank" className="hover:text-zinc-300">
              API Health
            </Link>
            <Link href="/login" className="hover:text-zinc-300">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
