"use client";

import React, { useState } from "react";
import { PlusIcon } from "./Icons";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, handle?: string, description?: string) => Promise<void>;
}

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate(name.trim(), handle.trim() || undefined, description.trim() || undefined);
      setName("");
      setHandle("");
      setDescription("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#153037] rounded-lg w-full max-w-md p-6 border border-[#2A4C54] relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#2A4C54]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-[#0E2327] text-[#F0B429] border border-[#2A4C54]">
              <PlusIcon className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-[#E9EFEA]">Create new project</h3>
          </div>
          <button onClick={onClose} className="text-[#8FA8A6] hover:text-[#E9EFEA] text-sm font-semibold">✕</button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded bg-[#FF6B57]/15 border border-[#FF6B57]/30 text-[#FF6B57] text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8FA8A6] mb-1">Project name *</label>
            <input
              type="text"
              required
              placeholder="e.g. AI Tech Creator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0E2327] text-[#E9EFEA] border border-[#2A4C54] rounded-md px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#F0B429]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8FA8A6] mb-1">Creator handle (optional)</label>
            <input
              type="text"
              placeholder="e.g. @tech_innovator"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full bg-[#0E2327] text-[#E9EFEA] border border-[#2A4C54] rounded-md px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#F0B429]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8FA8A6] mb-1">Description (optional)</label>
            <textarea
              rows={3}
              placeholder="Brief description of the content voice and niche..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0E2327] text-[#E9EFEA] border border-[#2A4C54] rounded-md px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#F0B429]"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#2A4C54]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium text-[#8FA8A6] hover:text-[#E9EFEA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 rounded-md text-xs font-bold text-[#1A1405] bg-[#F0B429] hover:bg-[#F0B429]/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
