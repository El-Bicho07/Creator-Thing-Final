"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { galleryData, PhotoItem } from "@/content/gallery";
import { Camera, X, ChevronLeft, ChevronRight, Layers, Sliders } from "lucide-react";

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const categories = ["All", ...Array.from(new Set(galleryData.map((p) => p.category)))];

  const filteredPhotos = selectedCategory === "All"
    ? galleryData
    : galleryData.filter((p) => p.category === selectedCategory);

  const handleNext = () => {
    if (activePhotoIndex !== null) {
      setActivePhotoIndex((activePhotoIndex + 1) % filteredPhotos.length);
    }
  };

  const handlePrev = () => {
    if (activePhotoIndex !== null) {
      setActivePhotoIndex((activePhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activePhotoIndex === null) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") setActivePhotoIndex(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhotoIndex, filteredPhotos]);

  const activePhoto = activePhotoIndex !== null ? filteredPhotos[activePhotoIndex] : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16 py-8">
      
      {/* HEADER */}
      <section className="space-y-6 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 text-xs text-brand-highlight border border-brand-highlight/30"
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="font-mono">CINEMATIC PHOTOGRAPHY GALLERY</span>
        </motion.div>

        <h1 className="font-serif text-4xl sm:text-6xl font-bold text-gradient leading-tight">
          Printed Photograph Artworks
        </h1>

        <p className="text-sm sm:text-base text-brand-light/80 leading-relaxed font-sans">
          Photographic compositions presented like fine gallery prints with complete EXIF camera metadata.
        </p>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setActivePhotoIndex(null); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? "bg-brand-highlight text-brand-primary font-bold shadow-glow-cyan"
                  : "glass-panel text-brand-light/80 hover:text-brand-light"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* PHOTOGRAPHY MASONRY / GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPhotos.map((photo, idx) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            onClick={() => setActivePhotoIndex(idx)}
            className="group cursor-pointer rounded-2xl glass-panel-elevated p-4 border border-brand-highlight/25 hover:border-brand-highlight/45 transition-all shadow-glass-md flex flex-col justify-between"
          >
            {/* PRINTED PHOTO FRAME */}
            <div className="relative overflow-hidden rounded-xl bg-brand-primary p-2 border border-brand-highlight/20 shadow-inner">
              <div className="overflow-hidden rounded-lg aspect-square sm:aspect-[4/5]">
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-brand-light group-hover:text-brand-highlight transition-colors">
                  {photo.title}
                </h3>
                <span className="font-mono text-[10px] text-brand-highlight font-bold bg-brand-secondary px-2 py-0.5 rounded">
                  {photo.year}
                </span>
              </div>
              <p className="text-xs text-brand-light/70">{photo.description}</p>
              <div className="flex items-center justify-between text-[11px] font-mono text-brand-accent pt-1">
                <span>{photo.location}</span>
                <span>{photo.exif.camera}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-brand-primary/95 backdrop-blur-xl p-4 sm:p-8"
          >
            {/* Close Button */}
            <button
              onClick={() => setActivePhotoIndex(null)}
              className="absolute top-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full glass-panel text-brand-light hover:text-brand-highlight"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Prev / Next Navigation Arrows */}
            <button
              onClick={handlePrev}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full glass-panel text-brand-light hover:text-brand-highlight"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 flex h-12 w-12 items-center justify-center rounded-full glass-panel text-brand-light hover:text-brand-highlight"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Lightbox Content Container */}
            <div className="mx-auto max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-h-[90vh] overflow-y-auto">
              
              {/* Photo Display */}
              <div className="lg:col-span-8 flex justify-center">
                <div className="rounded-2xl p-3 glass-panel-elevated border border-brand-highlight/30 max-h-[70vh]">
                  <img
                    src={activePhoto.imageUrl}
                    alt={activePhoto.title}
                    className="max-h-[65vh] w-auto object-contain rounded-xl"
                  />
                </div>
              </div>

              {/* EXIF Metadata & Story Drawer */}
              <div className="lg:col-span-4 space-y-6 glass-panel p-6 rounded-3xl border border-brand-highlight/20 text-brand-light">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-brand-highlight font-bold uppercase">{activePhoto.category}</span>
                  <h3 className="font-serif text-2xl font-bold">{activePhoto.title}</h3>
                  <p className="text-xs font-mono text-brand-light/60">{activePhoto.location} • {activePhoto.year}</p>
                </div>

                <p className="text-xs text-brand-light/80 leading-relaxed">
                  {activePhoto.description}
                </p>

                {/* EXIF Metadata Grid */}
                <div className="space-y-3 pt-4 border-t border-brand-highlight/20">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-brand-highlight font-bold">
                    <Sliders className="h-3.5 w-3.5" />
                    <span>EXIF CAMERA METADATA</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="glass-panel p-2 rounded-lg">
                      <span className="text-brand-light/50 block text-[10px]">CAMERA</span>
                      <span className="font-semibold text-brand-light">{activePhoto.exif.camera}</span>
                    </div>
                    <div className="glass-panel p-2 rounded-lg">
                      <span className="text-brand-light/50 block text-[10px]">LENS</span>
                      <span className="font-semibold text-brand-light">{activePhoto.exif.lens}</span>
                    </div>
                    <div className="glass-panel p-2 rounded-lg">
                      <span className="text-brand-light/50 block text-[10px]">APERTURE</span>
                      <span className="font-semibold text-brand-highlight">{activePhoto.exif.aperture}</span>
                    </div>
                    <div className="glass-panel p-2 rounded-lg">
                      <span className="text-brand-light/50 block text-[10px]">SHUTTER</span>
                      <span className="font-semibold text-brand-highlight">{activePhoto.exif.shutter}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-brand-light/50 text-center pt-2">
                  Use ← / → Arrow Keys to Navigate
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
