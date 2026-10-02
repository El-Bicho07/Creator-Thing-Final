"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", updateMousePosition);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* High-contrast ambient background glow follower */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-0 hidden lg:block"
        animate={{
          background: `radial-gradient(550px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.05), transparent 75%)`,
        }}
        transition={{ type: "tween", ease: "backOut", duration: 0.15 }}
      />
      {/* High-contrast cursor light point */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-50 hidden lg:block rounded-full bg-white/40 blur-xs"
        animate={{
          x: mousePosition.x - 8,
          y: mousePosition.y - 8,
          width: 16,
          height: 16,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.2 }}
      />
    </>
  );
}
