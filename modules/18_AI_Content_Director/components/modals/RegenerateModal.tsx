"use client";

import React, { useState } from "react";
import { RotateCw, X, Sparkles, Send } from "lucide-react";

interface RegenerateModalProps {
  stageNumber: number;
  stageTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (guidance?: string) => void;
}

export function RegenerateModal({
  stageNumber,
  stageTitle,
  isOpen,
  onClose,
  onConfirm,
}: RegenerateModalProps) {
  const [guidance, setGuidance] = useState("");

  if (!isOpen) return null;

  const handleRegenerate = () => {
    onConfirm(guidance.trim() || undefined);
    setGuidance("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl z-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <RotateCw className="h-5 w-5 text-primary" />
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Regenerate Stage {stageNumber}: {stageTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Optional Director Notes / Steering Instructions</span>
          </label>
          <textarea
            rows={4}
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            placeholder="e.g. Make the hook more aggressive and urgent. Focus on solo founder time constraints. Add more dramatic lighting cues..."
            className="w-full rounded-xl border border-input bg-background/50 p-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-[11px] text-muted-foreground">
            Leave blank to regenerate with standard settings, or provide feedback above to steer the AI's generation.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleRegenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary-hover shadow-md shadow-primary/20 transition-all"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Regenerate Stage</span>
          </button>
        </div>
      </div>
    </div>
  );
}
