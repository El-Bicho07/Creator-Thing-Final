"use client";

import React, { useState } from "react";
import { Project, StyleProfile, GeneratedDraft, ValidationResult } from "@/lib/types";
import { WandIcon, SparklesIcon, CheckCircleIcon, CopyIcon } from "./Icons";
import { fetchDraftValidation } from "@/lib/api";

interface GeneratorViewProps {
  project: Project | null;
  styleProfile: StyleProfile | null;
  onGenerate: (data: {
    topic: string;
    post_type: string;
    cta_requirement?: string;
    desired_length: string;
    custom_instructions?: string;
  }) => Promise<GeneratedDraft>;
  onSelectTab: (tab: string) => void;
}

export function GeneratorView({
  project,
  styleProfile,
  onGenerate,
  onSelectTab,
}: GeneratorViewProps) {
  const [topic, setTopic] = useState("");
  const [postType, setPostType] = useState("educational");
  const [ctaReq, setCtaReq] = useState("");
  const [desiredLength, setDesiredLength] = useState("medium");
  const [customInstructions, setCustomInstructions] = useState("");

  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!styleProfile) {
    return (
      <div className="text-center py-20 bg-[#153037] rounded-lg p-8 max-w-lg mx-auto border border-[#2A4C54]">
        <SparklesIcon className="w-10 h-10 text-[#8FA8A6] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#E9EFEA] mb-2">Style profile required</h2>
        <p className="text-xs text-[#8FA8A6] mb-6">
          Please analyze the historical dataset first to construct the creator's style profile before generating content.
        </p>
        <button
          onClick={() => onSelectTab("style-profile")}
          className="px-5 py-2.5 rounded-md bg-[#F0B429] hover:bg-[#F0B429]/90 text-[#1A1405] font-bold text-xs transition-colors"
        >
          Go to Style Profile
        </button>
      </div>
    );
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setGeneratedDraft(null);
    setValidation(null);
    setProgressStep(1);

    try {
      setTimeout(() => setProgressStep(2), 300);
      setTimeout(() => setProgressStep(3), 600);

      const draft = await onGenerate({
        topic: topic.trim(),
        post_type: postType,
        cta_requirement: ctaReq.trim() || undefined,
        desired_length: desiredLength,
        custom_instructions: customInstructions.trim() || undefined,
      });

      setProgressStep(4);
      setGeneratedDraft(draft);

      // Fetch validation report
      try {
        const valReport = await fetchDraftValidation(draft.id);
        setValidation(valReport);
      } catch (valErr) {
        // Continue displaying draft even if validation call fails
      }

      setProgressStep(5);
    } catch (err: any) {
      setError(err.message || "Failed to generate post draft");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-[#153037] p-6 rounded-lg border border-[#2A4C54] flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-[#8FA8A6] uppercase tracking-wider block mb-1">
            Generation Engine
          </span>
          <h2 className="text-2xl font-bold text-[#E9EFEA] tracking-tight">Generate New Instagram Post</h2>
          <p className="text-xs text-[#8FA8A6] mt-1">
            Combines Creator Style Profile + Vector Search of Topically Relevant Examples + External LLM.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[#FF6B57]/15 border border-[#FF6B57]/30 text-[#FF6B57] text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Inputs */}
        <div className="lg:col-span-5 bg-[#153037] p-6 rounded-lg border border-[#2A4C54] space-y-5">
          <h3 className="text-sm font-bold text-[#E9EFEA] pb-3 border-b border-[#2A4C54]">Content requirements</h3>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8FA8A6] mb-1.5">
                Topic / Content idea *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. 5 essential tools for modern AI developers to speed up workflow"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-[#0E2327] text-[#E9EFEA] border border-[#2A4C54] rounded-md p-3 text-xs focus:outline-none focus:border-[#F0B429]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#8FA8A6] mb-1.5">Post type</label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value)}
                  className="w-full bg-[#0E2327] text-[#E9EFEA] text-xs rounded-md p-2.5 border border-[#2A4C54] focus:outline-none focus:border-[#F0B429]"
                >
                  <option value="educational">Educational</option>
                  <option value="promotional">Promotional</option>
                  <option value="storytelling">Storytelling</option>
                  <option value="carousel">Carousel Slide Deck</option>
                  <option value="question">Community Question</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8FA8A6] mb-1.5">Target length</label>
                <select
                  value={desiredLength}
                  onChange={(e) => setDesiredLength(e.target.value)}
                  className="w-full bg-[#0E2327] text-[#E9EFEA] text-xs rounded-md p-2.5 border border-[#2A4C54] focus:outline-none focus:border-[#F0B429]"
                >
                  <option value="short">Short (~70 words)</option>
                  <option value="medium">Medium (~120 words)</option>
                  <option value="long">Long (~180 words)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8FA8A6] mb-1.5">CTA requirement (optional)</label>
              <input
                type="text"
                placeholder="e.g. Ask followers to save this post for later"
                value={ctaReq}
                onChange={(e) => setCtaReq(e.target.value)}
                className="w-full bg-[#0E2327] text-[#E9EFEA] border border-[#2A4C54] rounded-md p-2.5 text-xs focus:outline-none focus:border-[#F0B429]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8FA8A6] mb-1.5">Custom instructions (optional)</label>
              <input
                type="text"
                placeholder="e.g. Emphasize developer productivity tips"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="w-full bg-[#0E2327] text-[#E9EFEA] border border-[#2A4C54] rounded-md p-2.5 text-xs focus:outline-none focus:border-[#F0B429]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="w-full py-3 rounded-md bg-[#F0B429] hover:bg-[#F0B429]/90 text-[#1A1405] font-bold text-xs transition-colors flex items-center justify-center space-x-2"
            >
              <WandIcon className="w-4 h-4" />
              <span>{loading ? "Generating Draft..." : "Generate Instagram Draft"}</span>
            </button>
          </form>
        </div>

        {/* Output & Progress Section */}
        <div className="lg:col-span-7 bg-[#153037] p-6 rounded-lg border border-[#2A4C54] space-y-6">
          <h3 className="text-sm font-bold text-[#E9EFEA] pb-3 border-b border-[#2A4C54] flex items-center justify-between">
            <span>Generation result</span>
            {generatedDraft && (
              <button
                onClick={() => copyToClipboard(generatedDraft.caption)}
                className="px-3 py-1 rounded bg-[#2A4C54] hover:bg-[#2A4C54]/80 text-xs font-semibold text-[#E9EFEA] flex items-center space-x-1.5 transition-colors"
              >
                <CopyIcon className="w-3.5 h-3.5" />
                <span>{copied ? "Copied!" : "Copy caption"}</span>
              </button>
            )}
          </h3>

          {/* Loading Progress Steps */}
          {loading && (
            <div className="py-8 space-y-4">
              <div className="flex items-center space-x-3 text-xs text-[#F0B429] font-bold">
                <WandIcon className="w-4 h-4" />
                <span>Running Style Replication Pipeline...</span>
              </div>
              <div className="space-y-2 text-xs text-[#8FA8A6]">
                <div className={`flex items-center space-x-2 ${progressStep >= 1 ? "text-[#E9EFEA] font-medium" : "opacity-40"}`}>
                  <CheckCircleIcon className="w-4 h-4 text-[#F0B429]" />
                  <span>1. Vectorizing topic & querying pgvector for relevant posts...</span>
                </div>
                <div className={`flex items-center space-x-2 ${progressStep >= 2 ? "text-[#E9EFEA] font-medium" : "opacity-40"}`}>
                  <CheckCircleIcon className="w-4 h-4 text-[#F0B429]" />
                  <span>2. Constructing prompt with creator Style Profile & retrieved examples...</span>
                </div>
                <div className={`flex items-center space-x-2 ${progressStep >= 3 ? "text-[#E9EFEA] font-medium" : "opacity-40"}`}>
                  <CheckCircleIcon className="w-4 h-4 text-[#F0B429]" />
                  <span>3. Invoking External Text-Generation LLM...</span>
                </div>
                <div className={`flex items-center space-x-2 ${progressStep >= 4 ? "text-[#E9EFEA] font-medium" : "opacity-40"}`}>
                  <CheckCircleIcon className="w-4 h-4 text-[#F0B429]" />
                  <span>4. Evaluating draft against Style Validator & Originality Check...</span>
                </div>
              </div>
            </div>
          )}

          {/* Generated Result View */}
          {!loading && generatedDraft ? (
            <div className="space-y-6">
              {/* Validation Summary Card — Semantic Colors Mint (#6FD3A8) & Coral (#FF6B57) */}
              {validation && (
                <div className="p-4 rounded bg-[#0E2327] border border-[#2A4C54] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#8FA8A6] block">Style consistency</span>
                    <span
                      className={`inline-block text-xs font-bold px-2.5 py-1 rounded mt-1 ${
                        validation.overall_score >= 70
                          ? "bg-[#6FD3A8]/15 text-[#6FD3A8] border border-[#6FD3A8]/30"
                          : "bg-[#FF6B57]/15 text-[#FF6B57] border border-[#FF6B57]/30"
                      }`}
                    >
                      {validation.overall_score >= 70 ? "✓ Style consistency passed" : "! Needs attention"} ({validation.overall_score}%)
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-[#8FA8A6] block">Originality check</span>
                    <span
                      className={`inline-block text-xs font-bold px-2.5 py-1 rounded mt-1 ${
                        validation.originality_status === "PASS"
                          ? "bg-[#6FD3A8]/15 text-[#6FD3A8] border border-[#6FD3A8]/30"
                          : "bg-[#FF6B57]/15 text-[#FF6B57] border border-[#FF6B57]/30"
                      }`}
                    >
                      {validation.originality_status === "PASS" ? "✓ Originality passed" : "! Originality warning"} ({validation.max_ngram_overlap}% overlap)
                    </span>
                  </div>
                </div>
              )}

              {/* Draft Content Card — Editorial Workspace Document */}
              <div className="p-5 rounded bg-[#0E2327] border border-[#2A4C54] space-y-4">
                {generatedDraft.hook && (
                  <div>
                    <span className="text-xs font-semibold text-[#8FA8A6] block mb-1">Hook</span>
                    <p className="text-xs text-[#E9EFEA] bg-[#153037] p-2.5 rounded border border-[#2A4C54] font-medium">
                      "<span className="highlighter">{generatedDraft.hook}</span>"
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-xs font-semibold text-[#8FA8A6] block mb-1">Full caption</span>
                  <div className="text-xs text-[#E9EFEA] leading-relaxed font-mono whitespace-pre-line bg-[#153037] p-3.5 rounded border border-[#2A4C54]">
                    {generatedDraft.caption}
                  </div>
                </div>

                {generatedDraft.cta && (
                  <div>
                    <span className="text-xs font-semibold text-[#8FA8A6] block mb-1">Call to action</span>
                    <p className="text-xs text-[#E9EFEA] bg-[#153037] p-2.5 rounded border border-[#2A4C54] font-medium">
                      "<span className="highlighter">{generatedDraft.cta}</span>"
                    </p>
                  </div>
                )}

                {generatedDraft.hashtags && generatedDraft.hashtags.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-[#8FA8A6] block mb-1">Hashtags</span>
                    <div className="flex flex-wrap gap-1">
                      {generatedDraft.hashtags.map((h, i) => (
                        <span key={i} className="text-xs text-[#E9EFEA] bg-[#153037] px-2 py-0.5 rounded border border-[#2A4C54]">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Slides if Carousel */}
                {generatedDraft.slides && generatedDraft.slides.length > 0 && (
                  <div className="pt-3 border-t border-[#2A4C54]">
                    <span className="text-xs font-semibold text-[#8FA8A6] block mb-2">
                      Carousel slides deck ({generatedDraft.slides.length} slides)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {generatedDraft.slides.map((s, i) => (
                        <div key={i} className="p-2.5 rounded bg-[#153037] border border-[#2A4C54]">
                          <span className="text-[10px] font-bold text-[#8FA8A6]">Slide {i + 1}</span>
                          <p className="text-xs font-bold text-[#E9EFEA] mt-0.5">{s.title}</p>
                          <p className="text-[11px] text-[#8FA8A6] mt-1 line-clamp-3">{s.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : !loading ? (
            <div className="text-center py-16 text-[#8FA8A6] text-xs">
              Fill out the content requirements form on the left and click "Generate Instagram Draft".
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
