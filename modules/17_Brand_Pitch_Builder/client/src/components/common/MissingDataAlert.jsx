import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';

export function MissingDataAlert({ missingMetrics, onFixClick }) {
  if (!missingMetrics || missingMetrics.length === 0) return null;

  return (
    <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Data Integrity Notice: Missing Creator Metrics
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1">
              Brand Pitch Builder strictly refuses to hallucinate fake metrics. The following fields are not set in your profile:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {missingMetrics.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
              The AI will generate metric-neutral phrasing for these areas rather than inventing false numbers.
            </p>
          </div>
        </div>

        {onFixClick && (
          <button
            onClick={onFixClick}
            className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-200/70 hover:bg-amber-200 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 transition-colors"
          >
            Edit Profile
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
