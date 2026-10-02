"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, FolderGit2 } from "lucide-react";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Skills", href: "/skills" },
  { label: "Projects", href: "/projects" },
  { label: "Protosem", href: "/forge", badge: "W0–20" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full transition-all duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex h-14 items-center justify-between rounded-full glass-panel px-6 py-2 shadow-lg border border-white/10">
          
          {/* High Contrast Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <span className="font-serif text-lg tracking-wider text-white font-bold transition-colors group-hover:text-neutral-300">
              THEERAN
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          </Link>

          {/* High Contrast Nav Links */}
          <nav className="hidden md:flex items-center gap-1 xl:gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-1 text-xs font-mono tracking-wide transition-colors ${
                    isActive ? "text-white font-semibold" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {item.label}
                    {item.badge && (
                      <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[9px] font-mono text-white border border-white/20">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTab"
                      className="absolute inset-0 rounded-full bg-neutral-800 border border-white/20"
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action CTA & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <Link
              href="/forge"
              className="hidden lg:flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-mono font-bold text-black hover:bg-neutral-200 transition-all shadow-sm"
            >
              <FolderGit2 className="h-3.5 w-3.5 text-black" />
              <span>Forge Archive</span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-full glass-panel text-white focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.18 }}
            className="md:hidden fixed inset-x-4 top-20 z-50 rounded-2xl glass-panel-elevated p-5 border border-white/15 shadow-2xl"
          >
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-mono transition-all ${
                      isActive
                        ? "bg-neutral-800 text-white font-bold border border-white/20"
                        : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white border border-white/20">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
