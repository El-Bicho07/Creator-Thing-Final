"use client";

import React, { useState, useEffect } from "react";
import { Project, Post, StyleProfile, GeneratedDraft } from "@/lib/types";
import {
  fetchProjects,
  createProject,
  deleteProject,
  fetchProjectPosts,
  importPosts,
  analyzeProjectStyle,
  fetchStyleProfile,
  generateDraft,
  fetchProjectDrafts,
  deleteDraft,
} from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { ImportDatasetModal } from "@/components/ImportDatasetModal";
import { DashboardView } from "@/components/DashboardView";
import { PostsView } from "@/components/PostsView";
import { StyleProfileView } from "@/components/StyleProfileView";
import { GeneratorView } from "@/components/GeneratorView";
import { DraftsView } from "@/components/DraftsView";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const [posts, setPosts] = useState<Post[]>([]);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [drafts, setDrafts] = useState<GeneratedDraft[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial Load Projects
  useEffect(() => {
    loadProjects();
  }, []);

  // 2. Load Project Data whenever Active Project Changes
  useEffect(() => {
    if (activeProject) {
      loadProjectData(activeProject.id);
    } else {
      setPosts([]);
      setStyleProfile(null);
      setDrafts([]);
    }
  }, [activeProject]);

  const loadProjects = async () => {
    try {
      const data = await fetchProjects();
      setProjects(data);
      if (data.length > 0 && !activeProject) {
        setActiveProject(data[0]);
      }
    } catch (err: any) {
      console.error("Failed to load projects:", err);
    }
  };

  const loadProjectData = async (projectId: string) => {
    try {
      const postsData = await fetchProjectPosts(projectId);
      setPosts(postsData);

      try {
        const spData = await fetchStyleProfile(projectId);
        setStyleProfile(spData);
      } catch (e) {
        setStyleProfile(null);
      }

      const draftsData = await fetchProjectDrafts(projectId);
      setDrafts(draftsData);
    } catch (err: any) {
      console.error("Error loading project data:", err);
    }
  };

  const handleCreateProject = async (name: string, handle?: string, description?: string) => {
    const newProj = await createProject({ name, creator_handle: handle, description });
    await loadProjects();
    setActiveProject(newProj);
  };

  const handleImportDataset = async (dataset: any) => {
    if (!activeProject) return;
    await importPosts(activeProject.id, dataset);
    await loadProjects();
    await loadProjectData(activeProject.id);
  };

  const handleAnalyzeStyle = async () => {
    if (!activeProject) return;
    setLoadingAnalysis(true);
    setError(null);
    try {
      const sp = await analyzeProjectStyle(activeProject.id);
      setStyleProfile(sp);
      await loadProjects();
    } catch (err: any) {
      setError(err.message || "Failed to analyze project style");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleGenerateDraft = async (reqData: any) => {
    if (!activeProject) throw new Error("No active project");
    const newDraft = await generateDraft(activeProject.id, reqData);
    await loadProjectData(activeProject.id);
    return newDraft;
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!activeProject) return;
    await deleteDraft(activeProject.id, draftId);
    await loadProjectData(activeProject.id);
  };

  return (
    <div className="min-h-screen bg-[#0E2327] text-[#E9EFEA] flex flex-col font-sans">
      <Navbar
        projects={projects}
        activeProject={activeProject}
        activeTab={activeTab}
        onSelectProject={(p) => setActiveProject(p)}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-[#FF6B57]/15 border border-[#FF6B57]/30 text-[#FF6B57] text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-[#FF6B57] hover:text-[#E9EFEA]">✕</button>
          </div>
        )}

        {activeTab === "dashboard" && (
          <DashboardView
            project={activeProject}
            posts={posts}
            styleProfile={styleProfile}
            drafts={drafts}
            onSelectTab={(t) => setActiveTab(t)}
            onAnalyzeStyle={handleAnalyzeStyle}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            loadingAnalysis={loadingAnalysis}
          />
        )}

        {activeTab === "posts" && (
          <PostsView posts={posts} onOpenImportModal={() => setIsImportModalOpen(true)} />
        )}

        {activeTab === "style-profile" && (
          <StyleProfileView
            styleProfile={styleProfile}
            onAnalyzeStyle={handleAnalyzeStyle}
            loadingAnalysis={loadingAnalysis}
            onSelectTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === "generate" && (
          <GeneratorView
            project={activeProject}
            styleProfile={styleProfile}
            onGenerate={handleGenerateDraft}
            onSelectTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === "drafts" && (
          <DraftsView
            project={activeProject}
            drafts={drafts}
            onDeleteDraft={handleDeleteDraft}
          />
        )}
      </main>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />

      {activeProject && (
        <ImportDatasetModal
          isOpen={isImportModalOpen}
          projectId={activeProject.id}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportDataset}
        />
      )}
    </div>
  );
}
