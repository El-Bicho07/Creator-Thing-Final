"use client";

import React, { useState, useEffect } from "react";
import { Edit3, X, Check, AlertCircle, Save } from "lucide-react";

interface EditStageModalProps {
  stageNumber: number;
  stageTitle: string;
  data: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

export function EditStageModal({
  stageNumber,
  stageTitle,
  data,
  isOpen,
  onClose,
  onSave,
}: EditStageModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setJsonText(JSON.stringify(data, null, 2));
      setParseError(null);
    }
  }, [data, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setParseError(null);
      onSave(parsed);
      onClose();
    } catch (err: any) {
      setParseError(err.message || "Invalid JSON syntax. Please check formatting.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl z-10 flex flex-col max-h-[90dvh]">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" />
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Edit Stage {stageNumber}: {stageTitle}
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

        <p className="text-xs text-muted-foreground mt-2">
          Directly modify facts, hooks, beats, dialogue lines, or shot details. Changes take effect
          instantly in your production plan.
        </p>

        {/* JSON Editor Box */}
        <div className="flex-1 my-3 overflow-hidden flex flex-col">
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              if (parseError) setParseError(null);
            }}
            rows={14}
            className="w-full flex-1 rounded-xl border border-input bg-zinc-950 p-4 font-mono text-xs text-emerald-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
            spellCheck={false}
          />
          {parseError && (
            <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary-hover shadow-sm"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Stage Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
