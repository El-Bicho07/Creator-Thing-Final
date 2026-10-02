"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Layers, MessageSquare, Image as ImageIcon, ArrowRight, Bookmark, Sparkles } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface IdeaItem {
  id: number;
  type: 'Reel' | 'Carousel' | 'Story' | 'Post';
  icon: any;
  title: string;
  topic: string;
  hook: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  length: string;
  tagColor: string;
  category: 'Educational' | 'Trending' | 'Beginner';
}

const IDEAS: IdeaItem[] = [
  {
    id: 1,
    type: 'Reel',
    icon: Play,
    title: 'AI Tools Every Student Needs in 2026',
    topic: 'How AI is changing education',
    hook: 'Stop writing essays the hard way. Here are 3 tools top students use.',
    difficulty: 'Easy',
    length: '30s',
    tagColor: 'text-blue-accent bg-pastel-blue/30',
    category: 'Educational'
  },
  {
    id: 2,
    type: 'Carousel',
    icon: Layers,
    title: 'How Teachers Save 5 Hours Every Week',
    topic: 'How AI is changing education',
    hook: 'The exact prompts educators use to automate lesson planning.',
    difficulty: 'Medium',
    length: '7 Slides',
    tagColor: 'text-purple-accent bg-pastel-lavender/30',
    category: 'Trending'
  },
  {
    id: 3,
    type: 'Story',
    icon: MessageSquare,
    title: 'Classroom AI Ethics Quiz & Poll',
    topic: 'How AI is changing education',
    hook: 'Is using AI for studying considered cheating? Vote below.',
    difficulty: 'Easy',
    length: '4 Cards',
    tagColor: 'text-pink-accent bg-soft-pink/30',
    category: 'Beginner'
  },
  {
    id: 4,
    type: 'Post',
    icon: ImageIcon,
    title: 'AI in Education: By The Numbers',
    topic: 'How AI is changing education',
    hook: '73% of teachers and 20% higher test scores: the stats don\'t lie.',
    difficulty: 'Hard',
    length: '1 Graphic',
    tagColor: 'text-orange-500 bg-peach/30',
    category: 'Educational'
  },
  {
    id: 5,
    type: 'Reel',
    icon: Play,
    title: 'The Great Calculator Panic of 1975',
    topic: 'The history of modern architecture',
    hook: 'Schools tried to ban calculators. Today we\'re repeating the exact same mistake.',
    difficulty: 'Medium',
    length: '45s',
    tagColor: 'text-blue-accent bg-pastel-blue/30',
    category: 'Trending'
  },
  {
    id: 6,
    type: 'Carousel',
    icon: Layers,
    title: 'The 5-Step Socratic Study Prompt',
    topic: 'How AI is changing education',
    hook: 'How to turn any textbook into a 24/7 personal tutor.',
    difficulty: 'Easy',
    length: '5 Slides',
    tagColor: 'text-purple-accent bg-pastel-lavender/30',
    category: 'Beginner'
  }
];

export default function IdeasPage() {
  const [filter, setFilter] = useState('All');
  const router = useRouter();
  const { showToast } = useToast();

  const filteredIdeas = IDEAS.filter((idea) => {
    if (filter === 'All') return true;
    if (filter === 'Reels') return idea.type === 'Reel';
    if (filter === 'Carousels') return idea.type === 'Carousel';
    if (filter === 'Stories') return idea.type === 'Story';
    if (filter === 'Educational') return idea.category === 'Educational';
    if (filter === 'Trending') return idea.category === 'Trending';
    if (filter === 'Beginner') return idea.category === 'Beginner';
    return true;
  });

  return (
    <div className="animate-fade-in-up">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-1 tracking-tight text-primary-text">Content Ideas</h1>
        <p className="text-secondary-text">Turn your research insights into high-converting Instagram formats.</p>
      </header>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 hide-scrollbar">
        {['All', 'Reels', 'Carousels', 'Stories', 'Educational', 'Trending', 'Beginner'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              filter === f
                ? 'bg-primary-text text-white shadow-sm'
                : 'bg-white border border-soft-sky text-secondary-text hover:bg-soft-sky/40 hover:text-primary-text'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIdeas.map((idea) => {
          const Icon = idea.icon;
          return (
            <div key={idea.id} className="card-hover p-6 flex flex-col justify-between h-full bg-white">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase flex items-center gap-1.5 ${idea.tagColor}`}>
                    <Icon className="w-3.5 h-3.5" /> {idea.type}
                  </span>
                  <span className="text-xs text-muted-text font-medium">{idea.difficulty} • {idea.length}</span>
                </div>
                <h3 className="font-bold text-base text-primary-text mb-2 leading-snug">{idea.title}</h3>
                <div className="bg-main-bg p-3.5 rounded-xl border border-soft-sky mb-4">
                  <span className="text-[10px] font-bold text-secondary-text uppercase block mb-1">Hook</span>
                  <p className="text-xs font-medium text-primary-text italic">"{idea.hook}"</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-soft-sky/60">
                <button
                  onClick={() => router.push(`/research?topic=${encodeURIComponent(idea.topic)}`)}
                  className="flex-1 py-2 rounded-xl bg-pastel-blue text-primary-text text-xs font-semibold hover:bg-blue-accent/30 transition-colors flex items-center justify-center gap-1.5"
                >
                  Create <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => showToast("Idea saved")}
                  className="p-2 rounded-xl border border-soft-sky bg-white hover:bg-soft-sky/30 transition-colors text-secondary-text"
                  title="Save Idea"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
