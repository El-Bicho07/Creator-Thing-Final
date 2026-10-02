import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({
  title,
  value,
  subvalue,
  icon: Icon,
  trend,
  trendPositive,
  highlight = false,
  badgeText,
}) {
  return (
    <div
      className={`relative p-5 rounded-2xl transition-all duration-300 overflow-hidden ${
        highlight
          ? 'card-lime-highlight shadow-glow-lime'
          : 'card-glass hover:shadow-card-dark'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              {value}
            </h3>
            {badgeText && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-lime-accent/20 text-lime-bright border border-lime-500/30">
                {badgeText}
              </span>
            )}
          </div>
          {subvalue && (
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {subvalue}
            </p>
          )}
        </div>

        {Icon && (
          <div
            className={`p-3 rounded-xl border shrink-0 ${
              highlight
                ? 'bg-lime-accent text-charcoal-950 border-lime-bright'
                : 'bg-charcoal-800 text-slate-300 border-charcoal-700'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-xs">
          {trendPositive !== undefined && (
            trendPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-lime-bright" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            )
          )}
          <span className={trendPositive ? 'text-lime-bright font-medium' : 'text-slate-400'}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}
