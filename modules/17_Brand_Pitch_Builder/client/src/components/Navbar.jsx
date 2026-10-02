import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sparkles, Layers, Sun, Moon, Edit3 } from 'lucide-react';

export function Navbar({ activeTab, setActiveTab }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand Title & One-Line Description */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white leading-tight truncate">
              Brand Pitch Builder
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate hidden sm:block">
              Create a personalized brand collaboration proposal in seconds.
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('form')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'form'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              New Pitch
            </button>

            {activeTab === 'editor' && (
              <button
                onClick={() => setActiveTab('editor')}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3 text-brand-500" />
                <span>Editor</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'library'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Saved Proposals</span>
              <span className="sm:hidden">Library</span>
            </button>
          </nav>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Mobile-only one-line description */}
      <div className="sm:hidden px-4 pb-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        Create a personalized brand collaboration proposal in seconds.
      </div>
    </header>
  );
}
