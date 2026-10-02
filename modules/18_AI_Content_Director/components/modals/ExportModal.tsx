"use client";

import React, { useState } from "react";
import {
  Download,
  Copy,
  Check,
  Printer,
  FileSpreadsheet,
  FileText,
  X,
  Sparkles
} from "lucide-react";
import { Project } from "@/lib/types";
import {
  exportToMarkdown,
  exportShotListToCSV,
  downloadFile,
  printProjectReport
} from "@/lib/export";
import { copyToClipboard } from "@/lib/utils";

interface ExportModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ project, isOpen, onClose }: ExportModalProps) {
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen) return null;

  const handleCopyMarkdown = async () => {
    const md = exportToMarkdown(project);
    const ok = await copyToClipboard(md);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleDownloadMarkdown = () => {
    const md = exportToMarkdown(project);
    const filename = `${project.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_production_brief.md`;
    downloadFile(md, filename, "text/markdown");
  };

  const handleDownloadCSV = () => {
    const csv = exportShotListToCSV(project);
    const filename = `${project.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_shot_list.csv`;
    downloadFile(csv, filename, "text/csv");
  };

  const handlePrintPDF = () => {
    printProjectReport(project);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Export Production Package</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground">
          Download your complete multi-stage production assets in universal formats for your
          filming crew, teleprompter, and social scheduler.
        </p>

        {/* Export Options Grid */}
        <div className="space-y-3">
          {/* 1. Copy All as Markdown */}
          <button
            onClick={handleCopyMarkdown}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/60 hover:border-primary/40 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Copy className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">Copy All to Clipboard</div>
                <div className="text-xs text-muted-foreground">Full formatted production markdown</div>
              </div>
            </div>
            {copiedAll ? (
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                <Check className="h-4 w-4" /> Copied!
              </span>
            ) : (
              <span className="text-xs font-semibold text-primary">Copy</span>
            )}
          </button>

          {/* 2. Download Markdown File */}
          <button
            onClick={handleDownloadMarkdown}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/60 hover:border-primary/40 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">Download as Markdown (.md)</div>
                <div className="text-xs text-muted-foreground">Compatible with Notion, Obsidian, GitHub</div>
              </div>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* 3. Download CSV Shot List */}
          <button
            onClick={handleDownloadCSV}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/60 hover:border-primary/40 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">Download Shot List as CSV (.csv)</div>
                <div className="text-xs text-muted-foreground">Import into Excel, Google Sheets, Airtable</div>
              </div>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* 4. Print / PDF */}
          <button
            onClick={handlePrintPDF}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/60 hover:border-primary/40 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">Print / Save as PDF</div>
                <div className="text-xs text-muted-foreground">Printable director's briefing document</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-primary">Open Print</span>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
