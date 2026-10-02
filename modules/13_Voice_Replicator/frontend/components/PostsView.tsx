"use client";

import React, { useState } from "react";
import { Post } from "@/lib/types";
import { SearchIcon, LayersIcon, UploadIcon, BarChartIcon } from "./Icons";

interface PostsViewProps {
  posts: Post[];
  onOpenImportModal: () => void;
}

export function PostsView({ posts, onOpenImportModal }: PostsViewProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const filteredPosts = posts.filter((post) => {
    const matchesType = filterType === "all" || post.post_type === filterType;
    const matchesSearch =
      !searchQuery ||
      post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.hashtags.some((h) => h.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#153037] p-6 rounded-lg border border-[#2A4C54]">
        <div>
          <span className="text-xs font-semibold text-[#8FA8A6] uppercase tracking-wider block mb-1">
            Historical Dataset
          </span>
          <h2 className="text-xl font-bold text-[#E9EFEA] flex items-center space-x-2">
            <LayersIcon className="w-5 h-5 text-[#8FA8A6]" />
            <span>Historical Instagram posts</span>
          </h2>
          <p className="text-xs text-[#8FA8A6] mt-0.5">
            {posts.length} historical posts imported for style feature extraction & semantic retrieval.
          </p>
        </div>

        <button
          onClick={onOpenImportModal}
          className="px-4 py-2 rounded-md bg-[#2A4C54]/50 hover:bg-[#2A4C54] text-[#E9EFEA] text-xs font-medium border border-[#2A4C54] transition-colors flex items-center space-x-2"
        >
          <UploadIcon className="w-4 h-4 text-[#8FA8A6]" />
          <span>Import more posts</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {["all", "educational", "promotional", "storytelling", "carousel"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                filterType === type
                  ? "bg-[#2A4C54] text-[#E9EFEA]"
                  : "bg-[#153037] text-[#8FA8A6] hover:text-[#E9EFEA] border border-[#2A4C54]"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <SearchIcon className="w-4 h-4 text-[#8FA8A6] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search captions & hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0E2327] text-[#E9EFEA] text-xs rounded-md pl-9 pr-4 py-2 border border-[#2A4C54] focus:outline-none focus:border-[#F0B429]"
          />
        </div>
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 bg-[#153037] rounded-lg border border-[#2A4C54]">
          <LayersIcon className="w-10 h-10 text-[#8FA8A6] mx-auto mb-3" />
          <p className="text-[#E9EFEA] font-semibold text-sm">No historical posts match your search/filter.</p>
          <p className="text-[#8FA8A6] text-xs mt-1">Try resetting your search query or importing posts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const tf = post.text_features;

            return (
              <div
                key={post.id}
                className="bg-[#153037] p-5 rounded-lg border border-[#2A4C54] hover:border-[#F0B429]/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded bg-[#0E2327] text-[#E9EFEA] border border-[#2A4C54]">
                      {post.post_type}
                    </span>
                    <span className="text-[10px] text-[#8FA8A6]">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString() : "Historical"}
                    </span>
                  </div>

                  <p className="text-xs text-[#E9EFEA] line-clamp-4 leading-relaxed whitespace-pre-line font-mono bg-[#0E2327] p-2.5 rounded border border-[#2A4C54] mb-3">
                    {post.caption}
                  </p>

                  {/* Hashtags */}
                  {post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {post.hashtags.slice(0, 4).map((h, i) => (
                        <span key={i} className="text-[10px] text-[#8FA8A6] bg-[#0E2327] px-2 py-0.5 rounded border border-[#2A4C54]">
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Feature Summary Footer */}
                <div className="pt-3 border-t border-[#2A4C54] flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-[11px] text-[#8FA8A6]">
                    <span>{tf?.word_count || 0} words</span>
                    <span>•</span>
                    <span>{tf?.emoji_count || 0} emojis</span>
                  </div>

                  <button
                    onClick={() => setSelectedPost(post)}
                    className="px-3 py-1.5 rounded bg-[#2A4C54] hover:bg-[#2A4C54]/80 text-xs text-[#E9EFEA] font-medium flex items-center space-x-1 transition-colors"
                  >
                    <BarChartIcon className="w-3.5 h-3.5 text-[#8FA8A6]" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Feature Inspector Drawer / Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 p-4">
          <div className="bg-[#153037] w-full max-w-lg h-full max-h-[90vh] overflow-y-auto rounded-lg p-6 border border-[#2A4C54] relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A4C54] mb-6">
              <div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#0E2327] text-[#E9EFEA] border border-[#2A4C54]">
                  {selectedPost.post_type}
                </span>
                <h3 className="text-base font-bold text-[#E9EFEA] mt-1">Feature Analysis Inspection</h3>
              </div>
              <button onClick={() => setSelectedPost(null)} className="text-[#8FA8A6] hover:text-[#E9EFEA] text-sm font-semibold">✕</button>
            </div>

            <div className="space-y-6 text-xs text-[#E9EFEA]">
              <div>
                <h4 className="font-bold text-[#E9EFEA] mb-1">Raw Caption</h4>
                <div className="p-3.5 rounded bg-[#0E2327] border border-[#2A4C54] whitespace-pre-line font-mono text-[11px] leading-relaxed">
                  {selectedPost.caption}
                </div>
              </div>

              {selectedPost.text_features && (
                <div>
                  <h4 className="font-bold text-[#E9EFEA] mb-2">Text & structural features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded bg-[#0E2327] border border-[#2A4C54]">
                      <span className="text-[10px] text-[#8FA8A6]">Word count</span>
                      <p className="font-bold text-[#E9EFEA] text-sm">{selectedPost.text_features.word_count}</p>
                    </div>
                    <div className="p-2.5 rounded bg-[#0E2327] border border-[#2A4C54]">
                      <span className="text-[10px] text-[#8FA8A6]">Avg sentence length</span>
                      <p className="font-bold text-[#E9EFEA] text-sm">{selectedPost.text_features.avg_sentence_length} words</p>
                    </div>
                    <div className="p-2.5 rounded bg-[#0E2327] border border-[#2A4C54]">
                      <span className="text-[10px] text-[#8FA8A6]">Formality score</span>
                      <p className="font-bold text-[#E9EFEA] text-sm">{selectedPost.text_features.formality_score}</p>
                    </div>
                    <div className="p-2.5 rounded bg-[#0E2327] border border-[#2A4C54]">
                      <span className="text-[10px] text-[#8FA8A6]">Conversational score</span>
                      <p className="font-bold text-[#E9EFEA] text-sm">{selectedPost.text_features.conversational_score}</p>
                    </div>
                  </div>

                  <div className="mt-3 p-3 rounded bg-[#0E2327] border border-[#2A4C54]">
                    <span className="text-[10px] text-[#8FA8A6] font-semibold uppercase block mb-1">Detected component flow</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedPost.text_features.structure_components.map((comp, idx) => (
                        <span key={idx} className="bg-[#2A4C54] text-[#E9EFEA] font-semibold px-2 py-0.5 rounded text-[10px]">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedPost.visual_features && (
                <div>
                  <h4 className="font-bold text-[#E9EFEA] mb-2">Visual & OCR features</h4>
                  <div className="p-3 rounded bg-[#0E2327] border border-[#2A4C54] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#8FA8A6]">Estimated text area ratio</span>
                      <span className="font-bold text-[#E9EFEA]">{selectedPost.visual_features.text_area_ratio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8FA8A6]">Brightness / Contrast</span>
                      <span className="font-bold text-[#E9EFEA]">{selectedPost.visual_features.brightness} / {selectedPost.visual_features.contrast}</span>
                    </div>
                    <div>
                      <span className="text-[#8FA8A6] block mb-1">Dominant hex colors</span>
                      <div className="flex space-x-2">
                        {selectedPost.visual_features.dominant_colors.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded font-mono text-[10px] border border-[#2A4C54]" style={{ backgroundColor: c }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedPost.visual_features.ocr_text && (
                      <div className="mt-2 pt-2 border-t border-[#2A4C54]">
                        <span className="text-[#8FA8A6] block mb-1">Extracted OCR text</span>
                        <p className="text-[11px] font-mono text-[#E9EFEA]">{selectedPost.visual_features.ocr_text}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
