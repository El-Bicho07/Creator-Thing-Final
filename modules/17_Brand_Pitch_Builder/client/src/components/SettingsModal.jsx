import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export function SettingsModal({ isOpen, onClose, onConfigSaved, showToast }) {
  const [provider, setProvider] = useState('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      api.getAiStatus()
        .then(res => {
          setStatus(res);
          setProvider(res.provider || 'gemini');
          setGeminiModel(res.geminiModel || 'gemini-2.5-flash');
          setOpenaiModel(res.openaiModel || 'gpt-4o-mini');
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateAiConfig({
        provider,
        geminiApiKey: geminiApiKey || undefined,
        openaiApiKey: openaiApiKey || undefined,
        geminiModel,
        openaiModel
      });
      showToast?.('AI settings updated successfully!', 'success');
      onConfigSaved?.();
      onClose();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Engine Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Status Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Active Provider: <strong className="uppercase">{provider}</strong>
              </span>
            </div>
            <span className="text-slate-500 dark:text-slate-400">
              {status?.hasGeminiKey || status?.hasOpenaiKey ? 'Live API Key Active' : 'Smart Demo Fallback Active'}
            </span>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Select AI Engine
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  provider === 'gemini'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="text-sm">Google Gemini</div>
                <div className="text-[10px] opacity-75 mt-0.5">2.5 Flash / Pro</div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('openai')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  provider === 'openai'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="text-sm">OpenAI</div>
                <div className="text-[10px] opacity-75 mt-0.5">GPT-4o / Mini</div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('mock')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  provider === 'mock'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="text-sm">Demo Engine</div>
                <div className="text-[10px] opacity-75 mt-0.5">Zero API Key Needed</div>
              </button>
            </div>
          </div>

          {/* Conditional API Key Inputs */}
          {provider === 'gemini' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder={status?.hasGeminiKey ? '•••••••••••••••• (API Key Loaded)' : 'AIzaSy...'}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Read automatically from <code className="text-brand-600 dark:text-brand-400">.env</code> or enter here to override.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gemini Model
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & Structured)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Deep Reasoning)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Standard)</option>
                </select>
              </div>
            </div>
          )}

          {provider === 'openai' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder={status?.hasOpenaiKey ? '•••••••••••••••• (API Key Loaded)' : 'sk-proj-...'}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  OpenAI Model
                </label>
                <select
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Recommended, Fast & Cost-effective)</option>
                  <option value="gpt-4o">gpt-4o (Flagship Multimodal)</option>
                </select>
              </div>
            </div>
          )}

          {provider === 'mock' && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="block font-semibold">Smart Deterministic Demo Engine</strong>
                Generates high-converting, deeply customized proposals calculated directly from your creator rate card and brand parameters without requiring an external API key or internet access.
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-lg shadow-brand-500/20 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
