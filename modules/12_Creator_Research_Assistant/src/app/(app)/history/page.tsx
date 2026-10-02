"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, ArrowRight, History } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface HistoryItem {
  id: number;
  title: string;
  date: string;
  facts: number;
  angles: number;
  sources: number;
}

const INITIAL_HISTORY: HistoryItem[] = [
  { id: 1, title: 'What is ML', date: 'Today, 11:20 AM', facts: 7, angles: 6, sources: 5 },
  { id: 2, title: 'How does photosynthesis work', date: 'Yesterday, 3:45 PM', facts: 8, angles: 6, sources: 5 },
  { id: 3, title: 'Why do people procrastinate', date: 'Recent Issue', facts: 8, angles: 6, sources: 5 },
  { id: 4, title: 'What is quantum computing', date: 'Previous Edition', facts: 6, angles: 6, sources: 4 },
  { id: 5, title: 'CRISPR gene editing', date: 'Archived', facts: 7, angles: 6, sources: 5 },
];

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [historyList, setHistoryList] = useState<HistoryItem[]>(INITIAL_HISTORY);
  const router = useRouter();
  const { showToast } = useToast();

  const filteredHistory = historyList.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryList(prev => prev.filter(item => item.id !== id));
    showToast("Dispatched entry removed from archive");
  };

  return (
    <div className="animate-fade-in-up max-w-4xl mx-auto px-2 sm:px-4 py-6">
      <header className="mb-6 pb-4 border-b border-[#E8E2D5]">
        <div className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mb-1">
          RECORD ARCHIVES • EDITORIAL LOGS
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl font-black text-stone-900 tracking-tight mb-1">
          Inquiry History
        </h1>
        <p className="font-editorial-body italic text-stone-600 text-sm sm:text-base">
          Revisit past inquiries and encyclopedic explorations across all dispatches.
        </p>
      </header>

      {/* Search Filter Dock */}
      <div className="relative mb-6 max-w-md">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter past inquiry archives..." 
          className="w-full bg-white/80 backdrop-blur-md border border-stone-200 py-3 pl-11 pr-4 rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-[#dc2743] transition-all text-stone-900 font-sans shadow-2xs"
        />
      </div>

      <div className="glass-card rounded-3xl border border-white/95 overflow-hidden shadow-2xs divide-y divide-stone-200/60">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/research?topic=${encodeURIComponent(item.title)}`)}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/60 transition-colors cursor-pointer group"
            >
              <div>
                <span className="text-[10px] font-mono text-stone-400 font-bold block mb-1">
                  {item.date}
                </span>
                <h3 className="font-headline font-bold text-lg text-stone-900 group-hover:text-[#dc2743] transition-colors leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-stone-500 mt-1 font-sans">
                  {item.facts} Key Facts • {item.angles} Angles • {item.sources} Sources
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="p-2 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Remove from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center group-hover:bg-gradient-to-r group-hover:from-[#f09433] group-hover:to-[#bc1888] group-hover:text-white transition-all shadow-2xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-stone-500 text-sm font-editorial-body italic">
            No past dispatches found matching "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
}
