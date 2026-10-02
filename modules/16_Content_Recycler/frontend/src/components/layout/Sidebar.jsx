import React from 'react';
import { 
  LayoutDashboard, 
  Library, 
  Sparkles, 
  Network, 
  CalendarCheck, 
  FileSpreadsheet, 
  Settings, 
  RotateCw, 
  LogOut, 
  User, 
  AtSign, 
  CheckCircle,
  Database
} from 'lucide-react';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  user, 
  onLogout, 
  onSeedDemo, 
  isSeeding, 
  dbStatus, 
  postCount,
  isOpen,
  setIsOpen
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'library', label: 'Content Library', icon: Library, count: postCount },
    { id: 'recommendations', label: 'Recommendations', icon: Sparkles, badge: 'AI' },
    { id: 'similarity', label: 'Similarity Engine', icon: Network },
    { id: 'planner', label: 'Content Planner', icon: CalendarCheck },
    { id: 'importer', label: 'CSV Data Ingest', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings & Baseline', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-charcoal-950/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-charcoal-900 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-muted border border-lime-500/40 flex items-center justify-center text-lime-bright shadow-glow-subtle">
              <RotateCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Content<span className="text-lime-accent">Recycler</span>
              </h1>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                SIH 2026 • AI Engine
              </p>
            </div>
          </div>
        </div>

        {/* Database Status Ribbon */}
        <div className="px-4 py-2 bg-charcoal-950/60 border-b border-slate-800/60 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Database className="w-3.5 h-3.5 text-lime-accent" />
            <span className="truncate max-w-[120px]">{dbStatus?.mode || 'Demo Engine'}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-lime-accent/10 text-lime-bright border border-lime-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-accent animate-pulse" />
            Active
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-lime-accent text-charcoal-950 font-bold shadow-glow-lime'
                    : 'text-slate-300 hover:text-white hover:bg-charcoal-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-charcoal-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-charcoal-950/20 text-charcoal-950' : 'bg-lime-muted text-lime-bright border border-lime-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-charcoal-950/20 text-charcoal-950' : 'bg-charcoal-800 text-slate-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Quick Demo Seed Action */}
        <div className="p-3 mx-3 mb-3 rounded-2xl bg-charcoal-850/90 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Demo Data Pack</span>
            <span className="text-[10px] text-lime-bright font-mono">50 Posts</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Reset or reload synthetic Instagram analytics for SIH evaluation.
          </p>
          <button
            onClick={onSeedDemo}
            disabled={isSeeding}
            className="w-full py-2 px-3 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 text-white font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            <RotateCw className={`w-3.5 h-3.5 text-lime-accent ${isSeeding ? 'animate-spin' : ''}`} />
            {isSeeding ? 'Reloading...' : 'Reload Demo Data'}
          </button>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-charcoal-950/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-lime-glow to-lime-accent text-charcoal-950 font-bold flex items-center justify-center text-xs shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'C'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user?.name || 'Arjun Sharma'}
                </p>
                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                  <AtSign className="w-2.5 h-2.5 text-lime-bright" />
                  {user?.creatorProfile?.handle || '@arjun_codes'}
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-charcoal-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}
