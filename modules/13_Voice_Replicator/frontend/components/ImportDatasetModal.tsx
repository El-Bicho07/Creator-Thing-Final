"use client";

import React, { useState } from "react";
import { UploadIcon, SparklesIcon } from "./Icons";

interface ImportDatasetModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onImport: (dataset: any) => Promise<void>;
}

const SAMPLE_TECH_DATASET = {
  posts: [
    {
      id: "tech-001",
      caption: "5 AI Agent Frameworks You Need to Know in 2026 🚀\n\nBuilding autonomous AI systems is moving faster than ever. If you're still writing custom wrapper scripts from scratch, you are losing hours of development time.\n\nHere are the top 5 frameworks reshaping AI engineering:\n\n• LangGraph — State graph orchestration for resilient multi-agent systems\n• AutoGen — Multi-agent conversation and task delegation\n• CrewAI — Role-playing AI agents working in structured crews\n• Semantic Kernel — Enterprise-grade AI integration by Microsoft\n• LlamaIndex — Data-centric agentic RAG & document knowledge graphs\n\nPro tip: Start by defining clear tool schemas before building your agent graph.\n\nWhich framework are you building with this week? Drop a comment below! 👇",
      hashtags: ["#ai", "#python", "#softwareengineering", "#tech", "#aiagents"],
      media_path: "",
      post_type: "educational",
      published_at: "2026-01-10"
    },
    {
      id: "tech-002",
      caption: "Why 90% of LLM Applications Fail in Production (And How to Fix It) 💡\n\nMost developers build a demo in a Jupyter notebook, hit 95% accuracy, and assume it's ready to ship. Then real users hit it with edge cases and costs explode.\n\nHere are the 3 major pitfalls:\n\n1. No Deterministic Guardrails — Relying solely on prompt instructions instead of structured JSON outputs.\n2. Lack of Vector Indexing — Passing massive raw contexts into context windows instead of semantic hybrid search.\n3. Unmonitored Token Spikes — Failing to track usage metrics per user query.\n\nStop shipping fragile demos. Build resilient systems.\n\nSave this post for your next architecture review! 📌",
      hashtags: ["#ai", "#developers", "#coding", "#techlead", "#architecture"],
      media_path: "",
      post_type: "educational",
      published_at: "2026-01-14"
    },
    {
      id: "tech-003",
      caption: "How I built a full-stack AI app in 48 hours ⏱️🔥\n\nTwo years ago, building a vector search web app required a team of 4 engineers and weeks of setup.\n\nLast weekend, I launched an AI content analyzer from scratch using FastAPI, Next.js, and pgvector.\n\nThe lesson? Tooling has caught up with developer imagination. Stop overcomplicating your stack.\n\n• Backend: Python + FastAPI\n• Database: PostgreSQL + pgvector\n• Frontend: Next.js App Router + Tailwind\n• Embeddings: Sentence-Transformers\n\nWhat are you launching this month? Let me know in the comments! 👇",
      hashtags: ["#buildinpublic", "#indiehacker", "#fullstack", "#nextjs", "#fastapi"],
      media_path: "",
      post_type: "storytelling",
      published_at: "2026-01-18"
    },
    {
      id: "tech-004",
      caption: "The Ultimate System Prompt Template for Clean JSON Outputs 📄🤖\n\nGetting an LLM to return strictly valid JSON without markdown wrapping or conversational filler can be frustrating.\n\nUse this 3-part prompt structure:\n\n1. Explicit Role Declaration — Declare the model as a schema-enforcing parser.\n2. Mandatory JSON Schema — Provide exact target key-value pairs.\n3. Zero-Filler Constraint — Instruct 'Return ONLY valid JSON. No conversational text.'\n\nSave this framework for your next backend API! 📌",
      hashtags: ["#promptengineering", "#ai", "#backend", "#python", "#developer"],
      media_path: "",
      post_type: "educational",
      published_at: "2026-01-22"
    },
    {
      id: "tech-005",
      caption: "🚀 Master AI Engineering: Launching our new 2026 Masterclass!\n\nWant to level up from prompt engineer to full-stack AI system architect?\n\nOur flagship course covers:\n• Multi-agent orchestration\n• pgvector & hybrid search\n• Custom tool use & guardrails\n• Production evaluation & observability\n\nLimited spots available for the Q1 cohort.\n\nClick the link in bio to enroll today! 🔗",
      hashtags: ["#aifeatures", "#learncode", "#course", "#techcareers", "#aiengineering"],
      media_path: "",
      post_type: "promotional",
      published_at: "2026-01-26"
    }
  ]
};

