'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Lightbulb, 
  BarChart3, 
  Calendar as CalendarIcon, 
  MessageSquareShare, 
  UploadCloud, 
  Sun, 
  Moon, 
  Activity,
  Play
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'board' | 'insights' | 'calendar' | 'replies' | 'ingest';
  setActiveTab: (tab: 'board' | 'insights' | 'calendar' | 'replies' | 'ingest') => void;
  onOpenIngest: () => void;
  onQuickAnalyze: () => void;
  isAnalyzing: boolean;
  jobProgress?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenIngest,
  onQuickAnalyze,
  isAnalyzing,
  jobProgress = 0
}) => {
  const [isDark, setIsDark] = useState(false);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    // Default to Light mode (White + Pista) unless user specifically chose dark
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    // Health check ping
    const checkStatus = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/health');
        setIsHealthy(res.ok);
      } catch {
        setIsHealthy(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const navItems = [
    { id: 'board', label: 'Idea Board', icon: Lightbulb },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
    { id: 'calendar', label: 'Content Calendar', icon: CalendarIcon },
    { id: 'replies', label: 'Comment Replies', icon: MessageSquareShare },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E3ECE5] dark:border-slate-800/80 bg-white/95 dark:bg-[#0D1510]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('board')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3B8253] to-[#52B773] flex items-center justify-center shadow-md shadow-[#3B8253]/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#152218] dark:text-[#F3F8F4]">
                  Com<span className="text-[#3B8253] dark:text-[#6EC886]">Idea</span>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#EAF6EE] dark:bg-[#19271E] text-[#28663D] dark:text-[#93DBA6] border border-[#CDE9D5] dark:border-[#2D4C39]">
                  Instagram Engine
                </span>
              </div>
              <p className="text-[11px] text-[#5C6F62] dark:text-[#8FA596] font-medium hidden sm:block">
                Turn Comments into Viral Content
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#F4FAF5] dark:bg-[#141E17] p-1.5 rounded-2xl border border-[#E3ECE5] dark:border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white dark:bg-[#19271E] text-[#28663D] dark:text-[#93DBA6] border border-[#CDE9D5] dark:border-[#2D4C39] shadow-xs'
                      : 'text-[#5C6F62] dark:text-[#8FA596] hover:text-[#152218] dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#19271E]/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#3B8253] dark:text-[#6EC886]' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Actions & Utilities */}
          <div className="flex items-center gap-2.5">
            {/* Backend health status badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F4FAF5] dark:bg-[#141E17] border border-[#E3ECE5] dark:border-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  isHealthy === true
                    ? 'bg-[#3B8253] animate-pulse'
                    : isHealthy === false
                    ? 'bg-rose-500'
                    : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className="text-[#5C6F62] dark:text-[#8FA596] text-[11px]">
                {isHealthy === true ? 'Engine Ready' : isHealthy === false ? 'API Offline' : 'Connecting...'}
              </span>
            </div>

            {/* Ingestion & Connect button */}
            <button
              onClick={onOpenIngest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-[#141E17] hover:bg-[#F4FAF5] dark:hover:bg-[#19271E] text-[#28663D] dark:text-[#93DBA6] border border-[#CDE9D5] dark:border-[#2D4C39] transition shadow-xs"
              title="Connect comments data (Demo, CSV, Instagram)"
            >
              <UploadCloud className="w-4 h-4 text-[#3B8253]" />
              <span>Data Source</span>
            </button>

            {/* Analyze Comments Button */}
            <button
              onClick={onQuickAnalyze}
              disabled={isAnalyzing}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all ${
                isAnalyzing
                  ? 'bg-[#3B8253]/60 cursor-not-allowed'
                  : 'bg-[#3B8253] hover:bg-[#2F6A44] active:scale-98 shadow-[#3B8253]/20'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Analyzing {jobProgress}%</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Engine</span>
                </>
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[#5C6F62] dark:text-[#8FA596] hover:bg-[#F4FAF5] dark:hover:bg-[#141E17] border border-[#E3ECE5] dark:border-slate-800 transition"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#3B8253]" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-[#E3ECE5] dark:border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center gap-1 py-1 px-2 text-xs font-medium ${
                  isActive
                    ? 'text-[#28663D] dark:text-[#93DBA6]'
                    : 'text-[#5C6F62] dark:text-[#8FA596]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
