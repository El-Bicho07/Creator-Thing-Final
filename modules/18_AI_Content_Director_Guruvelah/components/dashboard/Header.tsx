'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PlusCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          Trend-to-Content Engine
        </h1>
        <p className="text-xs text-zinc-400 font-medium">
          Turn trends into content that actually fits YOU.
        </p>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/60 transition"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <Link href="/dashboard/new">
          <Button size="sm" className="hidden sm:inline-flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" />
            <span>Create Content</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
