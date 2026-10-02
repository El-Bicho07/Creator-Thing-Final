import React, { useState } from 'react';
import {
  User,
  Building2,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Key,
  Info
} from 'lucide-react';

const COMMON_NICHES = [
  "Tech & Gadgets",
  "Fitness & Health",
  "Beauty & Skincare",
  "Fashion & Style",
  "Lifestyle & Wellness",
  "Gaming & Esports",
  "Food & Cooking",
  "Travel & Adventure",
  "Business & Finance",
  "Education & Productivity"
];

const GOAL_OPTIONS = [
  "Awareness",
  "Sales",
  "Product Launch",
  "UGC"
];

const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'bold', label: 'Bold' },
  { id: 'minimalist', label: 'Minimalist' }
];

export function MinimalPitchForm({
  formData,
  setFormData,
  onGenerate,
  isGenerating,
  aiStatus
}) {
  const [showOptional, setShowOptional] = useState(false);

  const isFormValid =
    formData.creatorName.trim().length > 0 &&
    formData.socialLink.trim().length > 0 &&
    formData.niche.trim().length > 0 &&
    formData.brandName.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid || isGenerating) return;
    onGenerate();
  };

  const isKeyPlaceholder = aiStatus?.isPlaceholder || !aiStatus?.hasGeminiKey;

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Friendly API Key Banner if placeholder is detected */}
      {isKeyPlaceholder && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <Key className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>Setup note for live Gemini AI:</span>
          </div>
          <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
            Open the <strong>.env</strong> file in the file explorer on the left, replace <code>PASTE_YOUR_KEY_HERE</code> with your key, save with <strong>Ctrl+S</strong>, then restart the app.
          </p>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
            (You can still test and generate a proposal right now in preview mode.)
          </p>
        </div>
      )}

      {/* Main Single-Screen Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Section 1: Creator */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>1. Creator Information</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Name / Channel Name *
              </label>
              <input
                type="text"
                value={formData.creatorName}
                onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Main Social Link or Handle *
              </label>
              <input
                type="text"
                value={formData.socialLink}
                onChange={(e) => setFormData({ ...formData, socialLink: e.target.value })}
                placeholder="e.g. instagram.com/yourhandle or @yourhandle"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Your Instagram or YouTube link
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Niche *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.niche}
                  onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                  placeholder="e.g. Fitness, Beauty, Tech"
                  className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                />
                <select
                  value={formData.niche}
                  onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                  className="w-32 px-2 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-200 focus:outline-none"
                >
                  <option value="">Suggestions</option>
                  {COMMON_NICHES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                e.g. Fitness, Beauty, Tech
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Brand */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>2. Brand to Pitch</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Brand Name *
              </label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                placeholder="e.g. Nike, Notion, Glossier"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Brand Website (Optional)
              </label>
              <input
                type="text"
                value={formData.brandWebsite}
                onChange={(e) => setFormData({ ...formData, brandWebsite: e.target.value })}
                placeholder="https://brand.com (optional)"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Goal */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>3. Campaign Goal</span>
          </div>

          <div>
            <select
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            >
              {GOAL_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              What should this campaign achieve?
            </p>
          </div>
        </div>

        {/* Collapsible: Add more details (optional) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center justify-between w-full py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <span>Add more details (optional)</span>
            {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showOptional && (
            <div className="mt-3 space-y-4 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
              {/* Tone Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tone of Pitch
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, tone: t.id })}
                      className={`py-2 px-3 text-xs rounded-xl border text-center transition-all ${
                        formData.tone === t.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Numbers: Follower count & Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Follower Count or Reach (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.followerCount}
                    onChange={(e) => setFormData({ ...formData, followerCount: e.target.value })}
                    placeholder="e.g. 50,000 (leave blank for placeholder)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Starting Package Rate (USD, Optional)
                  </label>
                  <input
                    type="number"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    placeholder="e.g. 500 (leave blank for placeholder)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Specific Angles or Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Mention that I tested their product last month; highlight upcoming summer trip..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Guidance Line Above Generate Button */}
        <div className="pt-2 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
            Fill in the 3 details, then generate. You can edit everything afterward.
          </p>

          <button
            type="submit"
            disabled={!isFormValid || isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition-all shadow-lg shadow-brand-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Writing Your Proposal...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Proposal</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
