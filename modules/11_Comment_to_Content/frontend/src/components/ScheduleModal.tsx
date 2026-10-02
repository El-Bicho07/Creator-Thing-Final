'use client';

import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { Idea } from '@/types';
import { api } from '@/lib/api';

interface ScheduleModalProps {
  idea: Idea | null;
  isOpen: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  idea,
  isOpen,
  onClose,
  onScheduled
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(defaultDate);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !idea) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.scheduleIdea({
        idea_id: idea.id,
        scheduled_date: date,
        notes: notes.trim() || undefined
      });
      onScheduled();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule idea');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-[#141E17] rounded-2xl border border-[#E2EDE5] dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2EDE5] dark:border-slate-800 bg-[#F8FAF8] dark:bg-[#19271E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EAF6EE] text-[#28663D] flex items-center justify-center border border-[#CDE9D5]">
              <CalendarIcon className="w-4 h-4 text-[#3B8253]" />
            </div>
            <h2 className="text-base font-bold text-[#152218] dark:text-white">
              Schedule on Calendar
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#5C6F62] hover:text-[#152218] dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#5C6F62] uppercase tracking-wider mb-1">
              Content Idea
            </label>
            <p className="text-sm font-bold text-[#152218] dark:text-white">
              {idea.title}
            </p>
            <p className="text-xs text-[#28663D] dark:text-[#93DBA6] mt-0.5">
              Format: {idea.format} &bull; Demand: {idea.demand_score}/100
            </p>
          </div>

          <div>
            <label htmlFor="scheduled-date-input" className="block text-xs font-semibold text-[#152218] dark:text-[#E2EBE5] mb-1.5">
              Scheduled Date
            </label>
            <input
              id="scheduled-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-[#E2EDE5] dark:border-slate-800 bg-[#F8FAF8] dark:bg-[#19271E] text-[#152218] dark:text-white text-sm focus:outline-none focus:border-[#3B8253]"
            />
          </div>

          <div>
            <label htmlFor="schedule-notes-input" className="block text-xs font-semibold text-[#152218] dark:text-[#E2EBE5] mb-1.5">
              Production Notes (Optional)
            </label>
            <textarea
              id="schedule-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prepare code snippet for slide 3, record talking head intro first"
              className="w-full px-3 py-2 rounded-xl border border-[#E2EDE5] dark:border-slate-800 bg-[#F8FAF8] dark:bg-[#19271E] text-[#152218] dark:text-white text-xs focus:outline-none focus:border-[#3B8253] resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5C6F62] hover:bg-[#F4FAF5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#3B8253] hover:bg-[#2F6A44] text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
