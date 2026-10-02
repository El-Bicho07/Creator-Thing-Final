"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { StartScreen } from "@/components/StartScreen";
import { SidebarHistory } from "@/components/SidebarHistory";
import { StageStepper } from "@/components/StageStepper";
import { MobileStepperBar } from "@/components/MobileStepperBar";
import { StickyBottomBar } from "@/components/StickyBottomBar";
import { StageSkeletonLoader } from "@/components/StageSkeletonLoader";

// Stage components
import { ResearchStage } from "@/components/stages/ResearchStage";
import { AnglesStage } from "@/components/stages/AnglesStage";
import { NarrativeStage } from "@/components/stages/NarrativeStage";
import { ScriptStage } from "@/components/stages/ScriptStage";
import { VisualsStage } from "@/components/stages/VisualsStage";
import { ShotListStage } from "@/components/stages/ShotListStage";
import { PublishingStage } from "@/components/stages/PublishingStage";

// Dynamic Content-Theme & Meme Studio
import { FloatingThemeElements } from "@/components/FloatingThemeElements";
import { MemeStudio } from "@/components/MemeStudio";
import { CasualVideoGeneratorModal } from "@/components/CasualVideoGeneratorModal";
import { IntroLaunchScreen } from "@/components/IntroLaunchScreen";

// Modals
import { ExportModal } from "@/components/modals/ExportModal";
import { EditStageModal } from "@/components/modals/EditStageModal";
import { RegenerateModal } from "@/components/modals/RegenerateModal";

// Utilities & Data
import { Project, Platform, Tone } from "@/lib/types";
import { STAGES_CONFIG } from "@/lib/stages-config";
import {
  loadProjects,
  saveProject,
  deleteProject,
  getActiveProjectId,
  setActiveProjectId,
  createNewProject,
  createInitialSampleProject,
} from "@/lib/storage";
import { exportToMarkdown } from "@/lib/export";
import { AlertCircle, RotateCcw, Sparkles } from "lucide-react";

const STAGE_THEMES: Record<
  number,
  {
    accent: string;
    badge: string;
    glow: string;
    emoji: string;
    vibe: string;
  }
> = {
  1: {
    accent: "from-emerald-500/10 via-cyan-500/5 to-transparent",
    badge: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
    glow: "bg-emerald-500/15",
    emoji: "🔍 📊 💡",
    vibe: "Intel & Verified Research"
  },
  2: {
    accent: "from-purple-500/15 via-indigo-500/5 to-transparent",
    badge: "border-purple-500/30 text-purple-400 bg-purple-500/10",
    glow: "bg-purple-500/20",
    emoji: "🎯 ⚡ 🤯",
    vibe: "Viral Hooks & Angles"
  },
  3: {
    accent: "from-blue-500/15 via-indigo-500/5 to-transparent",
    badge: "border-blue-500/30 text-blue-400 bg-blue-500/10",
    glow: "bg-blue-500/20",
    emoji: "🧬 🎬 📈",
    vibe: "Narrative Arc & Story Beats"
  },
  4: {
    accent: "from-amber-500/15 via-orange-500/5 to-transparent",
    badge: "border-amber-500/30 text-amber-500 bg-amber-500/10",
    glow: "bg-amber-500/20",
    emoji: "🎙️ 📜 🗣️",
    vibe: "Spoken Script & Teleprompter"
  },
  5: {
    accent: "from-amber-500/15 via-orange-500/5 to-transparent",
    badge: "border-amber-500/30 text-amber-500 bg-amber-500/10",
    glow: "bg-amber-500/20",
    emoji: "🎥 🍳 🌶️",
    vibe: "Cinematography, Sizzling B-Roll & Visuals"
  },
  6: {
    accent: "from-teal-500/15 via-emerald-500/5 to-transparent",
    badge: "border-teal-500/30 text-teal-400 bg-teal-500/10",
    glow: "bg-teal-500/20",
    emoji: "📸 🎬 ✅",
    vibe: "Production Camera Shot List"
  },
  7: {
    accent: "from-orange-500/20 via-amber-500/10 to-transparent",
    badge: "border-orange-500/30 text-orange-500 bg-orange-500/10",
    glow: "bg-orange-500/25",
    emoji: "🚀 🍛 🔥",
    vibe: "Multi-Platform Packaging & Viral Feast Launch"
  }
};

