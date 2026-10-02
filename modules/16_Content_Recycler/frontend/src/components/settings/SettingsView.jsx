import React, { useState } from 'react';
import { 
  Settings, User, Sliders, Shield, Database, 
  RotateCw, Check, AlertTriangle, AtSign, Award, Sparkles, Trash2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { postsAPI } from '../../services/api';

export default function SettingsView({ dbStatus, postCount, onReloadDemo }) {
  const { user, updateProfile } = useAuth();
  const { notify } = useNotification();

  const [saving, setSaving] = useState(false);
  const [handle, setHandle] = useState(user?.creatorProfile?.handle || '@arjun_codes');
  const [niche, setNiche] = useState(user?.creatorProfile?.niche || 'Full-Stack Web & System Design');
  const [followers, setFollowers] = useState(user?.creatorProfile?.followers || 48200);
  const [bio, setBio] = useState(user?.creatorProfile?.bio || 'Building fullstack web apps, breaking down complex software architectures.');

  // Baseline tuning
  const [savesMultiplier, setSavesMultiplier] = useState(user?.baselineWeights?.savesMultiplier || 2.0);
  const [sharesMultiplier, setSharesMultiplier] = useState(user?.baselineWeights?.sharesMultiplier || 1.5);
  const [dormantThreshold, setDormantThreshold] = useState(user?.baselineWeights?.dormantDaysThreshold || 60);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        creatorProfile: {
          handle,
          niche,
          followers: parseInt(followers, 10) || 0,
          bio,
        },
        baselineWeights: {
          engagementWeight: 1.0,
          reachWeight: 0.8,
          savesMultiplier: parseFloat(savesMultiplier),
          sharesMultiplier: parseFloat(sharesMultiplier),
          dormantDaysThreshold: parseInt(dormantThreshold, 10),
        },
      });
      notify('Settings & baseline configuration saved!', 'success');
    } catch (err) {
      notify('Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
      
      {/* Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-8">
        
        {/* Creator Profile Section */}
        <div className="p-6 rounded-3xl card-glass border border-slate-800/80 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-lime-accent" />
              Creator Profile & Context
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalize your creator persona and content niche for customized recycling copy suggestions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Instagram Handle
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-charcoal-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-lime-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Content Niche / Domain
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-charcoal-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-lime-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Current Follower Count
              </label>
              <input
                type="number"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-charcoal-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-lime-accent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Creator Bio / Value Proposition
              </label>
              <textarea
                rows="2"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-charcoal-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-lime-accent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Algorithmic Baseline Weights Customizer */}
        <div className="p-6 rounded-3xl card-glass border border-slate-800/80 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-lime-accent" />
              Algorithmic Baseline Tuning
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tune how the recommendation engine weights saves, shares, and dormant half-life.
            </p>
          </div>

          <div className="space-y-6">
            {/* Saves Multiplier */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200">Saves Weight Multiplier</span>
                  <p className="text-[11px] text-slate-500">Instagram algorithm heavily weights bookmarks as evergreen intent</p>
                </div>
                <span className="text-lime-bright font-mono font-bold text-sm bg-lime-muted px-2.5 py-0.5 rounded border border-lime-500/30">
                  {savesMultiplier}x
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.1"
                value={savesMultiplier}
                onChange={(e) => setSavesMultiplier(e.target.value)}
                className="w-full accent-lime-accent bg-charcoal-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Shares Multiplier */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200">Shares Weight Multiplier</span>
                  <p className="text-[11px] text-slate-500">Viral transmission factor across DMs and external stories</p>
                </div>
                <span className="text-sky-400 font-mono font-bold text-sm bg-sky-950 px-2.5 py-0.5 rounded border border-sky-500/30">
                  {sharesMultiplier}x
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={sharesMultiplier}
                onChange={(e) => setSharesMultiplier(e.target.value)}
                className="w-full accent-sky-400 bg-charcoal-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Dormant Days Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200">Dormant Period Threshold</span>
                  <p className="text-[11px] text-slate-500">Minimum days elapsed before a post is considered safe for re-posting without audience feed fatigue</p>
                </div>
                <span className="text-amber-400 font-mono font-bold text-sm bg-amber-950 px-2.5 py-0.5 rounded border border-amber-500/30">
                  {dormantThreshold} days
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="120"
                step="5"
                value={dormantThreshold}
                onChange={(e) => setDormantThreshold(e.target.value)}
                className="w-full accent-amber-400 bg-charcoal-800 h-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-6 rounded-xl bg-lime-accent hover:bg-lime-bright text-charcoal-950 font-bold text-xs flex items-center gap-2 shadow-glow-lime transition-all"
            >
              {saving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Updating...' : 'Save Configuration & Recalculate'}
            </button>
          </div>
        </div>

      </form>

      {/* System Diagnostics & Demonstration Controls */}
      <div className="p-6 rounded-3xl card-glass border border-slate-800/80 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            Hackathon System Diagnostics & Database Status
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Technical status indicators for Smart India Hackathon jury review.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-charcoal-850/80 border border-slate-800 text-xs space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Persistence Mode</span>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-lime-accent" />
              {dbStatus?.mode || 'Demo Engine'}
            </p>
            <p className="text-[11px] text-slate-400">
              {dbStatus?.isMemoryFallback ? 'Resilient in-memory store' : 'MongoDB Atlas cloud database'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-charcoal-850/80 border border-slate-800 text-xs space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Content Library</span>
            <p className="text-sm font-bold text-white">
              {postCount} Ingested Posts
            </p>
            <p className="text-[11px] text-slate-400">
              Labeled synthetic dataset
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-charcoal-850/80 border border-slate-800 text-xs space-y-1">
            <span className="text-slate-500 text-[10px] uppercase font-bold">AI / NLP Algorithm</span>
            <p className="text-sm font-bold text-white">
              TF-IDF + Heuristics
            </p>
            <p className="text-[11px] text-slate-400">
              Zero-cost pure JS vectorizer
            </p>
          </div>
        </div>

        {/* Reseed / Reset Actions */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Need to refresh the presentation dataset for the judges?
          </div>
          <button
            onClick={onReloadDemo}
            className="px-4 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5 text-lime-accent" />
            Reload 50 Synthetic Records
          </button>
        </div>
      </div>

    </div>
  );
}
