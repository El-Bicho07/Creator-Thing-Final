'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  History,
  Search,
  Bookmark,
  BookmarkCheck,
  Copy,
  Trash2,
  ExternalLink,
  PlusCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generations, setGenerations] = useState<any[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [selectedPlatform, selectedGoal, savedOnly]);

  async function loadHistory() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedPlatform) params.append('platform', selectedPlatform);
      if (selectedGoal) params.append('goal', selectedGoal);
      if (savedOnly) params.append('saved', 'true');
      if (searchQuery) params.append('q', searchQuery);

      const res = await fetch(`/api/generations?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setGenerations(data.generations || []);
      }
    } catch (err) {
      toast.error('Failed to load history.');
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  const handleDuplicate = async (id: string) => {
    toast.info('Duplicating generation...');
    try {
      const res = await fetch(`/api/generations/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.newGenerationId) {
        toast.success('Duplicated successfully!');
        router.push(`/dashboard/generation/${data.newGenerationId}`);
      }
    } catch (err) {
      toast.error('Failed to duplicate.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content package?')) return;

    try {
      const res = await fetch(`/api/generations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Deleted successfully!');
        setGenerations(generations.filter((g) => g.id !== id));
      }
    } catch (err) {
      toast.error('Failed to delete.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Header />

        <main className="p-6 max-w-6xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Content Strategy History</h1>
              <p className="text-xs text-zinc-400">
                View, search, edit, duplicate, and manage all your past generated content packages.
              </p>
            </div>
            <Link href="/dashboard/new">
              <Button size="sm" className="btn-primary-gradient">
                <PlusCircle className="w-4 h-4 mr-1.5" /> Create New Package
              </Button>
            </Link>
          </div>

          {/* Search & Filters */}
          <Card className="bg-zinc-900 border-zinc-800 p-4 space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <Input
                  placeholder="Search by trend title or angle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 pl-9"
                />
              </div>
              <Button type="submit" variant="outline" className="border-zinc-800">
                Search
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="h-8 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-zinc-300"
              >
                <option value="">All Platforms</option>
                <option value="Instagram Reels">Instagram Reels</option>
                <option value="YouTube Shorts">YouTube Shorts</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="X">X</option>
              </select>

              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                className="h-8 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-zinc-300"
              >
                <option value="">All Goals</option>
                <option value="Increase Reach">Increase Reach</option>
                <option value="Build Authority">Build Authority</option>
                <option value="Educate">Educate</option>
                <option value="Generate Engagement">Generate Engagement</option>
              </select>

              <button
                type="button"
                onClick={() => setSavedOnly(!savedOnly)}
                className={`px-3 py-1 rounded-lg border text-xs font-medium transition ${
                  savedOnly ? 'bg-amber-950/40 border-amber-800 text-amber-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                ★ Saved Ideas Only
              </button>
            </div>
          </Card>

          {/* Generations List */}
          {loading ? (
            <div className="p-12 text-center text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-400" />
              Loading your content history...
            </div>
          ) : generations.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800 p-12 text-center space-y-3">
              <History className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-lg font-bold text-zinc-200">No Generations Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {savedOnly || searchQuery ? 'No content matching filters.' : 'You haven’t created any content packages yet.'}
              </p>
              <Link href="/dashboard/new">
                <Button className="btn-primary-gradient mt-2">Create Your First Package</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generations.map((gen) => (
                <Card key={gen.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between">
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="accent">{gen.platform}</Badge>
                      <div className="flex items-center space-x-2">
                        {gen.is_saved && <Bookmark className="w-4 h-4 text-amber-400 fill-current" />}
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {new Date(gen.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <CardTitle className="text-base font-bold text-zinc-100 line-clamp-1">
                      {gen.input_topic}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {gen.creator_angle && (
                      <p className="text-xs text-zinc-400 line-clamp-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 font-medium">
                        "{gen.creator_angle}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                      <span className="text-zinc-500 font-medium">Goal: {gen.content_goal}</span>

                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(gen.id)}
                          title="Duplicate"
                          className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(gen.id)}
                          title="Delete"
                          className="h-7 w-7 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Link href={`/dashboard/generation/${gen.id}`}>
                          <Button size="sm" variant="outline" className="border-zinc-800 text-xs h-7 px-2.5">
                            Open <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
