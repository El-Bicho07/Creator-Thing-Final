"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { forgeWeeksData, ForgeWeekItem, ForgeGalleryImage } from "@/content/forge";
import { 
  FolderGit2, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Users, 
  Sparkles, 
  Target, 
  AlertTriangle, 
  Lightbulb, 
  BookOpen,
  Check, 
  Copy,
  Code,
  Compass,
  Image as ImageIcon,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Trash2,
  Save,
  Lock,
  RotateCcw,
  ShieldAlert,
  Upload,
  Loader2,
  Video,
  Play,
  Film,
  Cpu,
  Layers,
  Settings,
  ExternalLink,
  ShieldCheck,
  Wrench,
  FileCode,
  Info
} from "lucide-react";

/**
 * Utility to check if a media URL or item type corresponds to a video file.
 */
function isVideoUrl(url: string, itemType?: string): boolean {
  if (itemType === "video") return true;
  if (!url) return false;
  if (url.startsWith("data:video/")) return true;
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".ogg") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".m4v") ||
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("vimeo.com")
  );
}

/**
 * IndexedDB storage engine for large media uploads.
 */
const DB_NAME = "ProtoSemDB";
const STORE_NAME = "custom_weeks";
const DB_VERSION = 2;

function getIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available in this browser environment."));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveCustomWeeksToDB(weeks: ForgeWeekItem[]): Promise<void> {
  try {
    const db = await getIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(weeks, "protosem_custom_weeks_v3");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB save warning:", err);
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("protosem_custom_weeks_v3", JSON.stringify(weeks));
    } catch (e) {
      console.warn("localStorage quota limit reached:", e);
    }
  }
}

