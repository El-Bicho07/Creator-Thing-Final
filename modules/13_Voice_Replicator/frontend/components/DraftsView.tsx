"use client";

import React, { useState, useEffect } from "react";
import { Project, GeneratedDraft, ValidationResult } from "@/lib/types";
import { FileTextIcon, TrashIcon, CopyIcon, CheckCircleIcon, BarChartIcon } from "./Icons";
import { fetchDraftValidation } from "@/lib/api";

interface DraftsViewProps {
  project: Project | null;
  drafts: GeneratedDraft[];
  onDeleteDraft: (draftId: string) => Promise<void>;
}

export function DraftsView({ project, drafts, onDeleteDraft }: DraftsViewProps) {
  const [selectedDraft, setSelectedDraft] = useState<GeneratedDraft | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (selectedDraft) {
      fetchDraftValidation(selectedDraft.id)
        .then((res) => setValidation(res))
        .catch(() => setValidation(null));
    } else {
      setValidation(null);
    }
  }, [selectedDraft]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-[#153037] p-6 rounded-lg border border-[#2A4C54]">
        <div>
          <span className="text-xs font-semibold text-[#8FA8A6] uppercase tracking-wider block mb-1">
            Generated Repository
          </span>
          <h2 className="text-xl font-bold text-[#E9EFEA] flex items-center space-x-2">
            <FileTextIcon className="w-5 h-5 text-[#8FA8A6]" />
            <span>Generated draft history</span>
          </h2>
          <p className="text-xs text-[#8FA8A6] mt-0.5">
            {drafts.length} generated drafts saved for {project?.name || "this project"}.
          </p>
        </div>
      </div>

      {drafts.length === 0 ? (
        <div className="text-center py-16 bg-[#153037] rounded-lg border border-[#2A4C54]">
          <FileTextIcon className="w-10 h-10 text-[#8FA8A6] mx-auto mb-3" />
          <p className="text-[#E9EFEA] font-semibold text-sm">No drafts generated yet.</p>
          <p className="text-[#8FA8A6] text-xs mt-1">Go to the Generate tab to create your first Instagram draft.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="bg-[#153037] p-5 rounded-lg border border-[#2A4C54] hover:border-[#F0B429]/50 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#0E2327] text-[#E9EFEA] border border-[#2A4C54]">
                    {d.post_type}
                  </span>
                  <span className="text-[10px] text-[#8FA8A6]">
                    {new Date(d.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-[#E9EFEA] line-clamp-1 mb-2">
                  Topic: {d.topic}
                </h4>

                <p className="text-xs text-[#E9EFEA] line-clamp-4 leading-relaxed whitespace-pre-line font-mono mb-3 bg-[#0E2327] p-2.5 rounded border border-[#2A4C54]">
                  {d.caption}
                </p>
              </div>

              <div className="pt-3 border-t border-[#2A4C54] flex items-center justify-between">
                <button
                  onClick={() => setSelectedDraft(d)}
                  className="text-xs font-medium text-[#E9EFEA] hover:text-[#F0B429] flex items-center space-x-1"
                >
                  <BarChartIcon className="w-3.5 h-3.5 text-[#8FA8A6]" />
                  <span>View details & report</span>
                </button>

                <button
                  onClick={() => onDeleteDraft(d.id)}
                  title="Delete Draft"
                  className="p-1 rounded text-[#8FA8A6] hover:text-[#FF6B57] hover:bg-[#FF6B57]/10 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Draft Detail Modal */}
      {selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#153037] w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg p-6 border border-[#2A4C54] relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A4C54]">
              <div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#0E2327] text-[#E9EFEA] border border-[#2A4C54]">
                  {selectedDraft.post_type}
                </span>
                <h3 className="text-base font-bold text-[#E9EFEA] mt-1">Topic: {selectedDraft.topic}</h3>
              </div>
              <button onClick={() => setSelectedDraft(null)} className="text-[#8FA8A6] hover:text-[#E9EFEA] text-sm font-semibold">✕</button>
            </div>

            {/* Validation Overview — Semantic Mint (#6FD3A8) & Coral (#FF6B57) */}
            {validation && (
              <div className="p-4 rounded bg-[#0E2327] border border-[#2A4C54] grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-[#8FA8A6] block">Overall score</span>
                  <span className="text-lg font-bold text-[#E9EFEA]">{validation.overall_score}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8FA8A6] block">Consistency status</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block ${
                      validation.overall_score >= 70
                        ? "bg-[#6FD3A8]/15 text-[#6FD3A8] border border-[#6FD3A8]/30"
                        : "bg-[#FF6B57]/15 text-[#FF6B57] border border-[#FF6B57]/30"
                    }`}
                  >
                    {validation.overall_score >= 70 ? "✓ Style consistency passed" : "! Needs attention"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8FA8A6] block">Originality status</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block ${
                      validation.originality_status === "PASS"
                        ? "bg-[#6FD3A8]/15 text-[#6FD3A8] border border-[#6FD3A8]/30"
                        : "bg-[#FF6B57]/15 text-[#FF6B57] border border-[#FF6B57]/30"
                    }`}
                  >
                    {validation.originality_status === "PASS" ? "✓ Originality passed" : "! Originality warning"}
                  </span>
                </div>
              </div>
            )}

            {/* Draft Content */}
            <div className="p-4 rounded bg-[#0E2327] border border-[#2A4C54] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-[#8FA8A6]">Caption</span>
                <button
                  onClick={() => copyToClipboard(selectedDraft.caption)}
                  className="px-2.5 py-1 rounded bg-[#2A4C54] text-[11px] font-medium text-[#E9EFEA] hover:bg-[#2A4C54]/80 flex items-center space-x-1"
                >
                  <CopyIcon className="w-3 h-3" />
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              <div className="text-xs text-[#E9EFEA] leading-relaxed whitespace-pre-line font-mono bg-[#153037] p-3 rounded border border-[#2A4C54]">
                {selectedDraft.caption}
              </div>

              {selectedDraft.hashtags && selectedDraft.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedDraft.hashtags.map((h, i) => (
                    <span key={i} className="text-[10px] text-[#E9EFEA] bg-[#153037] px-2 py-0.5 rounded border border-[#2A4C54]">
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
