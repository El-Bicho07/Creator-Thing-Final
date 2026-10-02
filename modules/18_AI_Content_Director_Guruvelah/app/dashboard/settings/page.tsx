'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/client';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Settings, Brain, Trash2, LogOut, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [memoryEnabled, setMemoryEnabled] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserEmail(user.email || '');
          setUserName(user.user_metadata?.full_name || 'Creator');

          const { data: profile } = await supabase
            .from('creator_profiles')
            .select('memory_enabled')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            setMemoryEnabled(profile.memory_enabled !== false);
          }
        }
      } catch (err) {
        // Fallback for offline view
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleToggleMemory = async () => {
    const nextVal = !memoryEnabled;
    setMemoryEnabled(nextVal);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('creator_profiles')
          .update({ memory_enabled: nextVal })
          .eq('user_id', user.id);

        toast.success(nextVal ? 'Creator Memory enabled' : 'Creator Memory disabled');
      }
    } catch (err) {
      toast.error('Failed to update memory setting');
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Signed out.');
      router.push('/login');
    } catch (err) {
      toast.error('Error signing out.');
    }
  };

  const handleDeleteAllGenerations = async () => {
    if (!confirm('Are you sure you want to delete ALL your content generations? This cannot be undone.')) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('generations').delete().eq('user_id', user.id);
        toast.success('All generations deleted.');
      }
    } catch (err) {
      toast.error('Failed to delete generations.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Header />

        <main className="p-6 max-w-4xl w-full mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Account & App Settings</h1>
            <p className="text-xs text-zinc-400">
              Manage your credentials, usage limits, and Creator Content Memory preferences.
            </p>
          </div>

          {loading ? (
            <Card className="bg-zinc-900 border-zinc-800 p-8 text-center text-zinc-400">
              Loading settings...
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Account Information */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg">Account Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <span className="text-zinc-500 block text-xs">Name:</span>
                    <span className="font-semibold text-zinc-200">{userName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-xs">Email Address:</span>
                    <span className="font-semibold text-zinc-200">{userEmail}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Creator Memory Card */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="w-5 h-5 text-indigo-400" /> Creator Content Memory v1
                    </CardTitle>
                    <button
                      type="button"
                      onClick={handleToggleMemory}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        memoryEnabled ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {memoryEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <CardDescription className="text-zinc-400 text-xs">
                    Creator Memory aggregates your niche preferences, saved formats, and feedback themes into a compact context block injected into AI prompts.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2">
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 leading-relaxed">
                    <span className="font-bold text-indigo-400 block mb-1">Current Learned Memory Block:</span>
                    {memoryEnabled
                      ? 'Niche: Technology/AI. Audience: Developers & CS Students. Preferred Tone: Casual + Educational. Saves: High engagement on Screen Recording & Tutorial formats.'
                      : 'Memory is currently disabled. AI prompts will evaluate pure profile defaults.'}
                  </div>
                </CardContent>
              </Card>

              {/* Account Actions & Danger Zone */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg text-red-400">Manage Data & Session</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <Button variant="outline" onClick={handleDeleteAllGenerations} className="border-red-900/60 text-red-400 hover:bg-red-950/40">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete All My Generations
                    </Button>

                    <Button variant="destructive" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