export default function AIContentDirectorApp() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active top-level tab (Pipeline vs Meme Studio)
  const [activeTab, setActiveTab] = useState<"pipeline" | "memes">("pipeline");
  const [isVideoGeneratorOpen, setIsVideoGeneratorOpen] = useState<boolean>(false);

  // Modals state
  const [isHistoryOpenMobile, setIsHistoryOpenMobile] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isRegenOpen, setIsRegenOpen] = useState<boolean>(false);

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Fullscreen Gaming & Video Editor Launch Screen (5-8s motion intro)
  const [showIntro, setShowIntro] = useState<boolean>(true);

  // Attach meme from Meme Studio directly to active project's Visuals Stage
  const handleAttachMemeToProject = (meme: {
    comedian: string;
    movieRef: string;
    iconicDialogue: string;
    memeContext: string;
    imageUrl: string;
    topText: string;
    bottomText: string;
  }) => {
    if (!activeProject) return;

    const existingVisuals = activeProject.visuals || {
      overallMood: "High energy creator visual direction",
      colorPaletteSuggestion: "Neon Amber and Slate",
      musicPacing: "Fast rhythmic lo-fi",
      items: []
    };

    const targetIndex = Math.min(currentStage - 1, Math.max(0, existingVisuals.items.length - 1));
    const updatedItems = existingVisuals.items.map((item, idx) => {
      if (idx === targetIndex || existingVisuals.items.length === 1) {
        return {
          ...item,
          tamilComedyMeme: {
            comedian: meme.comedian,
            movieRef: meme.movieRef,
            iconicDialogue: meme.iconicDialogue,
            memeContext: meme.memeContext,
            imageUrl: meme.imageUrl
          }
        };
      }
      return item;
    });

    const updated: Project = {
      ...activeProject,
      visuals: {
        ...existingVisuals,
        items: updatedItems.length > 0 ? updatedItems : existingVisuals.items
      },
      updatedAt: new Date().toISOString()
    };

    const savedList = saveProject(updated);
    setProjects(savedList);
    setActiveProject(updated);
  };

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    const loaded = loadProjects();
    setProjects(loaded);

    const activeId = getActiveProjectId();
    if (activeId) {
      const match = loaded.find((p) => p.id === activeId);
      if (match) {
        setActiveProject(match);
        setCurrentStage(match.currentStage || 1);
      }
    }

    // Load theme preference
    const savedTheme = localStorage.getItem("ai_content_director_theme");
    if (savedTheme === "light") {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("ai_content_director_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("ai_content_director_theme", "light");
    }
  };

  // 2. Select / Switch Project
  const handleSelectProject = (id: string) => {
    const match = projects.find((p) => p.id === id);
    if (match) {
      setActiveProject(match);
      setCurrentStage(match.currentStage || 1);
      setActiveProjectId(id);
      setError(null);
    }
  };

  // 3. New Project (Returns to Start Screen)
  const handleNewProjectPrompt = () => {
    setActiveProject(null);
    setError(null);
  };

  // 4. Delete Project
  const handleDeleteProject = (id: string) => {
    const remaining = deleteProject(id);
    setProjects(remaining);
    if (activeProject?.id === id) {
      if (remaining.length > 0) {
        setActiveProject(remaining[0]);
        setCurrentStage(remaining[0].currentStage || 1);
        setActiveProjectId(remaining[0].id);
      } else {
        setActiveProject(null);
      }
    }
  };

  // 5. Load Demo Sample Project
  const handleLoadSample = () => {
    const sample = createInitialSampleProject();
    const updated = saveProject(sample);
    setProjects(updated);
    setActiveProject(sample);
    setCurrentStage(1);
    setActiveProjectId(sample.id);
    setError(null);
  };

  // 6. Generate Stage API Call
  const generateStage = useCallback(
    async (
      projectToUpdate: Project,
      stageNumber: number,
      guidance?: string
    ): Promise<Project | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = {
          stageNumber,
          projectMetadata: {
            id: projectToUpdate.id,
            title: projectToUpdate.title,
            topic: projectToUpdate.topic,
            platform: projectToUpdate.platform,
            targetDuration: projectToUpdate.targetDuration,
            targetAudience: projectToUpdate.targetAudience,
            tone: projectToUpdate.tone,
            language: projectToUpdate.language,
          },
          previousStages: {
            research: projectToUpdate.research,
            angles: projectToUpdate.angles,
            narrative: projectToUpdate.narrative,
            script: projectToUpdate.script,
            visuals: projectToUpdate.visuals,
            shotList: projectToUpdate.shotList,
          },
          userGuidance: guidance,
        };

        const res = await fetch("/api/pipeline/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned status ${res.status}`);
        }

        const resJson = await res.json();
        const stageData = resJson.data;

        // Apply data to project
        const stageKey = STAGES_CONFIG.find((s) => s.number === stageNumber)?.key;
        if (!stageKey) throw new Error("Invalid stage key");

        const completedSet = new Set(projectToUpdate.completedStages || []);
        completedSet.add(stageNumber);

        const updated: Project = {
          ...projectToUpdate,
          [stageKey]: stageData,
          currentStage: stageNumber,
          completedStages: Array.from(completedSet).sort((a, b) => a - b),
          updatedAt: new Date().toISOString(),
        };

        const savedList = saveProject(updated);
        setProjects(savedList);
        setActiveProject(updated);
        return updated;
      } catch (err: any) {
        console.error("Generation error:", err);
        setError(err.message || "Failed to generate stage content. Please retry.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 7. Intake Screen Submit -> Create Project and Trigger Stage 1
  const handleStartPipeline = async (params: {
    topic: string;
    platform: Platform;
    targetDuration: string;
    targetAudience: string;
    tone: Tone;
    language: string;
  }) => {
    const newProj = createNewProject(params);
    setActiveProject(newProj);
    setCurrentStage(1);
    setProjects(loadProjects());

    // Automatically trigger Stage 1: Research
    await generateStage(newProj, 1);
  };

  // 8. Generate All Mode: Runs Stages 1 through 7 Sequentially
  const handleGenerateAll = async () => {
    if (!activeProject || isGeneratingAll) return;
    setIsGeneratingAll(true);
    setError(null);

    let currentProj = activeProject;

    try {
      for (let s = 1; s <= 7; s++) {
        setCurrentStage(s);
        const stageKey = STAGES_CONFIG.find((cfg) => cfg.number === s)?.key;
        const alreadyHasData = stageKey && (currentProj as any)[stageKey];

        // If stage doesn't have data yet or user ran Generate All, generate it
        if (!alreadyHasData) {
          const updated = await generateStage(currentProj, s);
          if (!updated) {
            // Stopped on error
            break;
          }
          currentProj = updated;
        }
      }
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // 9. Approve & Continue
  const handleApproveAndContinue = async () => {
    if (!activeProject) return;

    if (currentStage < 7) {
      const nextStageNum = currentStage + 1;
      const nextStageKey = STAGES_CONFIG.find((s) => s.number === nextStageNum)?.key;
      const nextStageData = nextStageKey ? (activeProject as any)[nextStageKey] : null;

      setCurrentStage(nextStageNum);

      // If next stage is not yet generated, automatically trigger generation
      if (!nextStageData) {
        await generateStage(activeProject, nextStageNum);
      }
    } else {
      // Completed final stage (Stage 7) -> Open Export Modal
      setIsExportOpen(true);
    }
  };

  // 10. Regenerate Stage Handler
  const handleRegenerateStage = async (guidance?: string) => {
    if (!activeProject) return;
    await generateStage(activeProject, currentStage, guidance);
  };

  // 11. Edit Stage Data Save
  const handleSaveEditedStage = (updatedData: any) => {
    if (!activeProject) return;
    const stageKey = STAGES_CONFIG.find((s) => s.number === currentStage)?.key;
    if (!stageKey) return;

    const updated: Project = {
      ...activeProject,
      [stageKey]: updatedData,
      updatedAt: new Date().toISOString(),
    };

    const savedList = saveProject(updated);
    setProjects(savedList);
    setActiveProject(updated);
  };

  // 12. Angle Selection Handler in Stage 2
  const handleSelectAngle = (angleId: string) => {
    if (!activeProject?.angles) return;
    const updatedAngles = {
      ...activeProject.angles,
      selectedAngleId: angleId,
    };
    const updated: Project = {
      ...activeProject,
      angles: updatedAngles,
      updatedAt: new Date().toISOString(),
    };
    const savedList = saveProject(updated);
    setProjects(savedList);
    setActiveProject(updated);
  };

  // 13. Shot Completed Toggle in Stage 6
  const handleUpdateShot = (shotId: string, isCompleted: boolean) => {
    if (!activeProject?.shotList) return;
    const updatedShots = activeProject.shotList.shots.map((s) =>
      s.id === shotId ? { ...s, isCompleted } : s
    );
    const updated: Project = {
      ...activeProject,
      shotList: {
        ...activeProject.shotList,
        shots: updatedShots,
      },
      updatedAt: new Date().toISOString(),
    };
    const savedList = saveProject(updated);
    setProjects(savedList);
    setActiveProject(updated);
  };

  // Helper to extract text for copying current stage
  const getStageContentForCopy = (): string => {
    if (!activeProject) return "";
    switch (currentStage) {
      case 1:
        return activeProject.research
          ? `${activeProject.research.topicOverview}\n\nKey Facts:\n${activeProject.research.keyFacts.join("\n")}`
          : "";
      case 2:
        return activeProject.angles
          ? activeProject.angles.angles
              .map((a) => `[${a.title}]\nHook: "${a.hook}"\nEmotion: ${a.targetEmotion}\n${a.description}`)
              .join("\n\n")
          : "";
      case 3:
        return activeProject.narrative
          ? `Framework: ${activeProject.narrative.framework}\nCore Theme: ${activeProject.narrative.coreTheme}\n\nBeats:\n` +
              activeProject.narrative.beats
                .map((b) => `${b.act} - ${b.beatTitle} (${b.timing}): ${b.keyPoint}`)
                .join("\n")
          : "";
      case 4:
        return activeProject.script
          ? activeProject.script.sections
              .map((s) => `[${s.sectionType.toUpperCase()}] ${s.title}\n${s.spokenText}`)
              .join("\n\n")
          : "";
      case 5:
        return activeProject.visuals
          ? activeProject.visuals.items
              .map((v) => `Section: ${v.sectionTitle}\nVisual: ${v.onScreenVisuals}\nB-Roll: ${v.bRollIdeas.join(", ")}`)
              .join("\n\n")
          : "";
      case 6:
        return activeProject.shotList
          ? activeProject.shotList.shots
              .map((s) => `Shot ${s.shotNumber} (${s.shotType}, ${s.cameraMovement}): ${s.scene} - "${s.dialogueVo}"`)
              .join("\n")
          : "";
      case 7:
        return activeProject.publishing
          ? `Titles:\n${activeProject.publishing.titleOptions.join("\n")}\n\nDescription:\n${activeProject.publishing.seoDescription}`
          : "";
      default:
        return "";
    }
  };

  // Check if current stage has data
  const currentStageConfig = STAGES_CONFIG.find((s) => s.number === currentStage) || STAGES_CONFIG[0];
  const currentStageKey = currentStageConfig.key;
  const currentStageData = activeProject ? (activeProject as any)[currentStageKey] : null;
  const isStageReady = !!currentStageData;

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground relative">
      {/* Dynamic Content-Specific Floating Background Particles (Notebooks for study, Food/Pizza for food review, etc.) */}
      <FloatingThemeElements topic={activeProject?.topic || ""} />

      {/* 0. Fullscreen Gaming & Video Editor Launch Screen (5-8s motion intro) */}
      {showIntro && (
        <IntroLaunchScreen
          durationSeconds={6.5}
          onComplete={() => setShowIntro(false)}
        />
      )}

      {/* 1. Global Header */}
      <Header
        project={activeProject}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isGeneratingAll={isGeneratingAll}
        onGenerateAll={handleGenerateAll}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenHistory={() => setIsHistoryOpenMobile(true)}
        onNewProject={handleNewProjectPrompt}
        onOpenVideoGenerator={() => setIsVideoGeneratorOpen(true)}
        onReplayIntro={() => setShowIntro(true)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* 2. Main Content Viewport */}
      {!activeProject ? (
        // Start Screen (Intake Form)
        <main className="flex-1 flex items-center justify-center p-safe-bottom z-10">
          <StartScreen onSubmit={handleStartPipeline} onLoadSample={handleLoadSample} />
        </main>
      ) : activeTab === "memes" ? (
        // Dedicated Meme Studio Tab Viewport
        <div className="flex-1 flex flex-col xl:flex-row w-full max-w-[1920px] mx-auto z-10">
          <SidebarHistory
            projects={projects}
            activeProjectId={activeProject.id}
            onSelectProject={handleSelectProject}
            onNewProject={handleNewProjectPrompt}
            onDeleteProject={handleDeleteProject}
            isOpenMobile={isHistoryOpenMobile}
            onCloseMobile={() => setIsHistoryOpenMobile(false)}
          />
          <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
            <MemeStudio
              project={activeProject}
              onAttachMemeToProject={handleAttachMemeToProject}
            />
          </main>
        </div>
      ) : (
        // Active Project Multi-Panel Pipeline Workspace
        <div className="flex-1 flex flex-col xl:flex-row w-full max-w-[1920px] mx-auto z-10">
          {/* Left Panel: Project History Sidebar */}
          <SidebarHistory
            projects={projects}
            activeProjectId={activeProject.id}
            onSelectProject={handleSelectProject}
            onNewProject={handleNewProjectPrompt}
            onDeleteProject={handleDeleteProject}
            isOpenMobile={isHistoryOpenMobile}
            onCloseMobile={() => setIsHistoryOpenMobile(false)}
          />

          {/* Center Stage Workspace */}
          <main className={`flex-1 flex flex-col min-w-0 relative overflow-hidden bg-gradient-to-b ${STAGE_THEMES[currentStage]?.accent || "from-transparent to-transparent"} transition-all duration-500`}>
            {/* Ambient Glowing Background Orb */}
            <div
              className={`absolute -top-24 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${STAGE_THEMES[currentStage]?.glow || "bg-primary/10"}`}
            />

            {/* Mobile / Tablet Compact Stepper Bar */}
            <MobileStepperBar
              currentStage={currentStage}
              completedStages={activeProject.completedStages || []}
              onSelectStage={(num) => setCurrentStage(num)}
            />

            {/* Dynamic Creator Vibe Banner */}
            <div className="px-4 sm:px-8 pt-4 pb-0 max-w-4xl mx-auto w-full flex flex-wrap items-center justify-between gap-2 select-none">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl animate-bounce">
                  {STAGE_THEMES[currentStage]?.emoji.split(" ")[0]}
                </span>
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${STAGE_THEMES[currentStage]?.badge}`}>
                  {STAGE_THEMES[currentStage]?.vibe}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <span>{STAGE_THEMES[currentStage]?.emoji}</span>
                </span>
                {((activeProject.language || "").toLowerCase().includes("tamil") || (activeProject.language || "").toLowerCase().includes("tanglish")) && (
                  <span className="rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-500">
                    Tanglish / Tamil Mode 🎭
                  </span>
                )}
              </div>
            </div>

            {/* Stage Content Container */}
            <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full z-10">
              {/* Error State with Clear Retry Button */}
              {error && (
                <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-destructive">
                        Stage Generation Encountered an Issue
                      </h4>
                      <p className="text-xs text-destructive/90 mt-0.5">{error}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRegenerateStage()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 self-start sm:self-auto shrink-0 shadow-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retry Stage</span>
                  </button>
                </div>
              )}

              {/* Stage Body: Loading Skeleton or Stage Component */}
              {isLoading ? (
                <StageSkeletonLoader
                  stageNumber={currentStage}
                  stageTitle={currentStageConfig.title}
                />
              ) : isStageReady ? (
                <>
                  {currentStage === 1 && activeProject.research && (
                    <ResearchStage data={activeProject.research} />
                  )}

                  {currentStage === 2 && activeProject.angles && (
                    <AnglesStage
                      data={activeProject.angles}
                      onSelectAngle={handleSelectAngle}
                    />
                  )}

                  {currentStage === 3 && activeProject.narrative && (
                    <NarrativeStage data={activeProject.narrative} />
                  )}

                  {currentStage === 4 && activeProject.script && (
                    <ScriptStage data={activeProject.script} />
                  )}

                  {currentStage === 5 && activeProject.visuals && (
                    <VisualsStage
                      data={activeProject.visuals}
                      onOpenMemeStudio={() => setActiveTab("memes")}
                    />
                  )}

                  {currentStage === 6 && activeProject.shotList && (
                    <ShotListStage
                      data={activeProject.shotList}
                      project={activeProject}
                      onUpdateShot={handleUpdateShot}
                    />
                  )}

                  {currentStage === 7 && activeProject.publishing && (
                    <PublishingStage
                      data={activeProject.publishing}
                      project={activeProject}
                      onOpenVideoGenerator={() => setIsVideoGeneratorOpen(true)}
                    />
                  )}
                </>
              ) : (
                /* Stage Uninitialized Prompt State */
                <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 sm:p-12 text-center space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Stage {currentStage}: {currentStageConfig.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                      {currentStageConfig.shortDesc}. Ready to synthesize using context from previous
                      stages.
                    </p>
                  </div>
                  <button
                    onClick={() => handleRegenerateStage()}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground hover:bg-primary-hover shadow-md shadow-primary/20 transition-all"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Stage {currentStage}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile & Desktop Sticky Action Bar */}
            <StickyBottomBar
              currentStage={currentStage}
              isStageReady={isStageReady}
              isLoading={isLoading}
              onEdit={() => setIsEditOpen(true)}
              onRegenerate={() => setIsRegenOpen(true)}
              onApproveAndContinue={handleApproveAndContinue}
              stageContentForCopy={getStageContentForCopy()}
            />
          </main>

          {/* Right Panel: Stepper & Director Tips (Desktop) */}
          <StageStepper
            currentStage={currentStage}
            completedStages={activeProject.completedStages || []}
            onSelectStage={(num) => setCurrentStage(num)}
            project={activeProject}
          />
        </div>
      )}

      {/* Modals */}
      {activeProject && (
        <>
          <ExportModal
            project={activeProject}
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
          />

          <EditStageModal
            stageNumber={currentStage}
            stageTitle={currentStageConfig.title}
            data={currentStageData}
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSave={handleSaveEditedStage}
          />

          <RegenerateModal
            stageNumber={currentStage}
            stageTitle={currentStageConfig.title}
            isOpen={isRegenOpen}
            onClose={() => setIsRegenOpen(false)}
            onConfirm={handleRegenerateStage}
          />

          <CasualVideoGeneratorModal
            project={activeProject}
            isOpen={isVideoGeneratorOpen}
            onClose={() => setIsVideoGeneratorOpen(false)}
          />
        </>
      )}
    </div>
  );
}