async function loadCustomWeeksFromDB(): Promise<ForgeWeekItem[] | null> {
  try {
    const db = await getIDB();
    const data = await new Promise<ForgeWeekItem[] | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get("protosem_custom_weeks_v3");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (data && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch {
    // Fallback to localStorage below
  }

  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("protosem_custom_weeks_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export default function ForgePage() {
  const [weeks, setWeeks] = useState<ForgeWeekItem[]>(forgeWeeksData);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedWeek, setExpandedWeek] = useState<number | null>(7);
  const [activeLightbox, setActiveLightbox] = useState<{ weekNumber: number; imageIndex: number } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Admin Edit Mode State
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingWeek, setEditingWeek] = useState<ForgeWeekItem | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<"general" | "sections" | "gallery">("general");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageCaption, setNewImageCaption] = useState("");
  const [newMediaType, setNewMediaType] = useState<"image" | "video">("image");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync admin state and load persisted data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const unlocked = localStorage.getItem("protosem_admin_unlocked") === "true";
      setIsAdmin(unlocked);

      loadCustomWeeksFromDB().then((saved) => {
        if (saved && Array.isArray(saved) && saved.length > 0) {
          // Merge saved edits with forgeWeeksData, ensuring authentic completed weeks (0-8) are preserved
          const merged = forgeWeeksData.map((defaultWeek) => {
            const savedWeek = saved.find((s) => s.weekNumber === defaultWeek.weekNumber);
            if (!savedWeek) return defaultWeek;
            if (defaultWeek.status === "Completed" && savedWeek.status === "In Progress") {
              return defaultWeek;
            }
            return savedWeek;
          });
          setWeeks(merged);
        }
      });
    }
  }, []);

  const categories = ["All", ...Array.from(new Set(weeks.map((w) => w.category)))];

  const filteredWeeks = weeks
    .filter((w) => {
      const matchesCategory = selectedCategory === "All" || w.category === selectedCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        w.title.toLowerCase().includes(query) ||
        w.subtitle.toLowerCase().includes(query) ||
        w.summary.toLowerCase().includes(query) ||
        w.tags.some((t) => t.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => a.weekNumber - b.weekNumber);

  const activeLightboxWeek = activeLightbox
    ? weeks.find((w) => w.weekNumber === activeLightbox.weekNumber)
    : null;

  const handleNextLightboxImage = () => {
    if (!activeLightboxWeek || !activeLightboxWeek.galleryImages) return;
    const total = activeLightboxWeek.galleryImages.length;
    setActiveLightbox((prev) => prev ? { ...prev, imageIndex: (prev.imageIndex + 1) % total } : null);
  };

  const handlePrevLightboxImage = () => {
    if (!activeLightboxWeek || !activeLightboxWeek.galleryImages) return;
    const total = activeLightboxWeek.galleryImages.length;
    setActiveLightbox((prev) => prev ? { ...prev, imageIndex: (prev.imageIndex - 1 + total) % total } : null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeLightbox !== null) {
        if (e.key === "ArrowRight") handleNextLightboxImage();
        if (e.key === "ArrowLeft") handlePrevLightboxImage();
        if (e.key === "Escape") setActiveLightbox(null);
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setExpandedWeek((prev) => (prev === null ? 0 : Math.min(20, prev + 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setExpandedWeek((prev) => (prev === null ? 0 : Math.max(0, prev - 1)));
      } else if (e.key === "Escape") {
        setExpandedWeek(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightbox, activeLightboxWeek]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleLockAdmin = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("protosem_admin_unlocked");
      setIsAdmin(false);
    }
  };

  const handleResetWeeks = async () => {
    if (confirm("Reset all custom week edits to default content?")) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("protosem_custom_weeks_v3");
        localStorage.removeItem("protosem_custom_weeks_data");
        try {
          const db = await getIDB();
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).clear();
        } catch {
          // ignore
        }
      }
      setWeeks(forgeWeeksData);
    }
  };

  const handleSaveWeekEdit = async () => {
    if (!editingWeek) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const updatedWeeks = weeks.map((w) => (w.weekNumber === editingWeek.weekNumber ? editingWeek : w));
      setWeeks(updatedWeeks);
      await saveCustomWeeksToDB(updatedWeeks);
      setEditingWeek(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save week edits.";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingWeek) return;

    const isVid = file.type.startsWith("video/");
    const reader = new FileReader();

    reader.onload = () => {
      const base64Url = reader.result as string;
      const mediaKind: "video" | "image" = isVid ? "video" : "image";
      const cleanFileName = file.name.replace(/\.[^/.]+$/, "");
      const caption = cleanFileName
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const currentGallery = editingWeek.galleryImages || [];
      const updatedGallery = [
        ...currentGallery,
        { url: base64Url, caption, type: mediaKind }
      ];

      setEditingWeek({ ...editingWeek, galleryImages: updatedGallery });
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10 py-6">
      
      {/* ADMIN CONTROL BAR */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel-elevated rounded-2xl p-4 border border-emerald-500/40 bg-emerald-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono shadow-lg"
        >
          <div className="flex items-center gap-2 text-emerald-300 font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <ShieldAlert className="h-4 w-4 text-emerald-400" />
            <span>PROTOSEM ADMIN EDIT MODE ACTIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetWeeks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel hover:bg-neutral-800 text-neutral-300 border border-white/10 transition-all"
              title="Reset all custom week edits to default static data"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </button>
            <button
              onClick={handleLockAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold transition-all"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Lock Admin</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ARCHIVE HEADER */}
      <section className="space-y-4 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full glass-panel px-3.5 py-1 text-xs text-white border border-white/20"
        >
          <FolderGit2 className="h-3.5 w-3.5 text-white" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-300 font-bold">PROTOSEM INTERNSHIP • FORGE EXPERIENCE</span>
        </motion.div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white leading-tight">
          Forge Experience: Weeks 0–20
        </h1>

        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans max-w-2xl mx-auto">
          Forge Experience is where I document my weekly learning journey. Instead of simply showing what I built, I share how I learned, what challenges I faced, the solutions I explored, and the progress I made every week.
        </p>

        {/* Keyboard Helper Pill */}
        <div className="inline-flex items-center gap-2 rounded-full glass-panel px-3 py-0.5 text-[10px] font-mono text-neutral-400 border border-white/10">
          <span>Key Controls:</span>
          <kbd className="rounded bg-neutral-800 px-1 py-0.2 text-white border border-white/20">↑</kbd>
          <kbd className="rounded bg-neutral-800 px-1 py-0.2 text-white border border-white/20">↓</kbd>
          <span>Navigate</span>
          <span>•</span>
          <kbd className="rounded bg-neutral-800 px-1 py-0.2 text-white border border-white/20">ESC</kbd>
          <span>Collapse</span>
        </div>
      </section>

      {/* SEARCH BAR & CATEGORY FILTERS */}
      <section className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archive by title, topic, or keyword (e.g. 'FreeRTOS', 'Arduino', 'Sensors', 'Fusion 360')..."
            className="w-full rounded-xl glass-panel-elevated py-3 pl-11 pr-4 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-all border border-white/15"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3.5 py-1 text-[11px] font-mono font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-white text-black font-bold"
                  : "glass-panel text-neutral-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* VERTICAL FORGE WORKSPACE ARCHIVE */}
      <section className="relative space-y-4 pt-2">
        
        {/* Central Vertical Timeline Line */}
        <div className="absolute left-4 sm:left-7 top-0 bottom-0 w-px bg-white/15 pointer-events-none" />

        {filteredWeeks.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center space-y-2">
            <p className="text-xs text-neutral-400">No archive folders found for "{searchQuery}".</p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
              className="text-xs font-mono font-bold text-white hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredWeeks.map((week) => {
            const isExpanded = expandedWeek === week.weekNumber;
            const isCompleted = week.status === "Completed";
            const isWeek7 = week.weekNumber === 7;

            return (
              <motion.div
                key={week.id}
                layout
                className={`relative pl-9 sm:pl-14 transition-all duration-200 ${
                  isExpanded ? "z-20" : "z-10 opacity-90 hover:opacity-100"
                }`}
              >
                {/* Timeline Week Node */}
                <div
                  onClick={() => setExpandedWeek(isExpanded ? null : week.weekNumber)}
                  className={`absolute left-2 sm:left-[19px] top-5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border transition-all ${
                    isExpanded
                      ? "bg-white border-white text-black font-bold scale-110 shadow-glass-sm"
                      : isCompleted
                      ? "bg-neutral-800 border-white text-white"
                      : "bg-black border-white/30 text-neutral-500"
                  }`}
                >
                  <span className="text-[9px] font-mono">{week.weekNumber}</span>
                </div>

                {/* PHYSICAL FOLDER CONTAINER */}
                <div
                  className={`rounded-2xl transition-all duration-200 border overflow-hidden ${
                    isExpanded
                      ? "glass-panel-elevated border-white/40 shadow-2xl bg-neutral-900"
                      : "glass-panel border-white/10 hover:border-white/25"
                  }`}
                >
                  {/* FOLDER TAB HEADER */}
                  <div
                    onClick={() => setExpandedWeek(isExpanded ? null : week.weekNumber)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 cursor-pointer select-none gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-mono font-bold text-black shadow-sm">
                          WEEK {week.weekNumber}
                        </span>
                        <span className="rounded-full bg-white/10 px-2 py-0.2 text-[10px] font-mono text-neutral-300 border border-white/15">
                          {week.category}
                        </span>
                        {week.teamName && (
                          <span className="rounded-full bg-white/10 px-2 py-0.2 text-[10px] font-mono text-neutral-300 border border-white/15">
                            {week.teamName}
                          </span>
                        )}
                        <span className="text-[11px] text-neutral-500 font-mono">
                          {week.dateRange}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                        {week.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWeek(JSON.parse(JSON.stringify(week)));
                            setNewImageUrl("");
                            setNewImageCaption("");
                            setActiveEditorTab("general");
                          }}
                          className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/40 transition-all shadow-sm"
                          title="Edit Week Content"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-emerald-300" />
                          <span>Edit Week</span>
                        </button>
                      )}

                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono border ${
                        isCompleted
                          ? "bg-white/10 text-white border-white/20 font-semibold"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="h-3 w-3 text-white" /> : <Clock className="h-3 w-3 text-amber-400" />}
                        <span>{isCompleted ? `WEEK ${week.weekNumber} — COMPLETED` : week.status}</span>
                      </span>

                      <div className="flex h-7 w-7 items-center justify-center rounded-full glass-panel text-white">
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* UNFOLDING DRAWER CONTENT */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-t border-white/10 p-5 sm:p-6 space-y-6 bg-black/40"
                      >

                        {/* =========================================================
                            WEEK 7 ONLY — NEW 11-SECTION FRAMEWORK
                           ========================================================= */}
                        {isWeek7 ? (
                          <div className="space-y-6">

                            {/* SECTION 1: OVERVIEW */}
                            <div className="space-y-4 rounded-xl bg-neutral-900/60 p-4 border border-white/15">
                              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                <BookOpen className="h-4 w-4 text-emerald-400" />
                                <span>1. OVERVIEW</span>
                              </span>
                              <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans whitespace-pre-line">
                                {week.summary}
                              </p>

                              {week.objectives && week.objectives.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-white/10">
                                  <span className="text-[10px] font-mono text-neutral-300 uppercase tracking-wider font-bold flex items-center gap-1">
                                    <Target className="h-3.5 w-3.5 text-white" />
                                    <span>LEARNING OBJECTIVES</span>
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {week.objectives.map((obj, idx) => (
                                      <div key={idx} className="flex items-start gap-2 glass-panel p-2.5 rounded-lg border border-white/10 text-xs text-neutral-300">
                                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                        <span>{obj}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {week.activitiesCompleted && week.activitiesCompleted.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-white/10">
                                  <span className="text-[10px] font-mono text-neutral-300 uppercase tracking-wider font-bold flex items-center gap-1">
                                    <Sparkles className="h-3.5 w-3.5 text-white" />
                                    <span>ACTIVITIES COMPLETED</span>
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {week.activitiesCompleted.map((act, idx) => (
                                      <div key={idx} className="flex items-start gap-2 glass-panel p-2.5 rounded-lg border border-white/10 text-xs text-neutral-300">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                        <span>{act}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* SECTION 2: CONCEPTS */}
                            <div className="space-y-3 rounded-xl glass-panel p-4 border border-white/15">
                              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                <Lightbulb className="h-4 w-4 text-emerald-400" />
                                <span>2. CONCEPTS</span>
                              </span>
                              {week.conceptsLearned && (
                                <div className="flex flex-wrap gap-1.5">
                                  {week.conceptsLearned.map((concept, idx) => (
                                    <span key={idx} className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-300 border border-emerald-500/20">
                                      {concept}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* SECTION 3: SYSTEM DESIGN */}
                            {week.systemDesign && (
                              <div className="space-y-3 rounded-xl glass-panel p-4 border border-white/15">
                                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                  <Cpu className="h-4 w-4 text-emerald-400" />
                                  <span>3. SYSTEM DESIGN</span>
                                </span>
                                <pre className="rounded-xl bg-black p-4 overflow-x-auto text-[11px] font-mono text-emerald-300 border border-emerald-500/30 leading-relaxed shadow-inner">
                                  <code>{week.systemDesign.diagram}</code>
                                </pre>
                                <p className="text-xs text-neutral-300 leading-relaxed font-sans pt-1">
                                  {week.systemDesign.explanation}
                                </p>
                              </div>
                            )}

                            {/* SECTION 4: HARDWARE & SOFTWARE */}
                            {week.hardwareSoftware && week.hardwareSoftware.length > 0 && (
                              <div className="space-y-3 rounded-xl glass-panel p-4 border border-white/15">
                                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                  <Layers className="h-4 w-4 text-emerald-400" />
                                  <span>4. HARDWARE & SOFTWARE</span>
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {week.hardwareSoftware.map((item, idx) => (
                                    <div key={idx} className="glass-panel p-3 rounded-lg border border-white/10 flex flex-col justify-between space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-xs text-white">{item.name}</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                                          item.type === "Hardware" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                                          item.type === "Software" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                                          "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        }`}>
                                          {item.type}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-neutral-400">{item.purpose}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* SECTION 5: WIRING / SETUP */}
                            {week.wiringSetup && (
                              <div className="space-y-3 rounded-xl glass-panel p-4 border border-white/15">
                                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                  <Wrench className="h-4 w-4 text-emerald-400" />
                                  <span>5. WIRING / SETUP</span>
                                </span>
                                {week.wiringSetup.diagram && (
                                  <pre className="rounded-xl bg-black p-4 overflow-x-auto text-[11px] font-mono text-emerald-400 border border-white/15 leading-relaxed">
                                    <code>{week.wiringSetup.diagram}</code>
                                  </pre>
                                )}
                                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                                  {week.wiringSetup.description}
                                </p>
                              </div>
                            )}

                            {/* SECTION 6: IMPLEMENTATION */}
                            <div className="space-y-3 rounded-xl glass-panel p-4 border border-white/15">
                              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                <Code className="h-4 w-4 text-emerald-400" />
                                <span>6. IMPLEMENTATION</span>
                              </span>
                              {week.implementationDetails && (
                                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                                  {week.implementationDetails}
                                </p>
                              )}
                              {week.codeSnippet && (
                                <div className="space-y-2 pt-2">
                                  <div className="flex items-center justify-between text-[10px] font-mono">
                                    <span className="text-white uppercase flex items-center gap-1 font-bold">
                                      <FileCode className="h-3.5 w-3.5 text-emerald-400" />
                                      <span>{week.codeSnippet.filename}</span>
                                    </span>
                                    <button
                                      onClick={() => handleCopyCode(week.codeSnippet!.code)}
                                      className="flex items-center gap-1 rounded bg-neutral-900 px-2 py-0.5 text-neutral-300 hover:text-white transition-colors border border-white/15"
                                    >
                                      {copiedCode === week.codeSnippet.code ? (
                                        <>
                                          <Check className="h-3 w-3 text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3 w-3" />
                                          <span>Copy Code</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="rounded-xl bg-black p-3.5 overflow-x-auto text-[11px] font-mono text-neutral-300 border border-white/15">
                                    <code>{week.codeSnippet.code}</code>
                                  </pre>
                                </div>
                              )}
                            </div>

                            {/* SECTION 7: CONFIGURATION */}
                            {week.configurationDetails && (
                              <div className="space-y-3 rounded-xl glass-panel p-4 border border-white/15">
                                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                  <Settings className="h-4 w-4 text-emerald-400" />
                                  <span>7. CONFIGURATION</span>
                                </span>
                                <p className="text-xs text-neutral-300 leading-relaxed font-sans font-mono bg-black/40 p-3 rounded-lg border border-white/10">
                                  {week.configurationDetails}
                                </p>
                              </div>
                            )}

                            {/* SECTION 8: EVIDENCE */}
                            <div className="space-y-4 rounded-xl glass-panel p-4 border border-white/15">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                  <ImageIcon className="h-4 w-4 text-emerald-400" />
                                  <span>8. EVIDENCE</span>
                                </span>
                                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-md flex items-center gap-1 w-fit">
                                  <Upload className="h-3 w-3 text-amber-400 shrink-0" />
                                  <span>4 Evidence Media Cards (User Upload Pending)</span>
                                </span>
                              </div>

                              {week.evidenceList && week.evidenceList.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {week.evidenceList.map((ev, idx) => {
                                    const isVid = isVideoUrl(ev.mediaUrl, ev.type);
                                    return (
                                      <div key={idx} className="glass-panel p-4 rounded-xl border border-white/15 space-y-3 bg-black/50 flex flex-col justify-between">
                                        <div className="space-y-2.5">
                                          <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-semibold text-xs text-white font-sans leading-snug">
                                              Evidence {idx + 1} — {ev.title}
                                            </h4>
                                            <span className="px-2 py-0.5 rounded bg-white/10 text-[9px] font-mono text-neutral-300 border border-white/15 shrink-0">
                                              {isVid ? "VIDEO" : "IMAGE"}
                                            </span>
                                          </div>

                                          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 bg-neutral-950 px-3 py-1.5 rounded-lg border border-white/10">
                                            <span className="text-emerald-400 font-bold flex items-center gap-1 truncate">
                                              <FileCode className="h-3 w-3 text-emerald-400 shrink-0" />
                                              <span>Required File: {ev.filename}</span>
                                            </span>
                                            <span className="text-[9px] text-neutral-500 font-mono">
                                              public/img/week-7/
                                            </span>
                                          </div>

                                          {/* Upload Instruction Placeholder Container */}
                                          <div className="relative aspect-video w-full rounded-xl bg-neutral-950 border border-dashed border-emerald-500/30 flex flex-col items-center justify-center p-4 text-center space-y-2">
                                            <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                              <Upload className="h-4 w-4" />
                                            </div>
                                            <div className="space-y-1">
                                              <p className="text-xs font-mono text-emerald-300 font-semibold">
                                                Upload Target: {ev.filename}
                                              </p>
                                              <p className="text-[10px] text-neutral-400 font-mono">
                                                Place file in <code className="text-neutral-200 bg-neutral-900 px-1 py-0.5 rounded">public/img/week-7/{ev.filename}</code>
                                              </p>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Explanation */}
                                        <p className="text-xs text-neutral-300 leading-relaxed font-sans pt-1">
                                          {ev.explanation}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* SECTION 9: CHALLENGES & FIXES */}
                            {week.challengesFixesList && week.challengesFixesList.length > 0 && (
                              <div className="space-y-3 rounded-xl bg-amber-950/20 p-4 border border-amber-500/20">
                                <span className="text-[10px] font-mono text-amber-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                                  <span>9. CHALLENGES & FIXES</span>
                                </span>
                                <div className="space-y-3">
                                  {week.challengesFixesList.map((cf, idx) => (
                                    <div key={idx} className="space-y-1.5 glass-panel p-3.5 rounded-lg border border-amber-500/30 bg-black/60 text-xs">
                                      <p className="font-semibold text-amber-300 font-sans">
                                        <span className="font-mono uppercase text-[10px] text-amber-400 font-bold">Challenge: </span>
                                        {cf.challenge}
                                      </p>
                                      <p className="text-neutral-300 font-sans">
                                        <span className="font-mono uppercase text-[10px] text-emerald-400 font-bold">Fix: </span>
                                        {cf.fix}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* SECTION 10: REFLECTION */}
                            {week.reflection && (
                              <div className="space-y-2 rounded-xl bg-neutral-900 p-4 border border-white/20">
                                <span className="text-[10px] font-mono text-white uppercase tracking-wider font-bold flex items-center gap-1.5">
                                  <Compass className="h-4 w-4 text-emerald-400" />
                                  <span>10. REFLECTION</span>
                                </span>
                                <p className="text-xs text-neutral-200 italic leading-relaxed font-serif">
                                  "{week.reflection}"
                                </p>
                              </div>
                            )}

                            {/* SECTION 11: REPOSITORY LINK */}
                            {week.repoLink && (
                              <div className="space-y-2 glass-panel p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-950/20">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                    <FolderGit2 className="h-4 w-4 text-emerald-400" />
                                    <span>11. REPOSITORY LINK</span>
                                  </span>
                                  <p className="text-xs text-neutral-300 font-sans">
                                    Verified source code repository for FreeRTOS & ESP32 SPI Datalogger implementation.
                                  </p>
                                </div>
                                <a
                                  href={week.repoLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-mono font-bold text-black hover:bg-neutral-200 transition-all shrink-0 shadow-md"
                                >
                                  <span>View Code Repository</span>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            )}

                          </div>
                        ) : (

                          /* =========================================================
                              WEEKS 0–6 (AND OTHERS) — ORIGINAL / PREVIOUS FORMAT
                             ========================================================= */
                          <div className="space-y-6">

                            {/* Summary / Overview */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-white uppercase tracking-wider font-bold">OVERVIEW</span>
                              <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans space-y-3 whitespace-pre-line">
                                {week.summary}
                              </div>
                            </div>

                            {/* Objectives Checklist */}
                            {week.objectives && week.objectives.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-mono text-white uppercase tracking-wider font-bold flex items-center gap-1">
                                  <Target className="h-3.5 w-3.5 text-white" />
                                  <span>OBJECTIVES</span>
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {week.objectives.map((obj, idx) => (
                                    <div key={idx} className="flex items-start gap-2 glass-panel p-2.5 rounded-lg border border-white/10 text-xs text-neutral-300">
                                      <Check className="h-3.5 w-3.5 text-white shrink-0 mt-0.5" />
                                      <span>{obj}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Activities Completed */}
                            {week.activitiesCompleted && week.activitiesCompleted.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-mono text-white uppercase tracking-wider font-bold flex items-center gap-1">
                                  <Sparkles className="h-3.5 w-3.5 text-white" />
                                  <span>ACTIVITIES COMPLETED</span>
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {week.activitiesCompleted.map((act, idx) => (
                                    <div key={idx} className="flex items-start gap-2 glass-panel p-2.5 rounded-lg border border-white/10 text-xs text-neutral-300">
                                      <span className="h-1.5 w-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                                      <span>{act}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* MEDIA & VIDEO GALLERY */}
                            {week.galleryImages && week.galleryImages.length > 0 && (
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono text-white uppercase tracking-wider font-bold flex items-center gap-1.5">
                                    <ImageIcon className="h-3.5 w-3.5 text-white" />
                                    <span>MEDIA & VIDEO GALLERY ({week.galleryImages.length} ITEMS)</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-neutral-400">Click to expand</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {week.galleryImages.map((imgItem, imgIdx) => {
                                    const url = typeof imgItem === "string" ? imgItem : imgItem.url;
                                    const caption = typeof imgItem === "string" ? `Week ${week.weekNumber} Media ${imgIdx + 1}` : imgItem.caption;
                                    const itemType = typeof imgItem === "string" ? undefined : imgItem.type;
                                    const isVid = isVideoUrl(url, itemType);

                                    return (
                                      <motion.div
                                        key={imgIdx}
                                        whileHover={{ scale: 1.02 }}
                                        onClick={() => setActiveLightbox({ weekNumber: week.weekNumber, imageIndex: imgIdx })}
                                        className="group relative cursor-pointer overflow-hidden rounded-xl glass-panel p-2 border border-white/15 hover:border-white/40 transition-all bg-black/60 shadow-md flex flex-col justify-between"
                                      >
                                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-950">
                                          {isVid ? (
                                            <video
                                              src={url}
                                              muted
                                              playsInline
                                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                          ) : (
                                            <img
                                              src={url}
                                              alt={caption}
                                              loading="lazy"
                                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                          )}
                                          {isVid && (
                                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold text-amber-300 border border-amber-500/40 flex items-center gap-1 z-10">
                                              <Video className="h-3 w-3" />
                                              <span>VIDEO</span>
                                            </div>
                                          )}
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-lg">
                                              {isVid ? <Play className="h-5 w-5 fill-white text-white ml-0.5" /> : <Maximize2 className="h-4 w-4" />}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="pt-2 px-1 flex items-center justify-between gap-1">
                                          <p className="text-[11px] text-neutral-300 font-sans line-clamp-2 leading-snug group-hover:text-white transition-colors">
                                            {caption}
                                          </p>
                                          {isVid && <Film className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Challenges Faced */}
                            {week.challengesFaced && (
                              <div className="space-y-2 rounded-xl bg-amber-950/20 p-4 border border-amber-500/20">
                                <span className="text-[10px] font-mono text-amber-300 uppercase tracking-wider font-bold flex items-center gap-1">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                  <span>CHALLENGES FACED</span>
                                </span>
                                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                                  {week.challengesFaced}
                                </p>
                              </div>
                            )}

                            {/* Skills & Concepts Learned */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {week.skillsGained && (
                                <div className="space-y-2 glass-panel p-3.5 rounded-xl border border-white/10">
                                  <span className="text-[10px] font-mono text-white uppercase tracking-wider block font-bold">SKILLS DEVELOPED</span>
                                  <div className="flex flex-wrap gap-1">
                                    {week.skillsGained.map((skill) => (
                                      <span key={skill} className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-neutral-200 border border-white/15">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {week.conceptsLearned && (
                                <div className="space-y-2 glass-panel p-3.5 rounded-xl border border-white/10">
                                  <span className="text-[10px] font-mono text-white uppercase tracking-wider block font-bold">CONCEPTS LEARNED</span>
                                  <div className="flex flex-wrap gap-1">
                                    {week.conceptsLearned.map((concept) => (
                                      <span key={concept} className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-neutral-200 border border-white/15">
                                        {concept}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Key Learnings */}
                            {week.keyLearnings && (
                              <div className="space-y-2 rounded-xl bg-neutral-900/80 p-4 border border-white/15">
                                <span className="text-[10px] font-mono text-white uppercase tracking-wider font-bold flex items-center gap-1">
                                  <Lightbulb className="h-3.5 w-3.5 text-white" />
                                  <span>KEY LEARNINGS</span>
                                </span>
                                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                                  {week.keyLearnings}
                                </p>
                              </div>
                            )}

                            {/* Reflection */}
                            {week.reflection && (
                              <div className="space-y-2 rounded-xl bg-neutral-900 p-4 border border-white/20">
                                <span className="text-[10px] font-mono text-white uppercase tracking-wider font-bold flex items-center gap-1">
                                  <Compass className="h-3.5 w-3.5 text-white" />
                                  <span>WEEK REFLECTION</span>
                                </span>
                                <p className="text-xs text-neutral-200 italic leading-relaxed font-serif">
                                  "{week.reflection}"
                                </p>
                              </div>
                            )}

                            {/* Deliverables & Contributor Credits */}
                            {week.deliverables && week.deliverables.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                <div className="space-y-2 glass-panel p-4 rounded-xl border border-white/10">
                                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-white uppercase font-bold">
                                    <FileText className="h-3.5 w-3.5" />
                                    <span>DELIVERABLES ({week.deliverables.length})</span>
                                  </div>
                                  <ul className="space-y-1.5">
                                    {week.deliverables.map((d, idx) => (
                                      <li key={idx} className="flex items-center justify-between text-xs text-neutral-300">
                                        <span>{d.title}</span>
                                        <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-mono text-white border border-white/15">
                                          {d.type}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {week.teamCredits && (
                                  <div className="space-y-2 glass-panel p-4 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-white uppercase font-bold">
                                      <Users className="h-3.5 w-3.5" />
                                      <span>CONTRIBUTOR CREDITS</span>
                                    </div>
                                    <ul className="space-y-1.5">
                                      {week.teamCredits.map((c, idx) => (
                                        <li key={idx} className="flex items-center justify-between text-xs text-neutral-300">
                                          <span className="text-neutral-500">{c.role}</span>
                                          <span className="font-semibold text-white">{c.name}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Code Snippet */}
                            {week.codeSnippet && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="text-white uppercase flex items-center gap-1 font-bold">
                                    <Code className="h-3.5 w-3.5" />
                                    <span>{week.codeSnippet.filename}</span>
                                  </span>
                                  <button
                                    onClick={() => handleCopyCode(week.codeSnippet!.code)}
                                    className="flex items-center gap-1 rounded bg-neutral-900 px-2 py-0.5 text-neutral-300 hover:text-white transition-colors border border-white/15"
                                  >
                                    {copiedCode === week.codeSnippet.code ? (
                                      <>
                                        <Check className="h-3 w-3 text-white" />
                                        <span className="text-white">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy Code</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="rounded-xl bg-black p-3.5 overflow-x-auto text-[11px] font-mono text-neutral-300 border border-white/15">
                                  <code>{week.codeSnippet.code}</code>
                                </pre>
                              </div>
                            )}

                          </div>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-white/10">
                          {week.tags.map((t) => (
                            <span key={t} className="rounded bg-neutral-900 px-2 py-0.2 text-[9px] font-mono text-neutral-400 border border-white/10">
                              #{t}
                            </span>
                          ))}
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })
        )}
      </section>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      <AnimatePresence>
        {activeLightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-8"
          >
            <button
              onClick={() => setActiveLightbox(null)}
              className="absolute top-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full glass-panel text-white hover:bg-white/20 transition-all border border-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <button
              onClick={handlePrevLightboxImage}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 flex h-11 w-11 items-center justify-center rounded-full glass-panel text-white hover:bg-white/20 transition-all border border-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              onClick={handleNextLightboxImage}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 flex h-11 w-11 items-center justify-center rounded-full glass-panel text-white hover:bg-white/20 transition-all border border-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {activeLightboxWeek && activeLightboxWeek.galleryImages && (
              <div className="max-w-4xl w-full flex flex-col items-center justify-center space-y-4">
                {(() => {
                  const currentItem = activeLightboxWeek.galleryImages[activeLightbox.imageIndex];
                  const url = typeof currentItem === "string" ? currentItem : currentItem.url;
                  const caption = typeof currentItem === "string" ? `Week ${activeLightboxWeek.weekNumber} Media` : currentItem.caption;
                  const itemType = typeof currentItem === "string" ? undefined : currentItem.type;
                  const isVid = isVideoUrl(url, itemType);

                  return (
                    <>
                      <div className="relative max-h-[75vh] w-full flex items-center justify-center overflow-hidden rounded-2xl glass-panel border border-white/20 bg-black/80">
                        {isVid ? (
                          <video src={url} controls autoPlay className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain" />
                        ) : (
                          <img src={url} alt={caption} className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain" />
                        )}
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-sans text-white font-medium">{caption}</p>
                        <p className="text-xs font-mono text-neutral-400">
                          {activeLightbox.imageIndex + 1} of {activeLightboxWeek.galleryImages.length}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADMIN EDIT MODAL */}
      <AnimatePresence>
        {editingWeek && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*,.mp4,.webm,.ogg,.mov"
              className="hidden"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl glass-panel-elevated rounded-2xl border border-emerald-500/40 bg-neutral-950 p-6 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-serif text-lg font-bold text-white">
                    Edit Week {editingWeek.weekNumber} Content
                  </h3>
                </div>
                <button
                  onClick={() => setEditingWeek(null)}
                  className="rounded-full glass-panel p-1.5 text-neutral-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Editor Tabs */}
              <div className="flex gap-2 border-b border-white/10 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveEditorTab("general")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    activeEditorTab === "general"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  General Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab("gallery")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    activeEditorTab === "gallery"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Gallery & Media ({(editingWeek.galleryImages || []).length})
                </button>
              </div>

              {activeEditorTab === "general" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-neutral-300 font-bold uppercase">Title</label>
                      <input
                        type="text"
                        value={editingWeek.title}
                        onChange={(e) => setEditingWeek({ ...editingWeek, title: e.target.value })}
                        className="w-full rounded-xl glass-panel p-2.5 text-white border border-white/15 bg-black/40 focus:outline-none focus:border-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-neutral-300 font-bold uppercase">Subtitle</label>
                      <input
                        type="text"
                        value={editingWeek.subtitle}
                        onChange={(e) => setEditingWeek({ ...editingWeek, subtitle: e.target.value })}
                        className="w-full rounded-xl glass-panel p-2.5 text-white border border-white/15 bg-black/40 focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-neutral-300 font-bold uppercase">Summary / Overview</label>
                    <textarea
                      rows={4}
                      value={editingWeek.summary}
                      onChange={(e) => setEditingWeek({ ...editingWeek, summary: e.target.value })}
                      className="w-full rounded-xl glass-panel p-2.5 text-white border border-white/15 bg-black/40 focus:outline-none focus:border-white font-sans"
                    />
                  </div>
                </div>
              )}

              {activeEditorTab === "gallery" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-300 font-bold uppercase">
                      GALLERY MEDIA LIST ({(editingWeek.galleryImages || []).length} ITEMS)
                    </span>
                  </div>

                  {editingWeek.galleryImages && editingWeek.galleryImages.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                      {editingWeek.galleryImages.map((imgItem, imgIdx) => {
                        const url = typeof imgItem === "string" ? imgItem : imgItem.url;
                        const caption = typeof imgItem === "string" ? `Media ${imgIdx + 1}` : imgItem.caption;
                        const isVid = isVideoUrl(url, typeof imgItem === "string" ? undefined : imgItem.type);

                        return (
                          <div key={imgIdx} className="flex items-center gap-3 p-2.5 rounded-xl glass-panel border border-white/15 bg-black/50">
                            <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-black relative">
                              {isVid ? (
                                <video src={url} muted className="h-full w-full object-cover" />
                              ) : (
                                <img src={url} alt={caption} className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{caption}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (editingWeek.galleryImages || []).filter((_, i) => i !== imgIdx);
                                setEditingWeek({ ...editingWeek, galleryImages: updated });
                              }}
                              className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-mono text-white border border-white/20 hover:bg-white/20"
                    >
                      <Upload className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Upload Image or Video File</span>
                    </button>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                  <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setEditingWeek(null)}
                  className="rounded-full glass-panel px-5 py-2.5 text-xs font-mono text-neutral-400 hover:text-white border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveWeekEdit}
                  className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs font-mono font-bold text-black hover:bg-neutral-200 transition-all shadow-md"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : <Save className="h-4 w-4 text-black" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
