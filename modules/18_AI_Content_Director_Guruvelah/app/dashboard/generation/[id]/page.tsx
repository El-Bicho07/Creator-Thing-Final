'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/client';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { Header } from '@/components/dashboard/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Sparkles,
  Copy,
  Bookmark,
  BookmarkCheck,
  Download,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Video,
  FileText,
  Camera,
  Layers,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function GenerationWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const generationId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [genData, setGenData] = useState<any>(null);

  // Editable local state
  const [isSaved, setIsSaved] = useState(false);
  const [selectedHookIndex, setSelectedHookIndex] = useState(0);
  const [scriptContent, setScriptContent] = useState<any>(null);
  const [captionText, setCaptionText] = useState('');
  const [ctaText, setCtaText] = useState('');

  // Regeneration loading state
  const [regenSection, setRegenSection] = useState<string | null>(null);

  // Feedback State
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    async function loadGeneration() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('generations')
          .select('*')
          .eq('id', generationId)
          .single();

        if (error || !data) {
          toast.error('Generation not found.');
          router.push('/dashboard/history');
          return;
        }

        setGenData(data);
        setIsSaved(data.is_saved || false);
        setSelectedHookIndex(data.selected_hook_index || 0);
        setScriptContent(data.script);
        setCaptionText(data.caption || '');
        setCtaText(data.cta || '');
      } catch (err) {
        // Fallback for offline view
      } finally {
        setLoading(false);
      }
    }
    loadGeneration();
  }, [generationId, router]);

  // Copy Helper
  const handleCopy = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${sectionName} to clipboard!`);
  };

  // Toggle Save Status
  const handleToggleSave = async () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      const supabase = createClient();
      await supabase
        .from('generations')
        .update({ is_saved: nextSaved })
        .eq('id', generationId);

      toast.success(nextSaved ? 'Saved to collection!' : 'Removed from saved ideas');
    } catch (err) {
      toast.error('Failed to update save status');
    }
  };

  // Save Edits
  const handleSaveEdits = async () => {
    try {
      const supabase = createClient();
      const editedFields = ['script', 'caption', 'cta'];
      await supabase
        .from('generations')
        .update({
          script: scriptContent,
          caption: captionText,
          cta: ctaText,
          selected_hook_index: selectedHookIndex,
          edited_fields: editedFields,
        })
        .eq('id', generationId);

      toast.success('Edits saved successfully!');
    } catch (err) {
      toast.error('Failed to save edits');
    }
  };

  // Section Regeneration
  const handleRegenerateSection = async (section: string, modifier?: string) => {
    setRegenSection(section);
    toast.info(`Regenerating ${section}...`);

    try {
      const res = await fetch(`/api/generations/${generationId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, modifier }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Regeneration failed');
      }

      if (section === 'hooks' && data.hooks) {
        setGenData((prev: any) => ({ ...prev, hooks: data.hooks }));
      } else if (section === 'script' && data.script) {
        setScriptContent(data.script);
        if (data.shot_list) {
          setGenData((prev: any) => ({ ...prev, shot_list: data.shot_list }));
        }
      } else if (section === 'caption' && data.caption) {
        setCaptionText(data.caption);
        if (data.hashtags) {
          setGenData((prev: any) => ({ ...prev, hashtags: data.hashtags }));
        }
      }

      toast.success(`${section} regenerated!`);
    } catch (err: any) {
      toast.error(err.message || 'Regeneration error');
    } finally {
      setRegenSection(null);
    }
  };

  // Submit Feedback
  const handleSubmitFeedback = async (selectedRating: number) => {
    setRating(selectedRating);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId,
          rating: selectedRating,
          feedback: feedbackText || undefined,
        }),
      });

      if (res.ok) {
        setFeedbackSubmitted(true);
        toast.success('Thank you for your feedback!');
      }
    } catch (err) {
      toast.error('Failed to submit feedback.');
    }
  };

  // Export Download
  const handleDownload = (formatType: 'md' | 'txt') => {
    if (!genData) return;

    const angle = genData.creator_angle;
    const hooksText = genData.hooks?.hooks?.map((h: any, i: number) => `${i + 1}. [${h.type}] ${h.text}`).join('\n') || '';

    let scriptText = '';
    if (scriptContent?.kind === 'video') {
      scriptText = scriptContent.segments.map((s: any) => `[${s.startSec}–${s.endSec}s] ${s.label}\nVOICE: ${s.voiceover}\nVISUAL: ${s.visual}\nTEXT: ${s.onScreenText}`).join('\n\n');
    } else if (scriptContent?.assembledPost) {
      scriptText = scriptContent.assembledPost;
    } else if (scriptContent?.thread) {
      scriptText = scriptContent.thread.map((t: string, i: number) => `Tweet ${i + 1}:\n${t}`).join('\n\n');
    }

    const content = `
# CONTENT STRATEGY: ${genData.input_topic}
Platform: ${genData.platform} | Goal: ${genData.content_goal}
Created: ${new Date(genData.created_at).toLocaleDateString()}

## CREATOR ANGLE
${angle}

## 7 VIRAL HOOKS
${hooksText}

## SCRIPT
${scriptText}

## CTA
${ctaText}

## CAPTION
${captionText}

## HASHTAGS
${Array.isArray(genData.hashtags) ? genData.hashtags.join(' ') : genData.hashtags}
`.trim();

    const blob = new Blob([content], { type: formatType === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-package-${generationId}.${formatType}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!genData) return null;

  const angleDetails = genData.angle_details || {};
  const hooksList = genData.hooks?.hooks || [];
  const shotList = genData.shot_list || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Header />

        {/* Action Header Bar */}
        <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-16 z-30 backdrop-blur-md">
          <div className="flex items-center space-x-2 text-xs text-zinc-400">
            <span>Platform: <strong className="text-zinc-200">{genData.platform}</strong></span>
            <span>•</span>
            <span>Goal: <strong className="text-zinc-200">{genData.content_goal}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSave}
              className={`border-zinc-800 ${isSaved ? 'text-amber-400 bg-amber-950/30' : ''}`}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4 mr-1.5 fill-current" /> : <Bookmark className="w-4 h-4 mr-1.5" />}
              {isSaved ? 'Saved' : 'Save Idea'}
            </Button>

            <Button variant="outline" size="sm" onClick={handleSaveEdits} className="border-zinc-800">
              <Save className="w-4 h-4 mr-1.5" /> Save Edits
            </Button>

            <Button variant="outline" size="sm" onClick={() => handleDownload('md')} className="border-zinc-800">
              <Download className="w-4 h-4 mr-1.5" /> Export .md
            </Button>
          </div>
        </div>

        <main className="p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Main Content Workspace */}
          <div className="lg:col-span-2 space-y-6">

            {/* HOOKS SECTION */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" /> 7 Viral Hooks
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-xs">
                    Select a hook framework for your script. Top pick matches your goal: {genData.content_goal}.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRegenerateSection('hooks')}
                  disabled={regenSection === 'hooks'}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${regenSection === 'hooks' ? 'animate-spin' : ''}`} />
                  Regenerate Hooks
                </Button>
              </CardHeader>

              <CardContent className="space-y-3">
                {hooksList.map((hook: any, idx: number) => {
                  const isSelected = selectedHookIndex === idx;
                  const isTopPick = genData.hooks?.topPickIndex === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedHookIndex(idx)}
                      className={`p-4 rounded-xl border transition cursor-pointer relative ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/30 text-zinc-100 shadow-md ring-1 ring-indigo-500/50'
                          : 'border-zinc-800/80 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <Badge variant="accent">{hook.type}</Badge>
                          <span className="text-[11px] text-zinc-500 font-mono">#{hook.styleTag}</span>
                          {isTopPick && (
                            <Badge variant="success" className="text-[10px]">
                              ★ Top Pick
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(hook.text, `Hook #${idx + 1}`);
                          }}
                          className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <p className="font-semibold text-sm leading-snug">{hook.text}</p>
                      <p className="text-xs text-zinc-400 mt-1">{hook.rationale}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* SCRIPT TIMELINE SECTION */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Video className="w-5 h-5 text-indigo-400" /> Script Timeline
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-xs">
                    {scriptContent?.kind === 'video'
                      ? `Timestamped segments for ${scriptContent.durationSec}s video.`
                      : `Formatted post structure for ${genData.platform}.`}
                  </CardDescription>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(JSON.stringify(scriptContent), 'Script')}
                    className="text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Script
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRegenerateSection('script')}
                    disabled={regenSection === 'script'}
                    className="text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${regenSection === 'script' ? 'animate-spin' : ''}`} />
                    Regenerate Script
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* VIDEO SCRIPT TIMELINE */}
                {scriptContent?.kind === 'video' && Array.isArray(scriptContent.segments) && (
                  <div className="space-y-3">
                    {scriptContent.segments.map((seg: any, idx: number) => (
                      <div key={idx} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-xs font-mono text-zinc-300 font-bold">
                              {seg.startSec}–{seg.endSec}s
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {seg.label}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div>
                            <span className="font-semibold text-indigo-400">VOICE: </span>
                            <Textarea
                              value={seg.voiceover}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                const newSegs = [...scriptContent.segments];
                                newSegs[idx].voiceover = e.target.value;
                                setScriptContent({ ...scriptContent, segments: newSegs });
                              }}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 text-xs mt-1"
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-zinc-400">
                            <div><strong className="text-zinc-300">VISUAL:</strong> {seg.visual}</div>
                            <div><strong className="text-zinc-300">TEXT:</strong> {seg.onScreenText || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TEXT POST (LinkedIn / X Thread) */}
                {scriptContent?.kind === 'text_post' && (
                  <div className="space-y-3">
                    {scriptContent.assembledPost && (
                      <Textarea
                        value={scriptContent.assembledPost}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScriptContent({ ...scriptContent, assembledPost: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-200 text-sm leading-relaxed"
                        rows={12}
                      />
                    )}
                    {scriptContent.thread && (
                      <div className="space-y-2">
                        {scriptContent.thread.map((tweet: string, idx: number) => (
                          <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs space-y-1">
                            <div className="font-semibold text-indigo-400">Tweet {idx + 1} ({tweet.length}/280)</div>
                            <p className="text-zinc-200">{tweet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* DERIVED SHOT LIST (Video platforms only) */}
            {shotList.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-400" /> Derived Shot List
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-xs">
                    Deterministic visual cues derived from script timeline.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-zinc-300">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Shot #</th>
                        <th className="p-2.5">Time</th>
                        <th className="p-2.5">Phase</th>
                        <th className="p-2.5">Visual</th>
                        <th className="p-2.5">Camera Framing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {shotList.map((item: any) => (
                        <tr key={item.shotNumber} className="hover:bg-zinc-950/50">
                          <td className="p-2.5 font-bold text-indigo-400">#{item.shotNumber}</td>
                          <td className="p-2.5 font-mono">{item.timeRange}</td>
                          <td className="p-2.5">{item.phase}</td>
                          <td className="p-2.5">{item.visualDescription}</td>
                          <td className="p-2.5">{item.cameraFraming}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* CAPTION, CTA & HASHTAGS */}
            <Card className="bg-zinc-900 border-zinc-800 space-y-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" /> Caption, CTA & Hashtags
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRegenerateSection('caption')}
                  disabled={regenSection === 'caption'}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${regenSection === 'caption' ? 'animate-spin' : ''}`} />
                  Regenerate Caption
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Spoken / Written CTA</label>
                  <Input
                    value={ctaText}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCtaText(e.target.value)}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Social Caption</label>
                  <Textarea
                    value={captionText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCaptionText(e.target.value)}
                    rows={4}
                    className="bg-zinc-950 border-zinc-800 text-xs"
                  />
                </div>

                {Array.isArray(genData.hashtags) && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Hashtags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {genData.hashtags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="accent" className="text-xs font-mono">
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* FEEDBACK CARD */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Was this content package useful?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {feedbackSubmitted ? (
                  <div className="text-xs text-emerald-400 font-medium">
                    ✓ Feedback submitted! Thank you for helping train your Creator Content Memory.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant={rating === 1 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSubmitFeedback(1)}
                        className="border-zinc-800"
                      >
                        <ThumbsUp className="w-4 h-4 mr-1.5 text-emerald-400" /> Useful 👍
                      </Button>
                      <Button
                        variant={rating === -1 ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => setRating(-1)}
                        className="border-zinc-800"
                      >
                        <ThumbsDown className="w-4 h-4 mr-1.5 text-red-400" /> Needs Work 👎
                      </Button>
                    </div>

                    {rating === -1 && (
                      <div className="space-y-2 pt-2 border-t border-zinc-800">
                        <label className="text-xs text-zinc-400">What should be improved?</label>
                        <Input
                          placeholder="e.g. Script was too long, hook wasn't bold enough..."
                          value={feedbackText}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeedbackText(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-xs"
                        />
                        <Button size="sm" onClick={() => handleSubmitFeedback(-1)} className="btn-primary-gradient">
                          Submit Feedback
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* RIGHT COLUMN: Sticky Strategy Rail */}
          <div className="space-y-6 lg:sticky lg:top-24 h-fit">

            {/* THE ANGLE EQUATION CARD (The Differentiator) */}
            <Card className="bg-gradient-to-b from-indigo-950/40 via-zinc-900 to-zinc-900 border-indigo-500/40 shadow-xl">
              <CardHeader>
                <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Layers className="w-4 h-4" />
                  <span>The Angle Equation</span>
                </div>
                <CardTitle className="text-lg font-bold text-zinc-100">
                  Creator Angle
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs">
                  Trend + You + Pain Point + Platform + Goal = Unique Angle
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="p-3 bg-zinc-950/80 border border-indigo-500/30 rounded-xl text-indigo-200 text-sm font-bold leading-relaxed">
                  "{genData.creator_angle}"
                </div>

                {angleDetails.angleReason && (
                  <div className="space-y-1 text-xs">
                    <span className="font-semibold text-zinc-300">Why this fits YOU:</span>
                    <p className="text-zinc-400 leading-relaxed">{angleDetails.angleReason}</p>
                  </div>
                )}

                {angleDetails.audiencePainPoint && (
                  <div className="space-y-1 text-xs pt-2 border-t border-zinc-800/80">
                    <span className="font-semibold text-zinc-300">Audience Pain Point Addressed:</span>
                    <p className="text-zinc-400">{angleDetails.audiencePainPoint}</p>
                  </div>
                )}

                {angleDetails.uniquePerspective && (
                  <div className="space-y-1 text-xs pt-2 border-t border-zinc-800/80">
                    <span className="font-semibold text-zinc-300">Unique Perspective:</span>
                    <p className="text-zinc-400">{angleDetails.uniquePerspective}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* RECOMMENDED FORMAT CARD */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-zinc-200">Recommended Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <Badge variant="accent" className="text-sm">
                  {genData.format}
                </Badge>
                {genData.format_details?.reason && (
                  <p className="text-zinc-400 leading-relaxed">{genData.format_details.reason}</p>
                )}
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
