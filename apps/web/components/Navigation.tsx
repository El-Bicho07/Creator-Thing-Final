"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  Home,
  Calendar,
  LayoutDashboard,
  Target,
  TrendingUp,
  Library,
  Menu,
  X,
  FlaskConical,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const navigation = [
  { name: "Start", href: "/start", icon: Home },
  { name: "Today", href: "/today", icon: Calendar },
  { name: "Studio", href: "/studio", icon: LayoutDashboard },
  { name: "Coach", href: "/coach", icon: Target },
  { name: "Growth", href: "/growth", icon: TrendingUp },
  { name: "Library", href: "/library", icon: Library },
  // Phase 2 verification surface; the real Library UX lands in Phase 3.
  { name: "Phase 2", href: "/phase2", icon: FlaskConical },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/start" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">SC</span>
              </div>
              <span className="font-semibold text-lg">Solo Creator OS</span>
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex md:items-center md:space-x-2">
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center space-x-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg">
                  <User className="h-3.5 w-3.5 text-primary-600" />
                  <span className="max-w-[140px] truncate">{user.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex items-center space-x-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 rounded-lg transition-colors border border-red-200 dark:border-red-900"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center space-x-2">
            {user ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-xs text-red-600 dark:text-red-400 font-medium px-2 py-1 border border-red-200 dark:border-red-900 rounded"
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/login"
                className="text-xs text-white bg-primary-600 px-2.5 py-1 rounded font-medium"
              >
                Sign In
              </Link>
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={clsx(
          "md:hidden border-t border-gray-200 dark:border-gray-700",
          mobileMenuOpen ? "block" : "hidden"
        )}
      >
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium",
                  isActive
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}