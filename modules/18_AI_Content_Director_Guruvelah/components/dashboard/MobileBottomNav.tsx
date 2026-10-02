'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { Flame, PlusCircle, History, User, Settings } from 'lucide-react';

const mobileNavItems = [
  { name: 'Trends', href: '/dashboard', icon: Flame },
  { name: 'Create', href: '/dashboard/new', icon: PlusCircle },
  { name: 'History', href: '/dashboard/history', icon: History },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 px-2 py-2 flex items-center justify-around">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors',
              isActive ? 'text-indigo-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Icon className={cn('w-5 h-5 mb-0.5', isActive ? 'text-indigo-400' : 'text-zinc-500')} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
