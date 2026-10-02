'use client';

import React from 'react';
import { AlertTriangle, Database, Bot, Key, Clock, ExternalLink } from 'lucide-react';

interface SetupRequiredProps {
  status: {
    supabase: boolean;
    ai: boolean;
    serviceRole: boolean;
    cron: boolean;
  };
}

export function SetupRequired({ status }: SetupRequiredProps) {
  const items = [
    {
      name: 'Supabase URL & Anon Key',
      configured: status.supabase,
      icon: Database,
      envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      docs: 'Create a project at supabase.com and copy API keys.',
    },
    {
      name: 'Google Gemini AI Key',
      configured: status.ai,
      icon: Bot,
      envVars: ['GEMINI_API_KEY'],
      docs: 'Generate an API key in Google AI Studio (aistudio.google.com).',
    },
    {
      name: 'Supabase Service Role Key',
      configured: status.serviceRole,
      icon: Key,
      envVars: ['SUPABASE_SERVICE_ROLE_KEY'],
      docs: 'Required for global trend ingestion writes on the server.',
    },
    {
      name: 'Cron Ingestion Secret',
      configured: status.cron,
      icon: Clock,
      envVars: ['CRON_SECRET'],
      docs: 'Secret token used to secure background trend refresh endpoints.',
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center space-x-3 text-amber-400">
          <AlertTriangle className="w-8 h-8 flex-shrink-0" />
          <h1 className="text-2xl font-bold tracking-tight">Setup Required</h1>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed">
          The Trend-to-Content Engine requires environment variable configuration to execute live operations. 
          Please copy <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">.env.example</code> to <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">.env.local</code> and set the missing keys.
        </p>

        <div className="space-y-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="flex items-start justify-between p-4 bg-zinc-950 border border-zinc-800/80 rounded-lg text-sm"
              >
                <div className="flex space-x-3 items-start">
                  <Icon className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-zinc-200">{item.name}</div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5">
                      {item.envVars.join(', ')}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">{item.docs}</div>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                  {item.configured ? (
                    <span className="px-2.5 py-1 text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 rounded-full">
                      Configured
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-800/50 rounded-full">
                      Missing
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>See docs/DEPLOY.md for full deployment setup guide.</span>
          <a
            href="/api/health"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 transition"
          >
            <span>Check /api/health</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
