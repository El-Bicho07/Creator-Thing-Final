import React, { useState } from 'react';
import {
  RotateCcw,
  Sparkles,
  Scissors,
  TrendingUp,
  MessageSquare,
  Edit2,
  Check,
  ChevronDown,
  Loader2,
  Send
} from 'lucide-react';

export function SectionCard({
  sectionKey,
  sectionNumber,
  sectionData,
  onUpdateSection,
  onRegenerateSection,
  isRegenerating
}) {
  const [isEditingCustomPrompt, setIsEditingCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const title = sectionData?.title || 'Section Title';
  const text = sectionData?.text || '';

  const handleTextChange = (e) => {
    onUpdateSection(sectionKey, {
      ...sectionData,
      text: e.target.value
    });
  };

  const handleApplyModifier = (modifier) => {
    onRegenerateSection(sectionKey, modifier);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    onRegenerateSection(sectionKey, 'custom', customPrompt.trim());
    setIsEditingCustomPrompt(false);
    setCustomPrompt('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-all">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-black flex items-center justify-center border border-brand-200 dark:border-brand-800">
            {sectionNumber}
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
        </div>

        {/* Refinement Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
          <button
            type="button"
            onClick={() => handleApplyModifier('shorter')}
            disabled={isRegenerating}
            title="Condense and make more concise"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
          >
            <Scissors className="w-3 h-3 text-slate-500" />
            <span>Shorter</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyModifier('more_persuasive')}
            disabled={isRegenerating}
            title="Make sales pitch more persuasive and ROI-focused"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
          >
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>More Persuasive</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyModifier('more_casual')}
            disabled={isRegenerating}
            title="Make friendlier and more conversational"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
          >
            <MessageSquare className="w-3 h-3 text-indigo-500" />
            <span>More Casual</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditingCustomPrompt(!isEditingCustomPrompt)}
            disabled={isRegenerating}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 rounded-lg border border-brand-200 dark:border-brand-800 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 text-brand-500" />
            <span>Custom Refine</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyModifier('regenerate')}
            disabled={isRegenerating}
            title="Full regeneration of this section"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-brand-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Refine Input Popup Bar */}
      {isEditingCustomPrompt && (
        <form onSubmit={handleCustomSubmit} className="flex gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-brand-300 dark:border-brand-800 animate-in fade-in">
          <input
            type="text"
            placeholder="e.g. Add urgency about upcoming Q3 product release slot..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white"
          />
          <button
            type="submit"
            disabled={isRegenerating}
            className="px-3 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            Refine
          </button>
        </form>
      )}

      {/* Section Content Rendering */}
      {isRegenerating ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          <span className="text-xs font-medium">Refining section with AI...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Text Content */}
          {text !== undefined && (
            <textarea
              rows={4}
              value={text}
              onChange={handleTextChange}
              className="w-full p-3.5 text-sm bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 dark:text-slate-100 transition-colors leading-relaxed"
            />
          )}

          {/* Concepts specific rendering */}
          {sectionData?.concepts && (
            <div className="space-y-3 pt-2">
              {sectionData.concepts.map((concept, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      Concept #{concept.conceptNumber || idx + 1}: {concept.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                      {concept.format}
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-800 dark:text-slate-200">Opening Hook:</strong> "{concept.hook}"
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-800 dark:text-slate-200">Narrative & Product Tie-In:</strong> {concept.narrative}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-800 dark:text-slate-200">Call to Action:</strong> {concept.callToAction}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timeline specific rendering */}
          {sectionData?.phases && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {sectionData.phases.map((ph, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                >
                  <div className="font-bold text-brand-700 dark:text-brand-300">
                    {ph.phase}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    {ph.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* KPIs specific rendering */}
          {sectionData?.metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              {sectionData.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{m.label}</div>
                  <div className="font-bold text-slate-800 dark:text-white mt-0.5">{m.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Social Proof highlights */}
          {sectionData?.caseHighlights && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Campaign Highlights:</span>
              {sectionData.caseHighlights.map((hl, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{hl}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
