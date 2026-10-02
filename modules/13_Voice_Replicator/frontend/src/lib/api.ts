import { Project, Post, StyleProfile, GenerationRequest, GeneratedDraft, ValidationResult } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function createProject(data: { name: string; creator_handle?: string; description?: string }): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete project");
}

export async function fetchProjectPosts(projectId: string): Promise<Post[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/posts`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}

export async function importPosts(projectId: string, postsData: any): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/posts/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postsData),
  });
  if (!res.ok) throw new Error("Failed to import dataset");
  return res.json();
}

export async function analyzeProjectStyle(projectId: string): Promise<StyleProfile> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/analyze`, {
    method: "POST",
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to analyze project style");
  }
  return res.json();
}

export async function fetchStyleProfile(projectId: string): Promise<StyleProfile> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/style-profile`);
  if (!res.ok) throw new Error("Style profile not generated yet");
  return res.json();
}

export async function generateDraft(projectId: string, req: GenerationRequest): Promise<GeneratedDraft> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to generate draft");
  }
  return res.json();
}

export async function fetchDraftValidation(draftId: string): Promise<ValidationResult> {
  const res = await fetch(`${API_BASE_URL}/drafts/${draftId}/validation`);
  if (!res.ok) throw new Error("Failed to fetch draft validation");
  return res.json();
}

export async function fetchProjectDrafts(projectId: string): Promise<GeneratedDraft[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/drafts`);
  if (!res.ok) throw new Error("Failed to fetch drafts");
  return res.json();
}

export async function deleteDraft(projectId: string, draftId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/drafts/${draftId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete draft");
}
