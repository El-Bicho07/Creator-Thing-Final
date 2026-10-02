import React, { useState } from 'react';
import { Mail, Copy, Check, Sparkles } from 'lucide-react';

export function SubjectLinePicker({ subjectLines, selectedSubject, onSelectSubject, showToast }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  if (!subjectLines || subjectLines.length === 0) return null;

  const handleCopy = (text, idx, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    showToast?.('Subject line copied to clipboard!', 'success');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-brand-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Email Subject Line Variants (3 High-Converting Hooks)
          </h4>
        </div>
        <span className="text-[11px] text-slate-400">Click to select active hook</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {subjectLines.map((item, idx) => {
          const isSelected = selectedSubject === item.text || (!selectedSubject && idx === 0);
          return (
            <div
              key={idx}
              onClick={() => onSelectSubject(item.text)}
              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 text-brand-950 dark:text-brand-100 ring-1 ring-brand-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    {item.type || `Option ${idx + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopy(item.text, idx, e)}
                    className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    title="Copy subject line"
                  >
                    {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="font-medium line-clamp-2">"{item.text}"</p>
              </div>

              {isSelected && (
                <div className="mt-2 text-[10px] font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Selected for outreach
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
