'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Youtube, Calendar, PlusCircle, History, HelpCircle, Menu, X, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenIntro?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenIntro }) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Today', icon: Calendar },
    { href: '/create', label: 'Plan video', icon: PlusCircle, highlight: true },
    { href: '/history', label: 'History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b-2 border-border transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-heading text-xl font-extrabold text-navy tracking-tight group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-orange text-white flex items-center justify-center font-bold shadow-block-sm transition-transform group-hover:scale-105">
            <Youtube className="w-5 h-5 fill-current" />
          </div>
          <span className="flex items-center gap-1.5">
            PostToday
            <span className="hidden xs:inline-block text-[10px] font-sans uppercase font-bold bg-yellow text-navy px-2 py-0.5 rounded-full border border-navy/20">
              Planner
            </span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            if (link.highlight) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="btn-block-orange px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'bg-navy/10 text-navy font-bold dark:bg-lightblue/20 dark:text-lightblue'
                    : 'text-muted hover:text-ink hover:bg-bg'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}

          <div className="h-5 w-px bg-border mx-2" />

          {onOpenIntro && (
            <button
              onClick={onOpenIntro}
              type="button"
              className="px-3 py-2 rounded-xl text-xs font-semibold text-muted hover:text-navy hover:bg-bg flex items-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-orange" />
              How it works
            </button>
          )}
        </nav>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/create"
            className="btn-block-orange px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Plan
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-label="Toggle menu"
            className="p-2 rounded-xl border-2 border-border text-ink bg-card min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-border bg-card px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${
                  isActive
                    ? 'bg-navy/10 text-navy border-2 border-navy/20 dark:bg-lightblue/20 dark:text-lightblue'
                    : 'text-ink hover:bg-bg'
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}

          {onOpenIntro && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenIntro();
              }}
              type="button"
              className="w-full px-4 py-3 rounded-xl font-semibold text-muted text-left flex items-center gap-3 hover:bg-bg"
            >
              <HelpCircle className="w-5 h-5 text-orange" />
              How it works
            </button>
          )}
        </div>
      )}
    </header>
  );
};
