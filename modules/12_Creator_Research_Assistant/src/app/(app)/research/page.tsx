"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Bookmark,
  Share2,
  Download,
  Copy,
  Search,
  ExternalLink,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FileText,
  Compass,
  Lightbulb,
  Key,
  Globe,
  BookOpen,
  Layers,
  Check,
  CheckCircle2,
  ArrowRight,
  Flame,
  BookmarkCheck
} from 'lucide-react';
import { researchTopic, saveResearch } from '@/services/researchService';
import { ResearchResult } from '@/types/research';
import { useToast } from '@/context/ToastContext';

const QUICK_TOPICS = [
  "What is ML",
  "How does photosynthesis work",
  "Why do people procrastinate",
  "What is quantum computing",
  "CRISPR gene editing",
  "Index fund investing for beginners",
  "Creatine & Muscle Growth"
];

function ResearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTopic = searchParams.get('topic') || "What is ML";

  const { showToast } = useToast();
  const [topic, setTopic] = useState(initialTopic);
  const [searchInput, setSearchInput] = useState(initialTopic);
  const [data, setData] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Settings modal for optional Gemini API key
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Active view filter tab: 'all' | 'facts' | 'angles' | 'sources'
  const [activePillar, setActivePillar] = useState<'all' | 'facts' | 'angles' | 'sources'>('all');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gemini_api_key') || '';
      setApiKeyInput(saved);
    }
  }, []);

  const fetchResearch = async (targetTopic: string) => {
    setLoading(true);
    setError(null);
    setIsSaved(false);

    try {
      const result = await researchTopic(targetTopic);
      setData(result);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError("Unable to search this topic. Please try again with another query.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearch(topic);
  }, [topic]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTopic(searchInput.trim());
      router.push(`/research?topic=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleQuickTopicClick = (newTopic: string) => {
    setSearchInput(newTopic);
    setTopic(newTopic);
    router.push(`/research?topic=${encodeURIComponent(newTopic)}`);
  };

  const handleCopyText = (text: string, toastLabel: string) => {
    navigator.clipboard.writeText(text);
    showToast(toastLabel);
  };

  const handleSave = async () => {
    if (data) {
      await saveResearch(data);
      setIsSaved(true);
      showToast("Saved to your research archive");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Dispatch link copied to clipboard");
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_api_key', apiKeyInput.trim());
      setShowKeyModal(false);
      showToast("API Key updated. Refreshing dispatch...");
      fetchResearch(topic);
    }
  };

  const handleExport = () => {
    if (!data) return;
    const exportContent = `# ${data.topic} — The Research Dispatch
Inquiry: ${data.questionInquiry || data.topic}
Source Engine: ${data.searchEngineSource || 'Live Web & CrossRef'}
Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

## Executive Summary
${data.summary}

## Key Takeaways
${data.takeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}

---

## 📌 Section I: Key Facts (${data.facts.length})
${data.facts.map((f, i) => `### Fact ${i + 1} [${f.dataMetric || 'Verified'}]
- Fact: ${f.fact}
- Context: ${f.why}
- Citation: ${f.source}`).join('\n\n')}

---

## 🎯 Section II: Content Angles (${data.angles.length})
${data.angles.map((a, i) => `### Angle ${i + 1}: ${a.angle}
- Perspective: ${a.desc}
- Key Takeaway: "${a.hook}"
- Value Trigger: ${a.saveTrigger}`).join('\n\n')}

---

## 📚 Section III: Useful Sources (${data.sources.length})
${data.sources.map((s, i) => `### Source ${i + 1}: ${s.title}
- Publisher: ${s.publisher} ${s.date ? `(${s.date})` : ''} [${s.type}]
- Summary: ${s.desc}
- Link: ${s.url}`).join('\n\n')}
`;

    const blob = new Blob([exportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-dispatch.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Dispatch exported as Markdown");
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 md:py-6 animate-fade-in-up">
      {/* ============================================================== */}
      {/* NEWSPAPER MASTHEAD HEADER (Editorial & Glassmorphism)         */}
      {/* ============================================================== */}
      <header className="mb-6 text-center">
        {/* Newspaper Top Issue Ticker */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#E8E2D5] pb-2 mb-4 text-[11px] font-semibold text-stone-500 uppercase tracking-widest px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>DAILY INTELLIGENCE WIRE</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>VOL. IV — NO. 28</span>
            <span>•</span>
            <button
              onClick={() => setShowKeyModal(true)}
              className="text-stone-600 hover:text-[#dc2743] transition-colors flex items-center gap-1 font-bold lowercase tracking-normal"
            >
              <Key className="w-3 h-3 text-[#dc2743]" />
              <span>[ai key settings]</span>
            </button>
          </div>
        </div>

        {/* Newspaper Brand Emblem & Title */}
        <div className="py-2">
          <div className="inline-flex items-center gap-3 mb-2">
            {/* Instagram Story Gradient Ring */}
            <div className="p-[2.5px] rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm">
              <div className="w-10 h-10 rounded-[14px] bg-[#FAF7F2] text-stone-900 flex items-center justify-center font-headline font-black text-base border border-white/60">
                TI
              </div>
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-black text-stone-900 tracking-tight">
              Topic Intel
            </h1>
          </div>

          <p className="font-editorial-body italic text-base sm:text-lg text-stone-600 max-w-xl mx-auto leading-snug">
            Turn any question or topic into <span className="font-sans font-bold not-italic text-stone-900">key facts</span>, <span className="font-sans font-bold not-italic text-stone-900">angles</span>, and <span className="font-sans font-bold not-italic text-stone-900">useful sources</span>.
          </p>
        </div>

        {/* Newspaper Double Rule */}
        <div className="newspaper-double-rule mt-3 pt-3" />
      </header>

      {/* ============================================================== */}
      {/* GLASSMORPHIC FLOATING SEARCH DOCK (Instagram sunset touch)      */}
      {/* ============================================================== */}
      <section className="mb-6">
        <form onSubmit={handleSearchSubmit} className="relative group">
          <div className="glass-dock rounded-3xl p-1.5 transition-all duration-300 focus-within:ring-4 focus-within:ring-rose-500/10 focus-within:border-rose-400">
            <div className="flex items-center gap-2 pl-4 pr-1.5 py-1">
              <Search className="w-5 h-5 text-stone-400 group-focus-within:text-[#dc2743] transition-colors shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ask any question or enter a topic (e.g. What is ML, Photosynthesis, Why do people procrastinate)..."
                className="w-full bg-transparent text-sm sm:text-base md:text-lg text-stone-900 font-sans placeholder-stone-400 focus:outline-none py-2"
              />
              <button
                type="submit"
                className="shrink-0 p-[1.5px] rounded-2xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm hover:shadow-md hover:shadow-rose-500/20 transition-all duration-200"
              >
                <div className="bg-gradient-to-r from-[#e6683c] via-[#dc2743] to-[#bc1888] text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-[14px] font-sans font-bold text-xs sm:text-sm tracking-wide flex items-center gap-1.5 hover:opacity-95">
                  <span>Dispatch</span>
                  <ArrowRight className="w-4 h-4 hidden sm:inline" />
                </div>
              </button>
            </div>
          </div>
        </form>

        {/* Instagram Story-Ring Style Quick Topic Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-2 hide-scrollbar">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 shrink-0 flex items-center gap-1 mr-1">
            <Flame className="w-3.5 h-3.5 text-[#f09433]" /> Trending:
          </span>
          {QUICK_TOPICS.map((t) => {
            const isSelected = t.toLowerCase() === topic.toLowerCase();
            return (
              <button
                key={t}
                type="button"
                onClick={() => handleQuickTopicClick(t)}
                className={`group shrink-0 p-[1.5px] rounded-full transition-all duration-300 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm'
                    : 'bg-stone-200 hover:bg-gradient-to-r hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888]'
                }`}
              >
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold tracking-tight transition-colors ${
                    isSelected
                      ? 'bg-white text-stone-900 font-bold'
                      : 'bg-white/80 backdrop-blur-md text-stone-600 group-hover:bg-white group-hover:text-stone-900'
                  }`}
                >
                  {t}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* LOADING STATE                                                  */}
      {/* ============================================================== */}
      {loading && (
        <div className="glass-card rounded-3xl p-10 md:p-14 text-center my-6 flex flex-col items-center justify-center border border-white/90">
          <div className="relative mb-5">
            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] animate-spin">
              <div className="w-full h-full rounded-full bg-[#FAF7F2]" />
            </div>
            <Sparkles className="w-5 h-5 text-[#dc2743] absolute inset-0 m-auto" />
          </div>
          <h2 className="font-headline text-2xl font-bold text-stone-900 mb-2">
            Compiling Front-Page Dispatch...
          </h2>
          <p className="font-editorial-body text-base text-stone-600 max-w-md mx-auto leading-relaxed">
            Querying live Wikipedia, CrossRef peer-reviewed scientific literature, and academic archives for <span className="font-sans font-bold text-stone-900">"{topic}"</span>
          </p>
        </div>
      )}

      {/* ============================================================== */}
      {/* ERROR STATE                                                    */}
      {/* ============================================================== */}
      {!loading && (error || !data) && (
        <div className="glass-card rounded-3xl p-8 md:p-10 text-center my-6 border border-rose-200 bg-rose-50/40">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="font-headline text-2xl font-bold text-stone-900 mb-1">
            Dispatch Interrupted
          </h2>
          <p className="text-sm text-stone-600 mb-5 max-w-md mx-auto">
            {error || "Could not retrieve encyclopedic and academic results for this topic."}
          </p>
          <button
            onClick={() => fetchResearch(topic)}
            className="px-5 py-2.5 rounded-xl bg-stone-900 text-white font-sans text-xs font-bold hover:bg-stone-800 transition-colors inline-flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN RESEARCH DISPATCH (FRONT PAGE & 3 PILLARS)                */}
      {/* ============================================================== */}
      {!loading && data && (
        <div className="space-y-6">
          {/* ------------------------------------------------------------ */}
          {/* FRONT PAGE FEATURE ARTICLE CARD (Glassmorphic Magazine Lead)  */}
          {/* ------------------------------------------------------------ */}
          <article className="glass-card rounded-3xl p-6 sm:p-8 md:p-10 relative overflow-hidden border border-white/95">
            {/* Top article tags & actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-[#E8E2D5]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-stone-900 text-white">
                  {data.niche}
                </span>
                <span className="text-[11px] font-bold text-stone-600 bg-white/70 px-2.5 py-0.5 rounded-full border border-stone-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live Web & Academic Review
                </span>
              </div>

              {/* Instagram-style action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isSaved
                      ? 'bg-rose-50 text-[#dc2743] border-rose-200 font-bold'
                      : 'bg-white/80 text-stone-600 border-stone-200 hover:text-stone-900 hover:bg-white'
                  }`}
                  title="Save to Dossier"
                >
                  {isSaved ? <BookmarkCheck className="w-4 h-4 text-[#dc2743]" /> : <Bookmark className="w-4 h-4" />}
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/80 text-stone-600 border border-stone-200 hover:text-stone-900 hover:bg-white transition-all"
                  title="Share link"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>

                <button
                  onClick={handleExport}
                  className="p-[1.5px] rounded-xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-2xs hover:shadow-xs transition-all"
                >
                  <div className="bg-gradient-to-r from-[#e6683c] via-[#dc2743] to-[#bc1888] text-white px-3.5 py-1.5 rounded-[10px] text-xs font-bold flex items-center gap-1.5 hover:opacity-95">
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Headline Title */}
            <div className="mb-6">
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-black text-stone-900 tracking-tight leading-tight mb-2">
                {data.topic}
              </h2>
              {data.questionInquiry && (
                <div className="flex items-center gap-2 text-xs font-medium text-stone-500 font-sans">
                  <Lightbulb className="w-4 h-4 text-[#f09433] shrink-0" />
                  <span>Inquiry Dispatch: <span className="font-bold text-stone-800">"{data.questionInquiry}"</span></span>
                </div>
              )}
            </div>

            {/* Executive Summary Lead */}
            <div className="mb-8">
              <div className="text-xs font-extrabold uppercase tracking-widest text-[#dc2743] mb-2 flex items-center gap-1.5">
                <Compass className="w-4 h-4" /> Lead Summary
              </div>
              <p className="font-sans text-base sm:text-lg leading-relaxed text-stone-800 font-normal">
                {data.summary}
              </p>
            </div>

            {/* Key Takeaways Grid */}
            <div className="pt-6 border-t border-[#E8E2D5]">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-stone-400 mb-3">
                Core Takeaways
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.takeaways.map((takeaway, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-white/70 border border-stone-200/70 shadow-2xs flex items-start gap-3"
                  >
                    <span className="w-6 h-6 rounded-lg bg-stone-900 text-white text-xs font-headline font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-stone-700 font-medium leading-relaxed font-sans">
                      {takeaway}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* ------------------------------------------------------------ */}
          {/* THREE PILLARS NAVIGATION TABS (Glassmorphism selector)         */}
          {/* ------------------------------------------------------------ */}
          <div className="flex items-center justify-between gap-1 p-1 bg-white/60 backdrop-blur-xl border border-stone-200 rounded-2xl max-w-xl mx-auto shadow-2xs">
            {[
              { id: 'all', label: 'All 3 Sections' },
              { id: 'facts', label: `I. Facts (${data.facts.length})` },
              { id: 'angles', label: `II. Angles (${data.angles.length})` },
              { id: 'sources', label: `III. Sources (${data.sources.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePillar(tab.id as any)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                  activePillar === tab.id
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-black'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ============================================================== */}
          {/* PILLAR 1: KEY FACTS (Section I: The Empirical Facts)           */}
          {/* ============================================================== */}
          {(activePillar === 'all' || activePillar === 'facts') && (
            <section className="glass-card rounded-3xl p-6 sm:p-8 border border-white/95">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#E8E2D5]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center font-headline font-bold text-sm">
                    01
                  </div>
                  <div>
                    <h3 className="font-headline text-xl sm:text-2xl font-bold text-stone-900">
                      Section I: Key Facts
                    </h3>
                    <p className="text-xs text-stone-500 font-sans">
                      Verified, digestible factual points synthesized from live encyclopedias and literature
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const text = data.facts.map((f, i) => `${i + 1}. [${f.dataMetric || 'Fact'}] ${f.fact}\nContext: ${f.why}\nSource: ${f.source}`).join('\n\n');
                    handleCopyText(text, "All key facts copied to clipboard");
                  }}
                  className="text-xs font-bold text-stone-700 hover:text-stone-900 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-stone-200 hover:bg-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-[#dc2743]" />
                  <span>Copy Facts</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.facts.map((fact, index) => (
                  <div
                    key={fact.id || index}
                    className="glass-card glass-card-hover p-5 rounded-2xl border border-stone-200/80 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-stone-400">
                            FACT 0{index + 1}
                          </span>
                          {fact.dataMetric && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 text-[#dc2743] border border-rose-200/60 font-sans">
                              {fact.dataMetric}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleCopyText(`${fact.fact} (${fact.source})`, "Fact copied")}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-[#dc2743] hover:bg-rose-50/60 transition-colors"
                          title="Copy fact"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-stone-900 leading-relaxed mb-3 font-sans">
                        {fact.fact}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-200/60 text-xs text-stone-600">
                      <span className="font-bold text-stone-500 block mb-0.5 text-[11px] uppercase tracking-wider">
                        Why it matters:
                      </span>
                      <p className="font-editorial-body italic text-stone-700 leading-snug">
                        {fact.why}
                      </p>
                      <div className="mt-2 text-[11px] font-semibold text-stone-500 flex items-center gap-1 truncate">
                        <span className="text-[#dc2743]">✦</span>
                        <span>{fact.source}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* PILLAR 2: CONTENT ANGLES (Section II: Perspectives & Debates)  */}
          {/* ============================================================== */}
          {(activePillar === 'all' || activePillar === 'angles') && (
            <section className="glass-card rounded-3xl p-6 sm:p-8 border border-white/95">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#E8E2D5]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center font-headline font-bold text-sm">
                    02
                  </div>
                  <div>
                    <h3 className="font-headline text-xl sm:text-2xl font-bold text-stone-900">
                      Section II: Content Angles
                    </h3>
                    <p className="text-xs text-stone-500 font-sans">
                      Distinct analytical perspectives to explain, debate, or unpack the topic
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const text = data.angles.map((a, i) => `Angle ${i + 1}: ${a.angle}\nPerspective: ${a.desc}\nHook: "${a.hook}"\nSave Trigger: ${a.saveTrigger}`).join('\n\n');
                    handleCopyText(text, "All angles copied to clipboard");
                  }}
                  className="text-xs font-bold text-stone-700 hover:text-stone-900 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-stone-200 hover:bg-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-[#dc2743]" />
                  <span>Copy Angles</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.angles.map((angle, index) => (
                  <div
                    key={angle.id || index}
                    className="glass-card glass-card-hover p-5 rounded-2xl border border-stone-200/80 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 border border-stone-200 font-sans">
                          {angle.angle}
                        </span>
                        <button
                          onClick={() => handleCopyText(`Angle: ${angle.angle}\n${angle.desc}\n"${angle.hook}"`, "Angle copied")}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-[#dc2743] hover:bg-rose-50/60 transition-colors"
                          title="Copy angle"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Instagram Hook Quote Box */}
                      <div className="p-3 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border-l-3 border-[#dc2743] rounded-r-xl mb-3">
                        <span className="text-[9px] font-bold text-[#dc2743] uppercase tracking-wider block mb-1">
                          Core Hook / Perspective
                        </span>
                        <p className="text-xs font-bold text-stone-900 leading-snug font-sans">
                          "{angle.hook}"
                        </p>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed mb-4 font-sans">
                        {angle.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-200/60 text-[11px] text-stone-500 flex items-center justify-between">
                      <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">
                        Value Trigger:
                      </span>
                      <span className="font-semibold text-stone-700">
                        {angle.saveTrigger}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* PILLAR 3: USEFUL SOURCES (Section III: Academic & Web Citations) */}
          {/* ============================================================== */}
          {(activePillar === 'all' || activePillar === 'sources') && (
            <section className="glass-card rounded-3xl p-6 sm:p-8 border border-white/95">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#E8E2D5]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-headline font-bold text-sm">
                    03
                  </div>
                  <div>
                    <h3 className="font-headline text-xl sm:text-2xl font-bold text-stone-900">
                      Section III: Useful Sources
                    </h3>
                    <p className="text-xs text-stone-500 font-sans">
                      Verified external publications, peer-reviewed DOIs, and encyclopedic entries
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const text = data.sources.map((s, i) => `${i + 1}. ${s.title} — ${s.publisher} (${s.date || '2026'})\nURL: ${s.url}`).join('\n\n');
                    handleCopyText(text, "All sources copied to clipboard");
                  }}
                  className="text-xs font-bold text-stone-700 hover:text-stone-900 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-stone-200 hover:bg-white transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copy Citations</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.sources.map((source, index) => (
                  <div
                    key={source.id || index}
                    className="glass-card glass-card-hover p-5 rounded-2xl border border-stone-200/80 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans">
                          {source.type}
                        </span>
                        <span className="text-[11px] text-stone-400 font-semibold font-mono">
                          {source.date}
                        </span>
                      </div>

                      <h4 className="font-headline font-bold text-base text-stone-900 mb-1 leading-snug">
                        {source.title}
                      </h4>
                      <p className="text-xs text-stone-500 mb-2.5 font-medium font-sans">
                        Publisher: <span className="text-stone-800 font-bold">{source.publisher}</span>
                      </p>
                      <p className="text-xs text-stone-600 leading-relaxed mb-4 bg-white/60 p-2.5 rounded-xl border border-stone-200/60 font-sans">
                        {source.desc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-200/60 font-sans">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[#dc2743] hover:text-[#bc1888] inline-flex items-center gap-1 hover:underline"
                      >
                        Visit Source <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => handleCopyText(`${source.title} — ${source.publisher} (${source.date || '2026'})\n${source.url}`, "Citation copied")}
                        className="text-xs font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* OPTIONAL GEMINI API KEY MODAL                                  */}
      {/* ============================================================== */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-white/90 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-[2px] rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]">
                <div className="w-9 h-9 rounded-[10px] bg-white flex items-center justify-center text-[#dc2743]">
                  <Key className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="font-headline text-lg font-bold text-stone-900">AI Search Grounding</h3>
                <p className="text-xs text-stone-500">Optional Google Gemini API Key</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 mb-4 leading-relaxed font-sans">
              Topic Intel queries Wikipedia and CrossRef APIs for 100% free web search. You can optionally add a Gemini API key for enhanced reasoning.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-1.5 font-sans">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full bg-white/80 border border-stone-300 rounded-xl px-4 py-2.5 text-xs text-stone-900 font-mono focus:outline-none focus:border-[#dc2743]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-sm"
                >
                  Save Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResearchWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-3 border-stone-200 border-t-[#dc2743] animate-spin" />
      </div>
    }>
      <ResearchContent />
    </Suspense>
  );
}
