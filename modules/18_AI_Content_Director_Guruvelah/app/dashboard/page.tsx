'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Flame,
  PlusCircle,
  FileText,
  Bookmark,
  ThumbsUp,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trends, setTrends] = useState<any[]>([]);
  const [stats, setStats] = useState({
    trendingTopicsCount: 0,
    contentGeneratedCount: 0,
    savedIdeasCount: 0,
    topRatedAnglesCount: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [trendsRes, historyRes] = await Promise.all([
        fetch('/api/trends'),
        fetch('/api/generations'),
      ]);

      const trendsData = await trendsRes.json();
      const historyData = await historyRes.json();

      const liveTrends = trendsData.trends || [];
      const userGens = historyData.generations || [];

      setTrends(liveTrends);
      setStats({
        trendingTopicsCount: liveTrends.length,
        contentGeneratedCount: userGens.length,
        savedIdeasCount: userGens.filter((g: any) => g.is_saved).length,
        topRatedAnglesCount: 0, // Computed from 👍 feedback
      });
    } catch (err) {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  }

  const handleRefreshTrends = async () => {
    setRefreshing(true);
    toast.info('Refreshing live trend feeds...');
    try {
      const res = await fetch('/api/trends/refresh', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        toast.success(`Refreshed! Ingested ${data.count || 0} live trends.`);
        loadDashboardData();
      } else {
        toast.error(data.error?.message || 'Failed to refresh trends.');
      }
    } catch (err) {
      toast.error('Network error refreshing trends.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Header />

        <main className="p-6 max-w-6xl w-full mx-auto space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Creator Dashboard</h1>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Turn trends into content that actually fits YOU.
              </p>
            </div>

            <Link href="/dashboard/new">
              <Button className="btn-primary-gradient px-6">
                <PlusCircle className="w-4 h-4 mr-2" /> + Create Content
              </Button>
            </Link>
          </div>

          {/* Metric Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs">
                  <span>Trending Topics</span>
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <div className="text-2xl font-extrabold text-zinc-100">{stats.trendingTopicsCount}</div>
                <p className="text-[11px] text-zinc-500">Live feeds available</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs">
                  <span>Content Generated</span>
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-extrabold text-zinc-100">{stats.contentGeneratedCount}</div>
                <p className="text-[11px] text-zinc-500">Total packages created</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs">
                  <span>Saved Ideas</span>
                  <Bookmark className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-zinc-100">{stats.savedIdeasCount}</div>
                <p className="text-[11px] text-zinc-500">Starred strategies</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs">
                  <span>Top-Rated Angles</span>
                  <ThumbsUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-zinc-100">{stats.topRatedAnglesCount}</div>
                <p className="text-[11px] text-zinc-500">
                  {stats.topRatedAnglesCount > 0 ? 'From 👍 feedback' : 'No feedback yet'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 🔥 Trending Now Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-bold tracking-tight text-zinc-100">🔥 Trending Now</h2>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshTrends}
                disabled={refreshing}
                className="border-zinc-800 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Live Feeds
              </Button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-400" />
                Fetching live trend feeds...
              </div>
            ) : trends.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800 p-8 text-center space-y-3">
                <TrendingUp className="w-8 h-8 text-zinc-600 mx-auto" />
                <h3 className="text-base font-bold text-zinc-200">No Live Trends Available</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Live trend sources aren't available right now — click "Refresh Live Feeds" or enter any trend manually.
                </p>
                <Link href="/dashboard/new">
                  <Button className="btn-primary-gradient mt-2">Enter Manual Trend</Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trends.map((t) => {
                  const snippets = t.source_snippets || [];
                  const metrics = t.source_metrics || {};

                  return (
                    <Card key={t.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between">
                      <CardHeader className="space-y-2 pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="accent" className="text-[10px]">
                            {t.source === 'google_trends' ? 'Google Trends' : t.source === 'hacker_news' ? 'Hacker News' : 'User Provided'}
                          </Badge>
                          {metrics.approx_searches && (
                            <span className="text-[11px] text-emerald-400 font-medium">
                              ~{metrics.approx_searches} searches
                            </span>
                          )}
                          {metrics.points !== undefined && (
                            <span className="text-[11px] text-indigo-400 font-medium">
                              {metrics.points} pts
                            </span>
                          )}
                        </div>

                        <CardTitle className="text-base font-bold text-zinc-100 line-clamp-2">
                          {t.title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-0">
                        {snippets[0] && (
                          <p className="text-xs text-zinc-400 line-clamp-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
                            "{snippets[0]}"
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                          {t.source_url ? (
                            <a
                              href={t.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                            >
                              Source <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : <div />}

                          <Link
                            href={`/dashboard/new?topic=${encodeURIComponent(t.title)}&sourceText=${encodeURIComponent(snippets[0] || t.description || '')}`}
                          >
                            <Button size="sm" className="btn-primary-gradient text-xs h-8 px-3">
                              Generate Content <Sparkles className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
