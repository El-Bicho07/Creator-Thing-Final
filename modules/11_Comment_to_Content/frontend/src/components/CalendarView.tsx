'use client';

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';
import { CalendarEvent, Idea } from '@/types';
import { api } from '@/lib/api';

interface CalendarViewProps {
  events: CalendarEvent[];
  ideas: Idea[];
  onRefresh: () => void;
  onOpenSchedule: (idea: Idea) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  ideas,
  onRefresh,
  onOpenSchedule
}) => {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Generate current week dates (Monday to Sunday)
  const getWeekDates = (offsetWeeks: number) => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff + offsetWeeks * 7));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDates = getWeekDates(currentWeekOffset);

  const formatDateKey = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  const handleUnschedule = async (eventId: string) => {
    try {
      await api.deleteCalendarEvent(eventId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleMarkPosted = async (ideaId: string) => {
    try {
      await api.updateIdeaStatus(ideaId, 'posted');
      onRefresh();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const unscheduledIdeas = ideas.filter(
    (i) => i.status === 'saved' || i.status === 'new'
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAF6EE] text-[#28663D] flex items-center justify-center border border-[#CDE9D5]">
            <CalendarIcon className="w-5 h-5 text-[#3B8253]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#152218] dark:text-white">
              Content Production Calendar
            </h2>
            <p className="text-xs text-[#5C6F62] dark:text-[#8FA596]">
              Schedule ideas and organize your shooting pipeline for the week
            </p>
          </div>
        </div>

        {/* Week navigation controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
            className="p-2 rounded-xl text-[#5C6F62] hover:text-[#152218] border border-[#E2EDE5] dark:border-slate-800 hover:bg-[#F4FAF5] transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentWeekOffset(0)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#28663D] bg-[#EAF6EE] border border-[#CDE9D5] hover:bg-[#D5ECDC] transition"
          >
            Current Week
          </button>

          <button
            onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
            className="p-2 rounded-xl text-[#5C6F62] hover:text-[#152218] border border-[#E2EDE5] dark:border-slate-800 hover:bg-[#F4FAF5] transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDates.map((date) => {
          const dateStr = formatDateKey(date);
          const dayEvents = events.filter((e) => e.scheduled_date === dateStr);
          const isToday = formatDateKey(new Date()) === dateStr;

          return (
            <div
              key={dateStr}
              className={`rounded-2xl border flex flex-col min-h-[360px] p-3.5 transition ${
                isToday
                  ? 'bg-[#F4FAF5] dark:bg-[#19271E] border-[#7CCB91]'
                  : 'bg-white dark:bg-[#141E17] border-[#E2EDE5] dark:border-slate-800'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5EFE7] dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6F62] block">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className={`text-sm font-black ${isToday ? 'text-[#3B8253] dark:text-[#6EC886]' : 'text-[#152218] dark:text-white'}`}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {isToday && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#3B8253] text-white">
                    Today
                  </span>
                )}
              </div>

              {/* Scheduled Cards for this Day */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {dayEvents.map((evt) => {
                  const idea = evt.idea;
                  return (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl bg-white dark:bg-[#19271E] border border-[#CDE9D5] dark:border-slate-700 shadow-xs space-y-2 hover:border-[#3B8253] transition group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF6EE] text-[#28663D] border border-[#CDE9D5]">
                          {idea?.format || 'Reel'}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleUnschedule(evt.id)}
                            className="p-1 text-[#5C6F62] hover:text-rose-500 rounded"
                            title="Unschedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-bold text-[#152218] dark:text-white line-clamp-2">
                        {idea?.title || 'Scheduled Idea'}
                      </p>

                      {evt.notes && (
                        <p className="text-[10px] text-[#5C6F62] italic line-clamp-2 bg-[#F8FAF8] dark:bg-[#141E17] p-1.5 rounded-lg border border-[#E5EFE7]">
                          📝 {evt.notes}
                        </p>
                      )}

                      <div className="pt-1 flex items-center justify-between border-t border-[#E5EFE7] dark:border-slate-800">
                        <span className="text-[10px] text-[#3B8253] font-bold">
                          ★ {idea?.demand_score || 0}
                        </span>

                        {idea?.status === 'posted' ? (
                          <span className="text-[10px] font-bold text-[#28663D] flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 text-[#3B8253]" />
                            Posted
                          </span>
                        ) : (
                          <button
                            onClick={() => idea && handleMarkPosted(idea.id)}
                            className="text-[10px] font-semibold text-[#5C6F62] hover:text-[#3B8253] transition"
                          >
                            Mark Posted
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {dayEvents.length === 0 && (
                  <div className="h-full flex items-center justify-center text-[#8FA596] text-xs py-10 opacity-50">
                    No posts
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled Saved Ideas Shelf */}
      {unscheduledIdeas.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141E17] border border-[#E2EDE5] dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#152218] dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#3B8253]" />
              Quick-Schedule Ideas ({unscheduledIdeas.length} Available)
            </h3>
            <span className="text-xs text-[#5C6F62]">
              Pick a date to drop into the production calendar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unscheduledIdeas.slice(0, 6).map((idea) => (
              <div
                key={idea.id}
                className="p-3.5 rounded-xl bg-[#F8FAF8] dark:bg-[#19271E] border border-[#E2EDE5] dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[#28663D] dark:text-[#93DBA6] uppercase tracking-wider block">
                    {idea.format} &bull; Score: {idea.demand_score}
                  </span>
                  <p className="text-xs font-bold text-[#152218] dark:text-white truncate mt-0.5">
                    {idea.title}
                  </p>
                </div>
                <button
                  onClick={() => onOpenSchedule(idea)}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#3B8253] hover:bg-[#2F6A44] text-white shadow-xs flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Slot</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
