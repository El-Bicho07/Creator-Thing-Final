"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, ArrowRight, Trash2, FolderOpen, Globe, Sparkles } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface SavedResearchItem {
  id: string;
  topic: string;
  date: string;
  factsCount: number;
  anglesCount: number;
  sourcesCount: number;
}

const DEFAULT_SAVED: SavedResearchItem[] = [
  { id: "sr1", topic: "What is ML", date: "Today", factsCount: 7, anglesCount: 6, sourcesCount: 5 },
  { id: "sr2", topic: "Why do people procrastinate", date: "Yesterday", factsCount: 8, anglesCount: 6, sourcesCount: 5 },
  { id: "sr3", topic: "Quantum computing", date: "3 days ago", factsCount: 6, anglesCount: 6, sourcesCount: 4 },
];

export default function SavedPage() {
  const [savedItems, setSavedItems] = useState<SavedResearchItem[]>(DEFAULT_SAVED);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('saved_research');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped: SavedResearchItem[] = parsed.map((item: any, idx: number) => ({
              id: item.id || `saved_${idx}`,
              topic: item.topic || "Untitled Topic",
              date: item.savedAt ? new Date(item.savedAt).toLocaleDateString() : "Recent",
              factsCount: item.facts?.length || 6,
              anglesCount: item.angles?.length || 6,
              sourcesCount: item.sources?.length || 5,
            }));
            setSavedItems(mapped);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedItems.filter(item => item.id !== id);
    setSavedItems(updated);
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(localStorage.getItem('saved_research') || '[]');
      const filtered = stored.filter((s: any, idx: number) => (s.id || `saved_${idx}`) !== id);
      localStorage.setItem('saved_research', JSON.stringify(filtered));
    }
    showToast("Research dossier removed");
  };

  return (
    <div className="animate-fade-in-up max-w-4xl mx-auto px-2 sm:px-4 py-6">
      <header className="mb-6 pb-4 border-b border-[#E8E2D5]">
        <div className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mb-1">
          THE ARCHIVE ROOM • PRIVATE DOSSIERS
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl font-black text-stone-900 tracking-tight mb-1">
          Saved Research Dossiers
        </h1>
        <p className="font-editorial-body italic text-stone-600 text-sm sm:text-base">
          Your curated library of investigative dispatches, empirical facts, and accredited sources.
        </p>
      </header>

      {savedItems.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-3xl border border-white/95">
          <FolderOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-headline font-bold text-lg text-stone-900 mb-1">Archive is Empty</h3>
          <p className="text-xs text-stone-500 mb-4 font-sans max-w-md mx-auto">
            Inquire about any topic in the research dispatch and save dossiers to your reading desk.
          </p>
          <Link
            href="/research"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e6683c] via-[#dc2743] to-[#bc1888] text-white text-xs font-bold shadow-sm"
          >
            <span>Open Research Gazette</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedItems.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/research?topic=${encodeURIComponent(item.topic)}`)}
              className="glass-card glass-card-hover p-6 rounded-3xl border border-white/95 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 bg-white/80 border border-stone-200 px-2.5 py-0.5 rounded-full">
                    {item.date}
                  </span>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    title="Remove dossier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-headline font-bold text-xl text-stone-900 mb-2 leading-snug group-hover:text-[#dc2743] transition-colors">
                  {item.topic}
                </h3>
              </div>

              <div className="pt-4 border-t border-stone-200/60 mt-4 flex items-center justify-between text-xs text-stone-500 font-sans">
                <div className="flex items-center gap-2">
                  <span>{item.factsCount} Facts</span>
                  <span>•</span>
                  <span>{item.anglesCount} Angles</span>
                  <span>•</span>
                  <span>{item.sourcesCount} Sources</span>
                </div>
                <span className="font-bold text-[#dc2743] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Read <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
