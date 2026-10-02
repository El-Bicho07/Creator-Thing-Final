'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Image as ImageIcon, Play, Sparkles } from 'lucide-react';
import { ThumbnailIdea } from '@/types';

interface TiltedThumbnail3DProps {
  thumb: ThumbnailIdea;
  niche?: string;
}

export const TiltedThumbnail3D: React.FC<TiltedThumbnail3DProps> = ({ thumb, niche }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="perspective-1000 my-3">
      <motion.div
        whileHover={
          shouldReduceMotion
            ? undefined
            : {
                rotateY: 0,
                rotateX: 0,
                scale: 1.02,
                transition: { duration: 0.25, ease: 'easeOut' },
              }
        }
        initial={{ rotateY: -8, rotateX: 4 }}
        className="relative rounded-2xl bg-navy p-5 border-4 border-navy text-white shadow-block-orange transition-transform duration-300 transform-gpu overflow-hidden"
      >
        {/* Background Graphic Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-dark to-black opacity-90" />
        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-orange/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between text-yellow text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 bg-navy-light/80 px-2.5 py-1 rounded-lg border border-yellow/30">
              <ImageIcon className="w-3.5 h-3.5 text-yellow" />
              Thumbnail Concept
            </span>
            <span className="text-white/60 font-mono">16:9 ratio</span>
          </div>

          {/* On-Image Text Overlay Preview */}
          <div className="min-h-[90px] rounded-xl bg-black/50 border-2 border-orange/40 p-4 flex flex-col justify-between relative group">
            <div className="w-10 h-10 rounded-full bg-red text-white flex items-center justify-center border-2 border-white shadow-block-sm">
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            </div>

            <div className="mt-2">
              <p className="font-heading font-black text-lg sm:text-xl text-yellow uppercase leading-tight tracking-tight drop-shadow-md">
                {thumb.textOnImage || 'CLICK THIS VIDEO NOW!'}
              </p>
              {niche && (
                <p className="text-[11px] font-mono text-white/80 uppercase tracking-widest mt-1">
                  [{niche}]
                </p>
              )}
            </div>
          </div>

          {/* Description / Framing advice */}
          <p className="text-xs text-lightblue/90 leading-relaxed pt-1 flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow shrink-0 mt-0.5" />
            <span>{thumb.idea}</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
