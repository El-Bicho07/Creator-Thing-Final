'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/db/client';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { User, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const NICHES = ['Technology', 'Fitness', 'Finance', 'Education', 'Gaming', 'Beauty', 'Fashion', 'Food', 'Travel', 'Business'];
const PLATFORMS = ['Instagram Reels', 'YouTube Shorts', 'TikTok', 'YouTube', 'LinkedIn', 'X'];
const TONES = ['Casual', 'Professional', 'Bold', 'Funny', 'Educational', 'Motivational', 'Conversational'];
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Established'];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [niche, setNiche] = useState('');
  const [subNiche, setSubNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState('Instagram Reels');
  const [contentStyle, setContentStyle] = useState('Educational');
  const [tone, setTone] = useState<string[]>(['Casual', 'Educational']);
  const [experienceLevel, setExperienceLevel] = useState('Intermediate');
  const [creatorDescription, setCreatorDescription] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from('creator_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (data) {
            setNiche(data.niche || '');
            setSubNiche(data.sub_niche || '');
            setTargetAudience(data.target_audience || '');
            setPlatform(data.platform || 'Instagram Reels');
            setContentStyle(data.content_style || 'Educational');
            setTone(data.tone || ['Casual']);
            setExperienceLevel(data.experience_level || 'Intermediate');
            setCreatorDescription(data.creator_description || '');
          }
        }
      } catch (err) {
        // Fallback for offline/unconfigured environment
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const toggleTone = (selectedTone: string) => {
    if (tone.includes(selectedTone)) {
      setTone(tone.filter((t) => t !== selectedTone));
    } else {
      if (tone.length >= 2) {
        setTone([tone[1], selectedTone]);
      } else {
        setTone([...tone, selectedTone]);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Session expired.');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('creator_profiles').upsert(
        {
          user_id: user.id,
          niche,
          sub_niche: subNiche || null,
          target_audience: targetAudience,
          platform,
          content_style: contentStyle,
          tone,
          experience_level: experienceLevel,
          creator_description: creatorDescription,
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        toast.error(`Failed to update profile: ${error.message}`);
      } else {
        toast.success('Creator profile updated!');
      }
    } catch (err) {
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Header />
        <main className="p-6 max-w-4xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Creator Profile</h1>
              <p className="text-xs text-zinc-400">
                Manage your niche, audience, and identity used to personalize your content strategies.
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="btn-primary-gradient">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>

          {loading ? (
            <Card className="bg-zinc-900 border-zinc-800 p-8 text-center text-zinc-400">
              Loading profile data...
            </Card>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg">Niche & Target Audience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Primary Niche</label>
                      <Input
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        placeholder="e.g. Technology"
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Sub-Niche (Optional)</label>
                      <Input
                        value={subNiche}
                        onChange={(e) => setSubNiche(e.target.value)}
                        placeholder="e.g. AI Coding"
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Target Audience</label>
                    <Input
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g. College students learning to code"
                      className="bg-zinc-950 border-zinc-800"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg">Platform & Style Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Default Platform</label>
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                      >
                        {PLATFORMS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300">Experience Level</label>
                      <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                      >
                        {EXPERIENCE_LEVELS.map((exp) => (
                          <option key={exp} value={exp}>{exp}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Tone of Voice (Up to 2)</label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {TONES.map((t) => {
                        const isSelected = tone.includes(t);
                        return (
                          <button
                            type="button"
                            key={t}
                            onClick={() => toggleTone(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            {t} {isSelected && '✓'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg">Creator Description & Bio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={creatorDescription}
                    onChange={(e) => setCreatorDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe your content identity..."
                    className="bg-zinc-950 border-zinc-800"
                  />
                </CardContent>
              </Card>
            </form>
          )}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
