import React, { useState } from 'react';
import {
  Building2,
  Globe,
  Sparkles,
  Wand2,
  ChevronRight,
  ChevronLeft,
  Target,
  FileText,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';
import { demoBrands } from '../mock/demoPresets';
import { api } from '../services/api';

const GOAL_OPTIONS = [
  "Conversions / Sales",
  "Product Awareness",
  "UGC / Creative Assets",
  "Product Launch / Feature Drop",
  "App Installs / Downloads",
  "Community Engagement"
];

export function BrandStep({
  brandInfo,
  setBrandInfo,
  onBack,
  onNext,
  showToast
}) {
  const [extractInput, setExtractInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [showExtractor, setShowExtractor] = useState(false);

  const handleToggleGoal = (goal) => {
    const current = brandInfo.campaignGoals || [];
    const exists = current.includes(goal);
    const updated = exists
      ? current.filter(g => g !== goal)
      : [...current, goal];
    setBrandInfo({ ...brandInfo, campaignGoals: updated });
  };

  const handleExtractBrand = async () => {
    if (!extractInput.trim()) {
      showToast?.('Please paste a brand URL or company description first', 'warning');
      return;
    }

    setExtracting(true);
    try {
      const res = await api.extractBrand(extractInput.trim());
      if (res.data) {
        setBrandInfo({
          ...brandInfo,
          ...res.data
        });
        showToast?.(`Extracted brand intelligence for ${res.data.brandName}!`, 'success');
        setShowExtractor(false);
        setExtractInput('');
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to extract brand data', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const loadPreset = (preset) => {
    setBrandInfo(preset);
    showToast?.(`Loaded ${preset.brandName} brand info`, 'info');
  };

  const canProceed = Boolean(brandInfo.brandName && brandInfo.brandName.trim().length > 1);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-950 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/30 text-brand-300 border border-brand-400/30">
              Step 2 of 4
            </span>
            <h2 className="text-xl font-bold">Brand & Campaign Target</h2>
          </div>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Input the brand's details, product offer, and campaign goals to craft an intensely relevant proposal that speaks their exact marketing language.
          </p>
        </div>

        {/* Quick Brand Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Presets:</span>
          {demoBrands.map((brand, i) => (
            <button
              key={i}
              onClick={() => loadPreset(brand)}
              className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors whitespace-nowrap"
            >
              {brand.brandName}
            </button>
          ))}
        </div>
      </div>

      {/* AI Brand Intelligence Extractor Feature Accordion */}
      <div className="bg-gradient-to-br from-brand-50/70 to-indigo-50/70 dark:from-brand-950/30 dark:to-indigo-950/30 border border-brand-200 dark:border-brand-900/60 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                AI Brand Intelligence Extractor
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Paste a brand website URL or their "About Us" / Product text to auto-fill this form in seconds.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowExtractor(!showExtractor)}
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline px-3 py-1.5 rounded-lg hover:bg-brand-100/50 dark:hover:bg-brand-900/50 transition-colors"
          >
            {showExtractor ? 'Hide Extractor' : 'Open Extractor'}
          </button>
        </div>

        {showExtractor && (
          <div className="mt-4 pt-4 border-t border-brand-200/60 dark:border-brand-900/60 space-y-3 animate-in fade-in duration-200">
            <textarea
              rows={3}
              value={extractInput}
              onChange={(e) => setExtractInput(e.target.value)}
              placeholder="e.g. https://linear.app or paste copy: 'Linear is a purpose-built tool for planning and building products. Streamline software projects, sprints, tasks, and bug tracking...'"
              className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleExtractBrand}
                disabled={extracting}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-md shadow-brand-500/20 disabled:opacity-50"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing Brand Intel...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Extract Brand Intelligence
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Brand Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-7">
        {/* Core Brand Details */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <Building2 className="w-5 h-5 text-brand-500" />
            Brand Overview
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Brand / Company Name *
              </label>
              <input
                type="text"
                value={brandInfo.brandName || ''}
                onChange={(e) => setBrandInfo({ ...brandInfo, brandName: e.target.value })}
                placeholder="e.g. Notion"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Website URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  value={brandInfo.websiteUrl || ''}
                  onChange={(e) => setBrandInfo({ ...brandInfo, websiteUrl: e.target.value })}
                  placeholder="https://notion.so"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Industry / Category
              </label>
              <input
                type="text"
                value={brandInfo.industry || ''}
                onChange={(e) => setBrandInfo({ ...brandInfo, industry: e.target.value })}
                placeholder="e.g. Productivity Software / SaaS"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Brand Tone & Core Values
              </label>
              <input
                type="text"
                value={brandInfo.brandToneValues || ''}
                onChange={(e) => setBrandInfo({ ...brandInfo, brandToneValues: e.target.value })}
                placeholder="e.g. Minimalist, empowering, intellectual, streamlined"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Campaign Focus & Target Audience */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <Target className="w-5 h-5 text-indigo-500" />
            Product Offer & Target Audience
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product, Service, or Feature to Promote *
              </label>
              <input
                type="text"
                value={brandInfo.productCampaign || ''}
                onChange={(e) => setBrandInfo({ ...brandInfo, productCampaign: e.target.value })}
                placeholder="e.g. Notion Projects & Notion AI for Creators & Freelancers"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Brand's Ideal Customer / Target Audience
              </label>
              <input
                type="text"
                value={brandInfo.targetAudience || ''}
                onChange={(e) => setBrandInfo({ ...brandInfo, targetAudience: e.target.value })}
                placeholder="e.g. Knowledge workers, freelancers, creative entrepreneurs, and agile teams"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Campaign Goals */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <CheckSquare className="w-5 h-5 text-emerald-500" />
            Campaign Goals (Select all that apply)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {GOAL_OPTIONS.map((goal, idx) => {
              const selected = (brandInfo.campaignGoals || []).includes(goal);
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleToggleGoal(goal)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all text-left ${
                    selected
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {selected ? (
                    <CheckSquare className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                  )}
                  <span>{goal}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Strategic Notes & Directives */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <FileText className="w-5 h-5 text-amber-500" />
            Special Instructions / Unique Angles
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Optional Notes for the AI
            </label>
            <textarea
              rows={3}
              value={brandInfo.notes || ''}
              onChange={(e) => setBrandInfo({ ...brandInfo, notes: e.target.value })}
              placeholder="e.g. Focus on how this tool replaces 5 separate subscription apps. Mention discount code or trackable creator link. Do not mention competitor X..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Profile
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-lg shadow-brand-500/25 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Proposal Generator
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
