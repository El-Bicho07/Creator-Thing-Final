"use client";

import { Search, Filter, BookOpen, Brain, Mic, FileText, Plus, Settings } from "lucide-react";
import { useState } from "react";

const contentAssets = [
  { id: "1", title: "Notion for Beginners", type: "YouTube", status: "Published", date: "Jan 15, 2024", views: "45K" },
  { id: "2", title: "Advanced Database Relations", type: "Reel", status: "Published", date: "Jan 10, 2024", views: "12K" },
  { id: "3", title: "My Productivity System", type: "Article", status: "Draft", date: "Jan 12, 2024", views: "—" },
  { id: "4", title: "Keyboard Shortcuts Cheatsheet", type: "Carousel", status: "Published", date: "Jan 5, 2024", views: "8K" },
  { id: "5", title: "Notion vs Obsidian", type: "YouTube", status: "In Progress", date: "Jan 18, 2024", views: "—" },
];

const tabs = [
  { id: "all", label: "All Content", icon: FileText },
  { id: "memory", label: "Second Brain", icon: Brain },
  { id: "voice", label: "Voice Profile", icon: Mic },
  { id: "recycle", label: "Recycle", icon: BookOpen },
  { id: "import", label: "Import", icon: Plus },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Library</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Your content assets, memory, and voice profile</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Voice Profile</span>
          </button>
          <button className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Content</span>
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search your content... (semantic search)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {activeTab === "all" && (
        <div className="space-y-3">
          {contentAssets.map((asset) => (
            <div
              key={asset.id}
              className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                  <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-medium">{asset.title}</h3>
                  <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{asset.type}</span>
                    <span className={`px-2 py-0.5 rounded ${
                      asset.status === "Published" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      asset.status === "Draft" ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {asset.status}
                    </span>
                    <span>{asset.date}</span>
                    <span className="font-medium text-primary-600 dark:text-primary-400">{asset.views}</span>
                  </div>
                </div>
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "memory" && (
        <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Brain className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            <div>
              <h3 className="font-semibold">Second Brain</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ask questions about your past content</p>
            </div>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder='"Have I talked about time-blocking before?"'
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Semantic search across all your content, transcripts, and notes
            </p>
          </div>
        </div>
      )}

      {activeTab === "voice" && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Primary Voice Profile</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: Jan 15, 2024</p>
              </div>
              <button className="px-3 py-1 rounded text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                Edit
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">87%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Voice Match Score</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">12 words</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Sentence Length</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">High</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Vocabulary Richness</div>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium mb-2">Forbidden Words (Auto-filtered)</h4>
            <div className="flex flex-wrap gap-2">
              {["delve", "tapestry", "game-changer", "in today's world", "unleash", "elevate"].map((word) => (
                <span key={word} className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "recycle" && (
        <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-4">Evergreen Recycling Recommendations</h3>
          <div className="space-y-3">
            {[
              { title: "Notion Keyboard Shortcuts", reason: "High search volume, evergreen topic", lastPosted: "3 months ago", score: 92 },
              { title: "Database Relations Explained", reason: "Consistent performer, update with new features", lastPosted: "5 months ago", score: 88 },
            ].map((item, index) => (
              <div key={index} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.reason}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>Last posted: {item.lastPosted}</span>
                      <span className="font-medium text-primary-600 dark:text-primary-400">Recycle Score: {item.score}/100</span>
                    </div>
                  </div>
                  <button className="px-3 py-1 rounded text-sm font-medium bg-primary-600 text-white hover:bg-primary-700">
                    Repurpose
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "import" && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">Import Content</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: "YouTube Channel", description: "Import transcripts from your channel", icon: "🎬" },
                { title: "Instagram Posts", description: "Connect and import your posts", icon: "📷" },
                { title: "Paste Text", description: "Manually add content from anywhere", icon: "📝" },
                { title: "CSV Upload", description: "Bulk import from spreadsheet", icon: "📊" },
              ].map((item) => (
                <button key={item.title} className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-700 text-left transition-colors">
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}