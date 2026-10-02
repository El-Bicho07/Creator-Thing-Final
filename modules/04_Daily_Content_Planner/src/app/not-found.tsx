import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full glass-panel text-brand-highlight border border-brand-highlight/30 shadow-glow-cyan">
        <Compass className="h-8 w-8" />
      </div>
      
      <div className="space-y-2">
        <span className="font-mono text-xs font-bold text-brand-accent">404 ARCHIVE NODE NOT FOUND</span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-brand-light">Vector Void</h1>
        <p className="text-sm text-brand-light/70 max-w-md mx-auto">
          The requested digital identity node or page route does not exist in the platform index.
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-brand-highlight px-6 py-3 text-xs font-bold text-brand-primary shadow-glow-cyan hover:scale-105 transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Home Viewport</span>
      </Link>
    </div>
  );
}
