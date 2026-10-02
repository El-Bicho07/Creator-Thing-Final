"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Bookmark,
  History,
  Settings,
  Plus,
  Sparkles,
  Newspaper,
  Compass
} from 'lucide-react';

const navItems = [
  { name: 'Research Dispatch', href: '/research', icon: Search, tag: 'Live' },
  { name: 'Saved Dossiers', href: '/saved', icon: Bookmark, tag: null },
  { name: 'Search Archive', href: '/history', icon: History, tag: null },
  { name: 'Engine & AI Settings', href: '/settings', icon: Settings, tag: null },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 pt-6 pb-6 px-4 z-40 backdrop-blur-2xl bg-white/75 border-r border-[#E8E2D5] shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Newspaper Masthead Brand Logo */}
      <Link href="/research" className="flex items-center gap-3 px-2 mb-6 group">
        {/* Instagram Story Gradient Ring */}
        <div className="p-[2px] rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm group-hover:scale-105 transition-transform duration-300">
          <div className="w-9 h-9 rounded-[14px] bg-[#FAF7F2] text-stone-900 flex items-center justify-center font-headline font-bold text-sm tracking-tight border border-white/60">
            TI
          </div>
        </div>
        <div>
          <span className="font-headline text-lg font-bold text-stone-900 tracking-tight block leading-tight">
            Topic Intel
          </span>
          <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block font-sans">
            The Research Gazette
          </span>
        </div>
      </Link>

      {/* New Research Action Button with Instagram sunset glow */}
      <Link
        href="/research"
        className="relative group flex items-center justify-center gap-2 p-[1px] rounded-2xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] mb-6 shadow-sm hover:shadow-md hover:shadow-rose-500/20 transition-all duration-300"
      >
        <div className="w-full h-full py-2.5 px-4 rounded-[15px] bg-gradient-to-r from-[#e6683c] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center gap-2 font-sans font-bold text-xs tracking-wide">
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Research</span>
        </div>
      </Link>

      {/* Magazine Nav Links */}
      <div className="px-2 mb-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 font-sans">
          Gazette Navigation
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/research' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-white/90 text-stone-900 shadow-xs border border-[#E8E2D5] font-bold'
                  : 'text-stone-600 hover:bg-white/50 hover:text-stone-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1 rounded-lg transition-colors ${isActive ? 'text-[#dc2743]' : 'text-stone-400'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span>{item.name}</span>
              </div>
              {item.tag && (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 text-[#dc2743] border border-rose-200/50">
                  {item.tag}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Editorial Masthead Footer */}
      <div className="pt-4 border-t border-[#E8E2D5] space-y-2">
        <div className="p-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Wire Connected
            </span>
            <span className="text-[9px] font-bold text-stone-400">EDITION 2026</span>
          </div>
          <p className="text-[11px] text-stone-600 leading-snug">
            Sourced via Wikipedia, CrossRef DOIs & Academic Archives.
          </p>
        </div>
      </div>
    </aside>
  );
}
