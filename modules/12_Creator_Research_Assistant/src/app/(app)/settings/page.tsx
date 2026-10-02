"use client";

import { useState, useEffect } from 'react';
import { Key, Globe, Sparkles, Check, Shield } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function SettingsPage() {
  const { showToast } = useToast();

  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [enginePreference, setEnginePreference] = useState<"auto" | "web" | "gemini">("auto");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('gemini_api_key') || '';
      setGeminiApiKey(savedKey);
      const savedEngine = (localStorage.getItem('search_engine_pref') as any) || 'auto';
      setEnginePreference(savedEngine);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_api_key', geminiApiKey.trim());
      localStorage.setItem('search_engine_pref', enginePreference);
      showToast("Dispatch preferences and API settings saved");
    }
  };

  return (
    <div className="animate-fade-in-up max-w-3xl pb-16 mx-auto px-2 sm:px-4 py-6">
      <header className="mb-6 pb-4 border-b border-[#E8E2D5]">
        <div className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mb-1">
          EDITORIAL SETTINGS • WIRE ENGINE CONFIGURATION
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl font-black text-stone-900 tracking-tight mb-1">
          Engine & API Settings
        </h1>
        <p className="font-editorial-body italic text-stone-600 text-sm sm:text-base">
          Configure live academic retrieval wires, encyclopedic preferences, and optional AI grounding.
        </p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Live Search Engine Configuration */}
        <section className="glass-card p-6 sm:p-8 rounded-3xl border border-white/95 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#E8E2D5]">
            <Globe className="w-5 h-5 text-[#dc2743]" />
            <h2 className="font-headline text-xl font-bold text-stone-900">Search & Retrieval Engine</h2>
          </div>

          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
              Topic Intel automatically connects to live Wikipedia knowledge and CrossRef peer-reviewed scientific papers for all queries.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div
                onClick={() => setEnginePreference("auto")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  enginePreference === "auto"
                    ? "bg-white border-[#dc2743] shadow-xs ring-2 ring-rose-500/10"
                    : "bg-white/60 border-stone-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-headline font-bold text-sm text-stone-900">Auto (Recommended)</h4>
                  {enginePreference === "auto" && <Check className="w-4 h-4 text-[#dc2743]" />}
                </div>
                <p className="text-xs text-stone-500 font-sans">
                  Uses live web and academic search. If a Gemini key is set, enables Google AI search grounding.
                </p>
              </div>

              <div
                onClick={() => setEnginePreference("web")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  enginePreference === "web"
                    ? "bg-white border-[#dc2743] shadow-xs ring-2 ring-rose-500/10"
                    : "bg-white/60 border-stone-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-headline font-bold text-sm text-stone-900">Pure Web & CrossRef</h4>
                  {enginePreference === "web" && <Check className="w-4 h-4 text-[#dc2743]" />}
                </div>
                <p className="text-xs text-stone-500 font-sans">
                  Direct Wikipedia & CrossRef extraction only. 100% free, no API keys required.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Optional Gemini AI Key */}
        <section className="glass-card p-6 sm:p-8 rounded-3xl border border-white/95 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#E8E2D5]">
            <Key className="w-5 h-5 text-[#f09433]" />
            <h2 className="font-headline text-xl font-bold text-stone-900">Gemini AI Key (Optional)</h2>
          </div>

          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
              Add your Google Gemini API key to enable live Google Search Grounding with Gemini 2.5 Flash.
            </p>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">
                API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full bg-white/80 border border-stone-300 rounded-xl px-4 py-2.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-[#dc2743]"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="p-[1.5px] rounded-2xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm hover:shadow-md transition-all"
          >
            <div className="bg-gradient-to-r from-[#e6683c] via-[#dc2743] to-[#bc1888] text-white px-6 py-2.5 rounded-[14px] text-xs font-bold flex items-center gap-2 hover:opacity-95">
              <Check className="w-4 h-4" />
              <span>Save Settings</span>
            </div>
          </button>
        </div>
      </form>
    </div>
  );
}
