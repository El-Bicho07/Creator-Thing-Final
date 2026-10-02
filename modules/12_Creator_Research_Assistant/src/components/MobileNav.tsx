"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bookmark, History, Settings } from 'lucide-react';

const mobileNavItems = [
  { name: 'Dispatch', href: '/research', icon: Search },
  { name: 'Saved', href: '/saved', icon: Bookmark },
  { name: 'Archive', href: '/history', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full backdrop-blur-2xl bg-white/85 border-t border-[#E8E2D5] flex justify-around items-center py-2 px-3 z-50 shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
      {mobileNavItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/research' && pathname.startsWith(item.href));
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
              isActive ? 'text-[#dc2743] font-bold' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-gradient-to-tr from-[#f09433]/15 via-[#dc2743]/15 to-[#bc1888]/15 text-[#dc2743]' : ''}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] tracking-tight font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
