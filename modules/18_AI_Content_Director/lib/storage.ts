import { Project, ProjectMetadata, Platform, Tone } from './types';
import {
  generateMockResearch,
  generateMockAngles,
  generateMockNarrative,
  generateMockScript,
  generateMockVisuals,
  generateMockShotList,
  generateMockPublishing
} from './mock-data';

const STORAGE_KEY = 'ai_content_director_projects_v1';
const ACTIVE_PROJECT_ID_KEY = 'ai_content_director_active_id_v1';

export function createInitialSampleProject(): Project {
  const meta: ProjectMetadata = {
    id: 'sample-project-001',
    title: 'The 7-Stage AI Content Pipeline',
    topic: 'How Solo Creators Can Build Studio-Quality Videos in Under 45 Minutes Using AI Pipelines',
    platform: 'youtube',
    targetDuration: '5-8 Minutes',
    targetAudience: 'Content Creators, Founders & Filmmakers',
    tone: 'cinematic',
    language: 'English',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStage: 1,
    completedStages: [1, 2, 3, 4, 5, 6, 7]
  };

  const research = generateMockResearch(meta);
  const angles = generateMockAngles(meta, research);
  const narrative = generateMockNarrative(meta, angles);
  const script = generateMockScript(meta, narrative);
  const visuals = generateMockVisuals(meta, script);
  const shotList = generateMockShotList(meta, visuals);
  const publishing = generateMockPublishing(meta, script);

  return {
    ...meta,
    research,
    angles,
    narrative,
    script,
    visuals,
    shotList,
    publishing
  };
}

export function loadProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const sample = createInitialSampleProject();
      saveProjects([sample]);
      return [sample];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [createInitialSampleProject()];
  } catch (err) {
    console.error('Error loading projects from storage:', err);
    return [createInitialSampleProject()];
  }
}

export function saveProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Error saving projects to storage:', err);
  }
}

export function saveProject(project: Project): Project[] {
  const existing = loadProjects();
  const index = existing.findIndex((p) => p.id === project.id);
  const updatedProject = {
    ...project,
    updatedAt: new Date().toISOString()
  };

  let updatedList: Project[];
  if (index >= 0) {
    updatedList = [...existing];
    updatedList[index] = updatedProject;
  } else {
    updatedList = [updatedProject, ...existing];
  }

  saveProjects(updatedList);
  return updatedList;
}

export function deleteProject(id: string): Project[] {
  const existing = loadProjects();
  const filtered = existing.filter((p) => p.id !== id);
  saveProjects(filtered);
  return filtered;
}

export function getActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
}

export function setActiveProjectId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
}

export function createNewProject(params: {
  topic: string;
  platform: Platform;
  targetDuration: string;
  targetAudience: string;
  tone: Tone;
  language: string;
}): Project {
  const id = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  const title = params.topic.length > 45 ? `${params.topic.substring(0, 42)}...` : params.topic;

  const project: Project = {
    id,
    title,
    topic: params.topic,
    platform: params.platform,
    targetDuration: params.targetDuration,
    targetAudience: params.targetAudience,
    tone: params.tone,
    language: params.language,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStage: 1,
    completedStages: []
  };

  saveProject(project);
  setActiveProjectId(id);
  return project;
}
