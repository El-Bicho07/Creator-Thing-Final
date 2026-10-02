import React, { useState } from 'react';
import { User, Plus, Trash2, Edit3, Check, DollarSign, BarChart3, Users, Sparkles } from 'lucide-react';
import { ProfileStep } from './ProfileStep';
import { api } from '../services/api';

export function ProfileManager({
  profiles,
  activeProfile,
  setActiveProfile,
  onReloadProfiles,
  showToast
}) {
  const [editingProfile, setEditingProfile] = useState(null);

  const handleSaveProfile = async (profileData) => {
    try {
      const res = await api.saveProfile(profileData);
      showToast?.('Creator profile saved successfully!', 'success');
      onReloadProfiles();
      setActiveProfile(res.data);
      setEditingProfile(null);
    } catch (err) {
      showToast?.(err.message || 'Failed to save profile', 'error');
    }
  };

  const handleDeleteProfile = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this creator profile?')) return;
    try {
      await api.deleteProfile(id);
      showToast?.('Profile deleted', 'info');
      onReloadProfiles();
    } catch (err) {
      showToast?.(err.message || 'Failed to delete', 'error');
    }
  };

  if (editingProfile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={() => setEditingProfile(null)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            &larr; Back to Profiles List
          </button>
        </div>
        <ProfileStep
          profile={editingProfile}
          setProfile={setEditingProfile}
          savedProfiles={profiles}
          onSaveProfile={handleSaveProfile}
          onNext={() => handleSaveProfile(editingProfile)}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-brand-400" />
            <h2 className="text-xl font-bold">Saved Creator Profiles & Media Kits</h2>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Manage your personas, rate cards, and verified demographic packages for instant pitch generation.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingProfile({
              name: '',
              niche: '',
              platforms: [],
              metrics: {},
              demographics: {},
              rateCard: {},
              contactInfo: {}
            })
          }
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-md shadow-brand-500/25 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          Add New Profile
        </button>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {profiles.map((p) => {
          const isActive = activeProfile?.id === p.id;

          return (
            <div
              key={p.id}
              onClick={() => setActiveProfile(p)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer space-y-5 relative ${
                isActive
                  ? 'border-brand-500 bg-white dark:bg-slate-900 shadow-md ring-1 ring-brand-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              {/* Active Indicator Badge */}
              {isActive && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    <Check className="w-3 h-3" /> Active Pitch Profile
                  </span>
                </div>
              )}

              {/* Identity */}
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center mb-3 shadow">
                  {p.name?.slice(0, 2).toUpperCase() || 'CR'}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {p.name}
                </h3>
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                  {p.niche}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                  {p.bio || 'No bio provided'}
                </p>
              </div>

              {/* Metrics preview */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Reach</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {p.metrics?.totalReach || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Avg Eng.</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {p.metrics?.avgEngagementRate || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Base Rate</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ${p.rateCard?.dedicatedReelTiktok || p.rateCard?.dedicatedYoutube || 0}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingProfile(p);
                  }}
                  className="flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Rate Card & Bio
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteProfile(p.id, e)}
                  className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                  title="Delete profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
