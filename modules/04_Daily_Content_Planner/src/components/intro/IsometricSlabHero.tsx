'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';

export const IsometricSlabHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Mouse position normalized [-1, 1]
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for tilt
  const springConfig = { damping: 25, stiffness: 200 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // Transform mouse coordinates into isometric rotation offsets
  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [65, 45]);
  const rotateZ = useTransform(smoothMouseX, [-0.5, 0.5], [-55, -35]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (window.innerWidth / 2)));
      const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (window.innerHeight / 2)));
      mouseX.set(normX);
      mouseY.set(normY);
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square max-w-[280px] sm:max-w-[340px] mx-auto flex items-center justify-center perspective-1000 py-6"
    >
      <motion.div
        animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          transformStyle: 'preserve-3d',
          rotateX: shouldReduceMotion ? 55 : rotateX,
          rotateZ: shouldReduceMotion ? -45 : rotateZ,
        }}
        className="relative w-44 h-44 sm:w-56 sm:h-56 cursor-pointer"
      >
        {/* Slab 1: Light Blue (Deepest bottom layer) */}
        <motion.div
          style={{ transform: 'translateZ(0px)', transformStyle: 'preserve-3d' }}
          className="absolute inset-0 bg-lightblue rounded-3xl border-4 border-navy shadow-2xl flex items-center justify-center"
        >
          <span className="text-navy/30 font-heading font-black text-xs uppercase tracking-widest translate-y-12">
            PostToday
          </span>
        </motion.div>

        {/* Slab 2: Red (Offset slab 2) */}
        <motion.div
          style={{ transform: 'translateZ(28px)', transformStyle: 'preserve-3d' }}
          className="absolute inset-0 bg-red rounded-3xl border-4 border-navy flex items-center justify-center"
        >
          <div className="w-12 h-1 bg-white/30 rounded-full -translate-y-8" />
        </motion.div>

        {/* Slab 3: Yellow (Step slab 3) */}
        <motion.div
          style={{ transform: 'translateZ(56px)', transformStyle: 'preserve-3d' }}
          className="absolute inset-0 bg-yellow rounded-3xl border-4 border-navy flex items-center justify-center"
        >
          <div className="w-3/4 h-2 bg-navy/10 rounded-full" />
        </motion.div>

        {/* Slab 4: Orange Top Slab with Play Icon */}
        <motion.div
          style={{ transform: 'translateZ(84px)', transformStyle: 'preserve-3d' }}
          className="absolute inset-0 bg-orange rounded-3xl border-4 border-navy flex flex-col items-center justify-center p-4 shadow-block-navy"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-navy text-yellow flex items-center justify-center border-4 border-white shadow-block-sm transition-transform hover:scale-110">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-0.5" />
          </div>
          <p className="font-heading font-extrabold text-white text-xs sm:text-sm mt-3 tracking-wide drop-shadow">
            TODAY&apos;S PLAN
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
