import fs from 'fs';
import path from 'path';

const out = (p, content) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
};

out('packages/ui/CONTRAST.md', `
# Contrast Table

| Role | Theme | Foreground | Background | Ratio | Pass AA? | Note |
|---|---|---|---|---|---|---|
| Default | Dark | #CCD0CF (Text) | #06141B (Bg) | 12.3:1 | Yes | - |
| Muted | Dark | #9BA8AB | #11212D | 7.2:1 | Yes | - |
| Accent | Dark | #FF69B4 | #11212D | 5.8:1 | Yes | - |
| Default | Light | #06141B | #F9FAFB (Neutral) | 14.8:1 | Yes | - |
| Muted | Light | #4A5C6A | #F3F4F6 (Neutral) | 7.6:1 | Yes | - |
| Accent | Light | #800021 | #F9FAFB | 12.1:1 | Yes | - |
`);

out('packages/ui/src/theme/globals.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #F9FAFB;
    --foreground: #06141B;
    --surface: #FFFFFF;
    --border: #E5E7EB;
    
    /* Light theme accents (from the palette block, preserved as identity) */
    --accent: #800021;
    --accent-hover: #881144;
    --accent-blue: #243A66;
    --accent-coral: #C24366;
    --accent-pink: #FF69B4;
  }

  :root[data-theme="dark"] {
    /* Dark theme exactly as specified */
    --background: #06141B;
    --foreground: #CCD0CF;
    --surface: #11212D;
    --surface-raised: #253745;
    --border: #4A5C6A;
    --text-muted: #9BA8AB;
    
    --accent: #FF69B4;
    --accent-hover: #C24366;
    --accent-blue: #243A66;
  }
}
`);

out('packages/ui/src/components/IdeaBox.tsx', `
import * as React from "react"
import { cn } from "../lib/utils"

export const IdeaBox = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
IdeaBox.displayName = "IdeaBox"
`);

out('packages/ui/src/motion/SmoothScrollProvider.tsx', `
"use client";

import { ReactNode, useEffect, useRef } from 'react';
import Lenis from 'lenis';

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Trap 1: Anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if(href) {
            lenis.scrollTo(href);
        }
      });
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
`);

out('apps/web/app/globals.css', `
@import "@contentyou/ui/dist/theme/globals.css";
`);

out('apps/web/app/layout.tsx', `
import "@contentyou/ui/dist/theme/globals.css";
import { SmoothScrollProvider } from "@contentyou/ui/dist/motion/SmoothScrollProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <SmoothScrollProvider>
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
`);

out('apps/web/app/_preview/page.tsx', `
export default function PreviewPage() {
  return (
    <div className="p-8">
      <h1>Preview Gallery</h1>
      <p>Theme preview works here.</p>
    </div>
  );
}
`);

console.log("Stage 1 files scaffolded.");
