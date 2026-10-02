'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/client';
import { Stepper } from '@/components/ui/Stepper';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Zap, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

const NICHES = ['Technology', 'Fitness', 'Finance', 'Education', 'Gaming', 'Beauty', 'Fashion', 'Food', 'Travel', 'Business'];
const AUDIENCES = ['College students', 'Young professionals', 'Fitness beginners', 'Entrepreneurs', 'Developers', 'Creators', 'Parents'];
const PLATFORMS = ['Instagram Reels', 'YouTube Shorts', 'TikTok', 'YouTube', 'LinkedIn', 'X'];
const STYLES = ['Educational', 'Entertainment', 'Storytelling', 'Inspirational', 'Opinion', 'Tutorial', 'Comedy', 'News/commentary'];
const TONES = ['Casual', 'Professional', 'Bold', 'Funny', 'Educational', 'Motivational', 'Conversational'];
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Established'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [niche, setNiche] = useState('');
  const [customNiche, setCustomNiche] = useState('');
  const [subNiche, setSubNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [customAudience, setCustomAudience] = useState('');
  const [platform, setPlatform] = useState('Instagram Reels');
  const [contentStyle, setContentStyle] = useState('Educational');
  const [tone, setTone] = useState<string[]>(['Casual', 'Educational']);
  const [experienceLevel, setExperienceLevel] = useState('Intermediate');
  const [creatorDescription, setCreatorDescription] = useState('');

  const toggleTone = (selectedTone: string) => {
    if (tone.includes(selectedTone)) {
      setTone(tone.filter((t) => t !== selectedTone));
    } else {
      if (tone.length >= 2) {
        setTone([tone[1], selectedTone]); // keep last selection + new one
      } else {
        setTone([...tone, selectedTone]);
      }
    }
  };

  const handleNext = () => {
    if (step === 1 && !niche && !customNiche) {
      toast.error('Please select or enter a niche');
      return;
    }
    if (step === 2 && !targetAudience && !customAudience) {
      toast.error('Please select or enter a target audience');
      return;
    }
    if (step === 5 && tone.length === 0) {
      toast.error('Please select at least 1 tone');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 6));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!creatorDescription.trim()) {
      toast.error('Please describe yourself and your content style');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Session expired. Please log in again.');
        router.push('/login');
        return;
      }

      const selectedNiche = customNiche.trim() || niche;
      const selectedAudience = customAudience.trim() || targetAudience;

      const { error } = await supabase.from('creator_profiles').upsert(
        {
          user_id: user.id,
          niche: selectedNiche,
          sub_niche: subNiche.trim() || null,
          target_audience: selectedAudience,
          platform,
          content_style: contentStyle,
          tone,
          experience_level: experienceLevel,
          creator_description: creatorDescription.trim(),
          memory_enabled: true,
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        toast.error(`Error saving profile: ${error.message}`);
        setLoading(false);
        return;
      }

      toast.success('Creator profile saved successfully!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error('Failed to complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Niche' },
    { title: 'Audience' },
    { title: 'Platform' },
    { title: 'Style' },
    { title: 'Tone' },
    { title: 'Identity' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-fuchsia-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">Set Up Your Creator Identity</h1>
          <p className="text-sm text-zinc-400">
            We use these details to generate content strategies tailored specifically to you.
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <Stepper steps={steps} currentStep={step} onStepClick={(s) => setStep(s)} />

        {/* Form Card */}
        <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl">
              {step === 1 && 'Step 1: Choose Your Niche'}
              {step === 2 && 'Step 2: Define Your Target Audience'}
              {step === 3 && 'Step 3: Select Your Primary Platform'}
              {step === 4 && 'Step 4: Select Your Content Style'}
              {step === 5 && 'Step 5: Pick Your Tone of Voice (Select up to 2)'}
              {step === 6 && 'Step 6: Describe Yourself & Experience Level'}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {step === 1 && 'What main industry or topic area do you create content about?'}
              {step === 2 && 'Who is watching, reading, or engaging with your content?'}
              {step === 3 && 'Which platform will we prioritize for default format recommendations?'}
              {step === 4 && 'How do you usually deliver value to your viewers?'}
              {step === 5 && 'Your preferred tone helps us calibrate your script voiceovers and hooks.'}
              {step === 6 && 'Help us understand your background to generate creator-specific angles.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {NICHES.map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => {
                        setNiche(n);
                        setCustomNiche('');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                        niche === n && !customNiche
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-zinc-400">Or enter custom niche:</label>
                  <Input
                    placeholder="e.g. AI Coding & Software Architecture"
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Optional Sub-niche:</label>
                  <Input
                    placeholder="e.g. Fullstack Web Dev for CS Students"
                    value={subNiche}
                    onChange={(e) => setSubNiche(e.target.value)}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {AUDIENCES.map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => {
                        setTargetAudience(a);
                        setCustomAudience('');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                        targetAudience === a && !customAudience
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-zinc-400">Or enter custom audience:</label>
                  <Input
                    placeholder="e.g. College students learning to code"
                    value={customAudience}
                    onChange={(e) => setCustomAudience(e.target.value)}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PLATFORMS.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                      platform === p
                        ? 'border-indigo-500 bg-indigo-950/30 text-indigo-200'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span className="font-semibold text-sm">{p}</span>
                    {platform === p && <Check className="w-4 h-4 text-indigo-400 mt-2" />}
                  </button>
                ))}
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STYLES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setContentStyle(s)}
                    className={`p-3 rounded-xl border text-center font-medium text-sm transition ${
                      contentStyle === s
                        ? 'border-indigo-500 bg-indigo-950/30 text-indigo-200'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Step 5 */}
            {step === 5 && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => {
                    const isSelected = tone.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => toggleTone(t)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {t} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-500">
                  Selected ({tone.length}/2): {tone.join(' + ') || 'None'}
                </p>
              </div>
            )}

            {/* Step 6 */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Experience Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {EXPERIENCE_LEVELS.map((exp) => (
                      <button
                        type="button"
                        key={exp}
                        onClick={() => setExperienceLevel(exp)}
                        className={`p-3 rounded-xl border text-center font-semibold text-sm transition ${
                          experienceLevel === exp
                            ? 'border-indigo-500 bg-indigo-950/30 text-indigo-200'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {exp}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Describe yourself and the type of content you usually create:
                  </label>
                  <Textarea
                    placeholder="e.g. I am a college Computer Science student sharing real coding tips, software engineering tools, and study routines for beginner coders."
                    value={creatorDescription}
                    onChange={(e) => setCreatorDescription(e.target.value)}
                    rows={4}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={handleBack} className="border-zinc-800">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : <div />}

              {step < 6 ? (
                <Button type="button" onClick={handleNext} className="btn-primary-gradient">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary-gradient">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save & Go to Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
