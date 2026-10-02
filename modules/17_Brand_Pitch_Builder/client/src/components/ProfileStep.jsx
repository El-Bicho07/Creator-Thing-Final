import React, { useState } from 'react';
import {
  User,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  DollarSign,
  BarChart3,
  Users,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { demoCreators } from '../mock/demoPresets';
import { MissingDataAlert } from './common/MissingDataAlert';

export function ProfileStep({
  profile,
  setProfile,
  savedProfiles,
  onSaveProfile,
  onNext,
  showToast
}) {
  const [activePlatformInput, setActivePlatformInput] = useState({
    platform: 'Instagram',
    handle: '',
    followers: '',
    url: ''
  });

  const [activeWinInput, setActiveWinInput] = useState('');

  // Missing metrics calculation for real-time feedback
  const getMissingMetrics = () => {
    const list = [];
    if (!profile.name) list.push("Creator Name");
    if (!profile.niche) list.push("Niche");
    if (!profile.metrics?.totalReach) list.push("Total Reach");
    if (!profile.metrics?.avgEngagementRate) list.push("Average Engagement Rate");
    if (!profile.demographics?.ageSplit && !profile.demographics?.genderSplit) list.push("Audience Demographics");
    if (!profile.rateCard || Object.keys(profile.rateCard).length === 0) list.push("Rate Card Pricing");
    if (!profile.pastBrands) list.push("Past Brand Collaborations");
    return list;
  };

  const missingList = getMissingMetrics();

  const handleAddPlatform = () => {
    if (!activePlatformInput.handle) return;
    const updated = [...(profile.platforms || []), activePlatformInput];
    setProfile({ ...profile, platforms: updated });
    setActivePlatformInput({ platform: 'Instagram', handle: '', followers: '', url: '' });
  };

  const handleRemovePlatform = (idx) => {
    const updated = (profile.platforms || []).filter((_, i) => i !== idx);
    setProfile({ ...profile, platforms: updated });
  };

  const handleAddWin = () => {
    if (!activeWinInput.trim()) return;
    const updated = [...(profile.notableWins || []), activeWinInput.trim()];
    setProfile({ ...profile, notableWins: updated });
    setActiveWinInput('');
  };

  const handleRemoveWin = (idx) => {
    const updated = (profile.notableWins || []).filter((_, i) => i !== idx);
    setProfile({ ...profile, notableWins: updated });
  };

  const loadPreset = (preset) => {
    setProfile(preset);
    showToast?.(`Loaded profile for ${preset.name}`, 'info');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/30 text-brand-300 border border-brand-400/30">
              Step 1 of 4
            </span>
            <h2 className="text-xl font-bold">Creator Profile & Rate Card</h2>
          </div>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Save your verified stats, audience demographics, and rate card. The AI will weave these exact credentials into your proposals without fabricating metrics.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Presets:</span>
          {demoCreators.map((creator) => (
            <button
              key={creator.id}
              onClick={() => loadPreset(creator)}
              className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors whitespace-nowrap"
            >
              {creator.name}
            </button>
          ))}
        </div>
      </div>

      {/* Missing Data Warning Alert */}
      {missingList.length > 0 && (
        <MissingDataAlert missingMetrics={missingList} />
      )}

      {/* Main Profile Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-8">
        {/* Core Identity */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <User className="w-5 h-5 text-brand-500" />
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Creator / Channel Name *
              </label>
              <input
                type="text"
                value={profile.name || ''}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Content Niche & Specialty *
              </label>
              <input
                type="text"
                value={profile.niche || ''}
                onChange={(e) => setProfile({ ...profile, niche: e.target.value })}
                placeholder="e.g. Tech, Productivity & Remote Work"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bio & Value Proposition
              </label>
              <textarea
                rows={2}
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Brief summary of your channel's positioning, audience relationship, and creative style..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Platforms and Handles */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Social Platforms & Follower Counts
          </h3>

          {/* Active Platform Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {(profile.platforms || []).map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                    <span>{p.platform}</span>
                    <span className="text-slate-400 font-normal">{p.handle}</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                    {p.followers} followers
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePlatform(idx)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Platform Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <select
              value={activePlatformInput.platform}
              onChange={(e) => setActivePlatformInput({ ...activePlatformInput, platform: e.target.value })}
              className="px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
            >
              <option value="YouTube">YouTube</option>
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="Newsletter">Newsletter</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Twitter/X">Twitter/X</option>
              <option value="Podcast">Podcast</option>
            </select>

            <input
              type="text"
              placeholder="Handle (e.g. @alextech)"
              value={activePlatformInput.handle}
              onChange={(e) => setActivePlatformInput({ ...activePlatformInput, handle: e.target.value })}
              className="px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
            />

            <input
              type="text"
              placeholder="Followers (e.g. 95,000)"
              value={activePlatformInput.followers}
              onChange={(e) => setActivePlatformInput({ ...activePlatformInput, followers: e.target.value })}
              className="px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
            />

            <button
              type="button"
              onClick={handleAddPlatform}
              className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Platform
            </button>
          </div>
        </div>

        {/* Engagement & Performance Metrics */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            Verified Metrics & Engagement Rates
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Multi-Platform Reach *
              </label>
              <input
                type="text"
                value={profile.metrics?.totalReach || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    metrics: { ...(profile.metrics || {}), totalReach: e.target.value }
                  })
                }
                placeholder="e.g. 199,500"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Average Engagement Rate *
              </label>
              <input
                type="text"
                value={profile.metrics?.avgEngagementRate || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    metrics: { ...(profile.metrics || {}), avgEngagementRate: e.target.value }
                  })
                }
                placeholder="e.g. 4.8%"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Average Video / Reel Views
              </label>
              <input
                type="text"
                value={profile.metrics?.avgReelViews || profile.metrics?.avgYoutubeViews || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    metrics: { ...(profile.metrics || {}), avgReelViews: e.target.value }
                  })
                }
                placeholder="e.g. 65,000 views"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Demographics */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <Users className="w-5 h-5 text-amber-500" />
            Audience Demographics & Psychographics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Age Distribution
              </label>
              <input
                type="text"
                value={profile.demographics?.ageSplit || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    demographics: { ...(profile.demographics || {}), ageSplit: e.target.value }
                  })
                }
                placeholder="e.g. 18-24 (28%), 25-34 (54%), 35-44 (15%)"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gender Breakdown
              </label>
              <input
                type="text"
                value={profile.demographics?.genderSplit || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    demographics: { ...(profile.demographics || {}), genderSplit: e.target.value }
                  })
                }
                placeholder="e.g. 64% Male, 33% Female, 3% Non-binary"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Top Geographic Locations
              </label>
              <input
                type="text"
                value={profile.demographics?.topLocations || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    demographics: { ...(profile.demographics || {}), topLocations: e.target.value }
                  })
                }
                placeholder="e.g. US (58%), UK (14%), Canada (9%)"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Core Audience Persona / Professions
              </label>
              <input
                type="text"
                value={profile.demographics?.coreAudience || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    demographics: { ...(profile.demographics || {}), coreAudience: e.target.value }
                  })
                }
                placeholder="e.g. Software engineers, founders, knowledge workers"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Content Style & Past Brand Collaborations */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Content Style & Social Proof
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Content Style, Tone & Aesthetics
              </label>
              <input
                type="text"
                value={profile.contentStyle || ''}
                onChange={(e) => setProfile({ ...profile, contentStyle: e.target.value })}
                placeholder="e.g. Clean, cinematic minimal tutorials with high-signal screen teardowns"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Past Brand Collaborations (Comma separated)
              </label>
              <input
                type="text"
                value={profile.pastBrands || ''}
                onChange={(e) => setProfile({ ...profile, pastBrands: e.target.value })}
                placeholder="e.g. Logitech, Keychron, Raycast, Linear, Setapp"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            {/* Notable Wins list */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notable Wins, Conversion Stats, or Case Studies
              </label>
              <div className="space-y-2 mb-2">
                {(profile.notableWins || []).map((win, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <span className="text-slate-700 dark:text-slate-300">{win}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWin(idx)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Generated 3,200+ paid trial conversions for Raycast in Q4 2025"
                  value={activeWinInput}
                  onChange={(e) => setActiveWinInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWin())}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddWin}
                  className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200"
                >
                  Add Win
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rate Card */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Standard Rate Card (USD)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Dedicated Video / Integration
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400">$</span>
                <input
                  type="number"
                  value={profile.rateCard?.dedicatedYoutube || ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      rateCard: { ...(profile.rateCard || {}), dedicatedYoutube: parseFloat(e.target.value) || 0 }
                    })
                  }
                  placeholder="2400"
                  className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Dedicated Short / Reel
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400">$</span>
                <input
                  type="number"
                  value={profile.rateCard?.dedicatedReelTiktok || ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      rateCard: { ...(profile.rateCard || {}), dedicatedReelTiktok: parseFloat(e.target.value) || 0 }
                    })
                  }
                  placeholder="950"
                  className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Reel + Story Bundle
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400">$</span>
                <input
                  type="number"
                  value={profile.rateCard?.reelStoryBundle || ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      rateCard: { ...(profile.rateCard || {}), reelStoryBundle: parseFloat(e.target.value) || 0 }
                    })
                  }
                  placeholder="1250"
                  className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Newsletter Sponsor Slot
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400">$</span>
                <input
                  type="number"
                  value={profile.rateCard?.newsletterSponsorship || ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      rateCard: { ...(profile.rateCard || {}), newsletterSponsorship: parseFloat(e.target.value) || 0 }
                    })
                  }
                  placeholder="750"
                  className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                30-Day Paid Ad Usage Rights
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400">$</span>
                <input
                  type="number"
                  value={profile.rateCard?.thirtyDayUsageRights || ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      rateCard: { ...(profile.rateCard || {}), thirtyDayUsageRights: parseFloat(e.target.value) || 0 }
                    })
                  }
                  placeholder="400"
                  className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Integrated Mid-Roll
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400">$</span>
                <input
                  type="number"
                  value={profile.rateCard?.integratedYoutube || ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      rateCard: { ...(profile.rateCard || {}), integratedYoutube: parseFloat(e.target.value) || 0 }
                    })
                  }
                  placeholder="1200"
                  className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <ExternalLink className="w-5 h-5 text-blue-500" />
            Contact & Booking Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Booking Email *
              </label>
              <input
                type="email"
                value={profile.contactInfo?.email || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    contactInfo: { ...(profile.contactInfo || {}), email: e.target.value }
                  })
                }
                placeholder="collabs@yourdomain.com"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Media Kit / Portfolio URL
              </label>
              <input
                type="url"
                value={profile.contactInfo?.mediaKitUrl || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    contactInfo: { ...(profile.contactInfo || {}), mediaKitUrl: e.target.value }
                  })
                }
                placeholder="https://yourdomain.com/mediakit"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={() => onSaveProfile(profile)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-sm"
        >
          <Save className="w-4 h-4 text-brand-500" />
          Save Profile to Database
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-lg shadow-brand-500/25 group"
        >
          Next: Brand Information
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