export function ImportDatasetModal({ isOpen, projectId, onClose, onImport }: ImportDatasetModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImportSample = async () => {
    setLoading(true);
    setError(null);
    try {
      await onImport(SAMPLE_TECH_DATASET);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to import sample dataset");
    } finally {
      setLoading(false);
    }
  };

  const handleImportCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.posts || !Array.isArray(parsed.posts)) {
        throw new Error("Invalid format: JSON must contain a top-level 'posts' array");
      }
      await onImport(parsed);
      setJsonText("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Invalid JSON text format");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#153037] rounded-lg w-full max-w-lg p-6 border border-[#2A4C54] relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#2A4C54]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-[#0E2327] text-[#F0B429] border border-[#2A4C54]">
              <UploadIcon className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#E9EFEA]">Import historical dataset</h3>
          </div>
          <button onClick={onClose} className="text-[#8FA8A6] hover:text-[#E9EFEA] text-sm font-semibold">✕</button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded bg-[#FF6B57]/15 border border-[#FF6B57]/30 text-[#FF6B57] text-xs font-medium">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-5">
          {/* Quick Pre-loaded Sample Option */}
          <div className="p-4 rounded bg-[#0E2327] border border-[#2A4C54]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="w-4 h-4 text-[#8FA8A6]" />
                <span className="text-xs font-bold text-[#E9EFEA] uppercase tracking-wide">Quick preset</span>
              </div>
              <span className="text-[10px] font-semibold bg-[#2A4C54] text-[#E9EFEA] px-2 py-0.5 rounded">5 Posts</span>
            </div>
            <p className="text-xs text-[#8FA8A6] mt-1.5 leading-relaxed">
              Load 5 pre-configured historical AI Tech Creator posts with captions, bullet lists, emojis, and hashtags.
            </p>
            <button
              onClick={handleImportSample}
              disabled={loading}
              className="mt-3 w-full py-2 rounded-md bg-[#2A4C54] hover:bg-[#2A4C54]/80 text-[#E9EFEA] text-xs font-semibold border border-[#2A4C54] transition-colors flex items-center justify-center space-x-2"
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>{loading ? "Importing..." : "Load Sample Tech Creator Dataset"}</span>
            </button>
          </div>

          <div className="flex items-center my-2">
            <div className="flex-grow border-t border-[#2A4C54]"></div>
            <span className="px-3 text-[11px] font-semibold text-[#8FA8A6] uppercase">Or paste custom JSON</span>
            <div className="flex-grow border-t border-[#2A4C54]"></div>
          </div>

          <form onSubmit={handleImportCustom} className="space-y-3">
            <div>
              <textarea
                rows={5}
                placeholder='{ "posts": [ { "caption": "...", "hashtags": ["#ai"] } ] }'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full bg-[#0E2327] text-[#E9EFEA] font-mono text-xs border border-[#2A4C54] rounded-md p-3 focus:outline-none focus:border-[#F0B429]"
              />
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-xs font-medium text-[#8FA8A6] hover:text-[#E9EFEA]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !jsonText.trim()}
                className="px-5 py-2 rounded-md text-xs font-bold text-[#1A1405] bg-[#F0B429] hover:bg-[#F0B429]/90 disabled:opacity-50 transition-colors"
              >
                {loading ? "Importing..." : "Import Custom JSON"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
