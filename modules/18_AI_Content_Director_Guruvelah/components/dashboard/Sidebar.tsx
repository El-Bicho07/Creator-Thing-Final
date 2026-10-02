'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  Sparkles,
  Flame,
  PlusCircle,
  History,
  User,
  Settings,
  Zap,
} from 'lucide-react';

const navItems = [
  { name: 'Trending Topics', href: '/dashboard', icon: Flame },
  { name: 'Create Content', href: '/dashboard/new', icon: PlusCircle },
  { name: 'Content History', href: '/dashboard/history', icon: History },
  { name: 'Creator Profile', href: '/dashboard/profile', icon: User },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-zinc-950 border-r border-zinc-800/80 min-h-screen p-4 flex-shrink-0">
      {/* Brand Logo */}
      <Link href="/dashboard" className="flex items-center space-x-2.5 px-3 py-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-fuchsia-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <Zap className="w-4 h-4 fill-current" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-zinc-100">TrendEngine</span>
          <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Creator SaaS</span>
        </div>
      </Link>

      {/* Nav links */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-zinc-800/80 text-zinc-100 shadow-sm border border-zinc-700/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-400' : 'text-zinc-400')} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Tagline Card */}
      <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl mt-auto">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Angle Engine v1.0</span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-tight">
          Personalized strategy matching your niche, tone & audience.
        </p>
      </div>
    </aside>
  );
}
