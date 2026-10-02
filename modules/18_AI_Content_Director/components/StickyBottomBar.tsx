"use client";

import React, { useState } from "react";
import {
  Edit3,
  RotateCw,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

interface StickyBottomBarProps {
  currentStage: number;
  isStageReady: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onRegenerate: () => void;
  onApproveAndContinue: () => void;
  stageContentForCopy: string;
}

export function StickyBottomBar({
  currentStage,
  isStageReady,
  isLoading,
  onEdit,
  onRegenerate,
  onApproveAndContinue,
  stageContentForCopy,
}: StickyBottomBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!stageContentForCopy) return;
    const ok = await copyToClipboard(stageContentForCopy);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isFinalStage = currentStage === 7;

  return (
    <div className="sticky bottom-0 z-30 w-full border-t border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 px-3 py-3 sm:px-6 p-safe-bottom">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Secondary Actions: Edit, Regenerate, Copy */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isStageReady && (
            <>
              {/* Edit Stage Button */}
              <button
                onClick={onEdit}
                disabled={isLoading}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-4 text-xs font-semibold text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-w-[44px] justify-center"
                title="Edit Stage Data"
              >
                <Edit3 className="h-4 w-4 text-muted-foreground" />
                <span className="hidden sm:inline">Edit</span>
              </button>

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                disabled={isLoading}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-4 text-xs font-semibold text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-w-[44px] justify-center"
                title="Copy Stage to Clipboard"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span className="hidden sm:inline text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-muted-foreground" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Regenerate Button */}
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-4 text-xs font-semibold text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-w-[44px] justify-center"
            title="Regenerate this stage"
          >
            <RotateCw className={`h-4 w-4 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">Regenerate</span>
          </button>
        </div>

        {/* Right Primary Action: Approve & Continue */}
        <div className="flex items-center gap-2">
          <button
            onClick={onApproveAndContinue}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 sm:px-6 text-xs sm:text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary transition-all min-w-[44px] justify-center"
          >
            {isFinalStage ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span>Complete Production Package</span>
              </>
            ) : (
              <>
                <span>Approve & Continue</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
