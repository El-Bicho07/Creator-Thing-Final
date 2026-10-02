"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { eventsData, EventItem } from "@/content/events";
import { Calendar, MapPin, Wrench, Users, Compass, X, Sparkles, Layers } from "lucide-react";

export default function EventsPage() {
  const [activeCategory, setActiveCategory] = useState<"All" | "Institutional" | "Creator Works">("All");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const filteredEvents = activeCategory === "All"
    ? eventsData
    : eventsData.filter((e) => e.category === activeCategory);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16 py-8">
      
      {/* HEADER */}
      <section className="space-y-6 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 text-xs text-brand-highlight border border-brand-highlight/30"
        >
          <Layers className="h-3.5 w-3.5" />
          <span className="font-mono">EVENTS & EXHIBITIONS</span>
        </motion.div>

        <h1 className="font-serif text-4xl sm:text-6xl font-bold text-gradient leading-tight">
          Institutional Keynotes & Creator Exhibitions
        </h1>

        <p className="text-sm sm:text-base text-brand-light/80 leading-relaxed font-sans">
          Keynotes, live technology demonstrations, and independent visual exhibitions.
        </p>

        {/* Dual Category Tabs */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setActiveCategory("All")}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
              activeCategory === "All"
                ? "bg-brand-highlight text-brand-primary font-bold shadow-glow-cyan"
                : "glass-panel text-brand-light/80 hover:text-brand-light"
            }`}
          >
            All Events ({eventsData.length})
          </button>
          <button
            onClick={() => setActiveCategory("Institutional")}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
              activeCategory === "Institutional"
                ? "bg-brand-highlight text-brand-primary font-bold shadow-glow-cyan"
                : "glass-panel text-brand-light/80 hover:text-brand-light"
            }`}
          >
            Institutional Keynotes
          </button>
          <button
            onClick={() => setActiveCategory("Creator Works")}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
              activeCategory === "Creator Works"
                ? "bg-brand-highlight text-brand-primary font-bold shadow-glow-cyan"
                : "glass-panel text-brand-light/80 hover:text-brand-light"
            }`}
          >
            Creator Works
          </button>
        </div>
      </section>

      {/* EVENTS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredEvents.map((evt, idx) => (
          <motion.div
            key={evt.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => setSelectedEvent(evt)}
            className="group cursor-pointer rounded-3xl glass-panel-elevated border border-brand-highlight/25 overflow-hidden shadow-glass-md hover:border-brand-highlight/45 transition-all"
          >
            <div className="relative aspect-video overflow-hidden bg-brand-secondary">
              <img
                src={evt.coverImage}
                alt={evt.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-primary via-transparent to-transparent opacity-80" />
              <span className="absolute top-4 left-4 rounded-full bg-brand-primary/80 px-3 py-1 text-xs font-mono font-bold text-brand-highlight border border-brand-highlight/30">
                {evt.category}
              </span>
            </div>

            <div className="p-8 space-y-4">
              <div className="flex items-center gap-4 text-xs font-mono text-brand-light/60">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-brand-highlight" />
                  <span>{evt.date}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-brand-highlight" />
                  <span>{evt.location}</span>
                </span>
              </div>

              <h3 className="font-serif text-2xl font-bold text-brand-light group-hover:text-brand-highlight transition-colors">
                {evt.title}
              </h3>

              <p className="text-xs text-brand-light/75 leading-relaxed line-clamp-2">
                {evt.subtitle}
              </p>

              <div className="pt-2 flex items-center justify-between border-t border-brand-highlight/15 text-xs font-mono text-brand-highlight font-bold">
                <span>ROLE: {evt.role}</span>
                <span>Inspect Event Story →</span>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* EVENT DETAIL MODAL */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl rounded-3xl glass-panel-elevated border border-brand-highlight/40 p-6 sm:p-10 shadow-glass-lg my-8 space-y-8 bg-gradient-to-b from-brand-secondary to-brand-primary max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full glass-panel text-brand-light hover:text-brand-highlight"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-3">
                <span className="rounded-full bg-brand-accent/20 px-3 py-1 text-xs font-mono font-bold text-brand-highlight border border-brand-highlight/30">
                  {selectedEvent.category}
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-brand-light">
                  {selectedEvent.title}
                </h2>
                <div className="flex flex-wrap gap-4 text-xs font-mono text-brand-light/70">
                  <span>{selectedEvent.date}</span>
                  <span>•</span>
                  <span>{selectedEvent.location}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-mono text-brand-highlight uppercase">EVENT STORY</h4>
                <p className="text-sm text-brand-light/90 leading-relaxed font-sans">{selectedEvent.story}</p>
              </div>

              {/* Equipment & Contributors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                <div className="glass-panel p-5 rounded-2xl border border-brand-highlight/15 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-brand-highlight">
                    <Wrench className="h-4 w-4" />
                    <span>EQUIPMENT & TECH USED</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-brand-light/85">
                    {selectedEvent.equipment.map((eq, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-highlight" />
                        <span>{eq}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-brand-highlight/15 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-brand-highlight">
                    <Users className="h-4 w-4" />
                    <span>CONTRIBUTORS & CREDITS</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-brand-light/85">
                    {selectedEvent.contributors.map((c, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <span className="text-brand-light/60">{c.role}</span>
                        <span className="font-semibold text-brand-light">{c.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              <div className="space-y-3 glass-panel p-5 rounded-2xl border border-brand-highlight/15">
                <div className="flex items-center gap-2 text-xs font-mono text-brand-highlight">
                  <Compass className="h-4 w-4" />
                  <span>REFLECTIONS</span>
                </div>
                <p className="text-xs text-brand-light/90 italic font-serif">"{selectedEvent.reflections}"</p>
              </div>

              {/* Event Gallery */}
              {selectedEvent.gallery && selectedEvent.gallery.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-mono text-brand-highlight uppercase">EVENT GALLERY</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedEvent.gallery.map((g, i) => (
                      <div key={i} className="aspect-video overflow-hidden rounded-2xl bg-brand-secondary border border-brand-highlight/20">
                        <img src={g.url} alt={g.caption} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
