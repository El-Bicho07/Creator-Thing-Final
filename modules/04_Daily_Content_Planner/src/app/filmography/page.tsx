"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { filmographyData, FilmItem } from "@/content/filmography";
import { Film, Play, X, Award, Camera, Disc, Info, Layers } from "lucide-react";

export default function FilmographyPage() {
  const [selectedFilm, setSelectedFilm] = useState<FilmItem>(filmographyData[0]);
  const [trailerModalOpen, setTrailerModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16 py-8">
      
      {/* HEADER */}
      <section className="space-y-6 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 text-xs text-brand-highlight border border-brand-highlight/30"
        >
          <Film className="h-3.5 w-3.5" />
          <span className="font-mono">FLAGSHIP STREAMING FILMOGRAPHY</span>
        </motion.div>

        <h1 className="font-serif text-4xl sm:text-6xl font-bold text-gradient leading-tight">
          Cinema & Narrative Films
        </h1>

        <p className="text-sm sm:text-base text-brand-light/80 leading-relaxed font-sans">
          Independent short films, documentary pieces, and digital cinema releases presented with a premium streaming platform interface.
        </p>
      </section>

      {/* FEATURED STREAMING STAGE */}
      <section className="relative rounded-3xl overflow-hidden glass-panel border border-brand-highlight/30 shadow-glass-lg min-h-[600px] flex flex-col justify-end">
        
        {/* Backdrop Image */}
        <div className="absolute inset-0 bg-brand-primary">
          <img
            src={selectedFilm.backdropImage}
            alt={selectedFilm.title}
            className="h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-primary via-brand-primary/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary via-brand-primary/40 to-transparent" />
        </div>

        {/* Stage Content */}
        <div className="relative z-10 p-8 sm:p-14 max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-brand-highlight px-3 py-1 text-xs font-mono font-bold text-brand-primary shadow-glow-cyan">
              {selectedFilm.rating}
            </span>
            <span className="text-xs font-mono text-brand-light/70">{selectedFilm.year}</span>
            <span className="text-xs font-mono text-brand-light/70">• {selectedFilm.runtime}</span>
            <span className="text-xs font-mono text-brand-highlight font-bold">• {selectedFilm.genre}</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-4xl sm:text-6xl font-bold text-brand-light leading-tight">
              {selectedFilm.title}
            </h2>
            <p className="font-serif text-lg italic text-brand-highlight">"{selectedFilm.tagline}"</p>
          </div>

          <p className="text-sm sm:text-base text-brand-light/90 leading-relaxed max-w-2xl font-sans">
            {selectedFilm.synopsis}
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            {selectedFilm.trailerUrl && (
              <button
                onClick={() => setTrailerModalOpen(true)}
                className="flex items-center gap-2.5 rounded-full bg-brand-highlight px-6 py-3 text-sm font-bold text-brand-primary shadow-glow-cyan hover:scale-105 transition-all"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Watch Trailer / Teaser</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FILMOGRAPHY ROW SELECTOR */}
      <section className="space-y-6">
        <h3 className="font-serif text-2xl font-bold text-brand-light">Film Catalog</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filmographyData.map((film) => {
            const isSelected = selectedFilm.id === film.id;
            return (
              <motion.div
                key={film.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedFilm(film)}
                className={`cursor-pointer rounded-2xl p-4 border transition-all flex items-center gap-4 ${
                  isSelected
                    ? "glass-panel-elevated border-brand-highlight shadow-glow-cyan"
                    : "glass-panel border-brand-highlight/20 hover:border-brand-highlight/40"
                }`}
              >
                <div className="h-20 w-16 rounded-lg overflow-hidden bg-brand-secondary shrink-0">
                  <img src={film.posterImage} alt={film.title} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif text-base font-bold text-brand-light">{film.title}</h4>
                  <p className="text-xs text-brand-highlight font-mono">{film.year} • {film.genre}</p>
                  <p className="text-[11px] text-brand-light/60 line-clamp-1">{film.role}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* SELECTED FILM PRODUCTION & CREW DETAILS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Technical Specs */}
        <div className="lg:col-span-6 glass-panel-elevated rounded-3xl p-8 border border-brand-highlight/25 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-brand-highlight font-bold">
            <Camera className="h-4 w-4" />
            <span>PRODUCTION TECHNICAL SPECIFICATIONS</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 text-xs font-mono">
            <div className="glass-panel p-3 rounded-xl">
              <span className="text-brand-light/50 block text-[10px]">CINEMA CAMERA</span>
              <span className="font-semibold text-brand-light">{selectedFilm.productionDetails.camera}</span>
            </div>
            <div className="glass-panel p-3 rounded-xl">
              <span className="text-brand-light/50 block text-[10px]">ASPECT RATIO</span>
              <span className="font-semibold text-brand-light">{selectedFilm.productionDetails.aspectRatio}</span>
            </div>
            <div className="glass-panel p-3 rounded-xl">
              <span className="text-brand-light/50 block text-[10px]">SOUND FORMAT</span>
              <span className="font-semibold text-brand-highlight">{selectedFilm.productionDetails.soundFormat}</span>
            </div>
            <div className="glass-panel p-3 rounded-xl">
              <span className="text-brand-light/50 block text-[10px]">COLOR PIPELINE</span>
              <span className="font-semibold text-brand-highlight">{selectedFilm.productionDetails.colorGrading}</span>
            </div>
          </div>
        </div>

        {/* Crew Roster */}
        <div className="lg:col-span-6 glass-panel rounded-3xl p-8 border border-brand-highlight/25 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-brand-highlight font-bold">
            <Award className="h-4 w-4" />
            <span>DIRECTORIAL CREW & ROSTER</span>
          </div>

          <ul className="space-y-3 pt-2 text-xs text-brand-light/85">
            {selectedFilm.crew.map((c, i) => (
              <li key={i} className="flex items-center justify-between border-b border-brand-highlight/15 pb-2">
                <span className="text-brand-light/60 font-mono">{c.role}</span>
                <span className="font-bold text-brand-light">{c.name}</span>
              </li>
            ))}
          </ul>
        </div>

      </section>

      {/* TRAILER EMBED MODAL */}
      <AnimatePresence>
        {trailerModalOpen && selectedFilm.trailerUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/90 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-4xl rounded-3xl glass-panel-elevated p-4 border border-brand-highlight/40 shadow-glass-lg space-y-4">
              <button
                onClick={() => setTrailerModalOpen(false)}
                className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full glass-panel text-brand-light hover:text-brand-highlight"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
                <iframe
                  src={selectedFilm.trailerUrl}
                  title={`${selectedFilm.title} Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
