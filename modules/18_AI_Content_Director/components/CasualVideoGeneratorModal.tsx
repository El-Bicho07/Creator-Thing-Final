"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Film,
  Layers,
  Smartphone,
  Tv,
  Laugh,
  CheckCircle2,
  Sliders,
  Download,
  Heart,
  MessageCircle,
  Share2,
  Copy,
  Check,
  Music,
  Bookmark,
  Camera,
  Image as ImageIcon
} from "lucide-react";
import { Project, ScriptSection, VisualSectionItem, TamilComedyMeme } from "@/lib/types";
import { detectTopicTheme } from "@/lib/topic-theme";
import { copyToClipboard } from "@/lib/utils";

interface VideoScene {
  id: string;
  title: string;
  spokenText: string;
  bgImage: string;
  badge: string;
  meme?: Partial<TamilComedyMeme>;
  duration: number;
}

interface BRollSuggestion {
  id: string;
  title: string;
  imageUrl: string;
  badge: string;
  prompt: string;
}

interface CasualVideoGeneratorModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

type VideoStyle = "grok" | "vlog" | "cinematic" | "meme";

export function CasualVideoGeneratorModal({
  project,
  isOpen,
  onClose
}: CasualVideoGeneratorModalProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [videoStyle, setVideoStyle] = useState<VideoStyle>("grok");
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [voiceRate, setVoiceRate] = useState<number>(1.05);
  const [likesCount, setLikesCount] = useState<number>(14820);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [customSceneImages, setCustomSceneImages] = useState<Record<number, string>>({});

  const topicTheme = detectTopicTheme(project?.topic || "");
  const category = topicTheme.category;
  const isTamilOrTanglish =
    (project?.language || "").toLowerCase().includes("tamil") ||
    (project?.language || "").toLowerCase().includes("tanglish");

  // Build scenes from the project's actual script and visual data
  const scenes: VideoScene[] = React.useMemo(() => {
    if (project?.script?.sections && project.script.sections.length > 0) {
      return project.script.sections.map((sec, idx) => {
        const visualItem = project.visuals?.items?.[idx];
        const defaultBg =
          category === "food"
            ? "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80"
            : category === "education"
            ? "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80"
            : "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80";

        return {
          id: sec.id || `scene-${idx}`,
          title: sec.title,
          spokenText: sec.spokenText,
          bgImage: customSceneImages[idx] || visualItem?.imageUrl || defaultBg,
          badge: visualItem?.videoPreviewBadge || `Scene ${idx + 1} 4K`,
          meme: visualItem?.tamilComedyMeme,
          duration: 5
        };
      });
    }

    // Dynamic Topic Fallback: Real Reviewer / Creator voiceover according to topic
    if (category === "food") {
      if (isTamilOrTanglish) {
        return [
          {
            id: "s1",
            title: "The Sizzling Food Reveal",
            spokenText: "Makkale! Innaiku namma enga vandhirukkom theriyuma? Chennai-la 40 varushama irukura iconic Ambur Star Biryani spot! Indha smell paathenee thala sutthudhu... Look at this steaming seeraga samba rice and tender mutton! Skip pannama paarunga, worth-u varma worth-u!",
            bgImage: customSceneImages[0] || "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
            badge: "Hook Shot • 4K Sizzle ASMR",
            meme: { comedian: "Vadivelu", movieRef: "Winner", iconicDialogue: "Venaam... Valikidhu... Azhudhuduven!" },
            duration: 5
          },
          {
            id: "s2",
            title: "Firewood Dum Kitchen Action",
            spokenText: "Kitchen kulla poi paatha... pure firewood dum cooking! Daily 4 hours slow cook pandraanga. Chef andha masala-va toss panna odane leapaana roaring flame paatheengala? Santhanam style-la Appadiye shock aayitten!",
            bgImage: customSceneImages[1] || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
            badge: "Kitchen Action • Roaring Wok Flames",
            meme: { comedian: "Santhanam", movieRef: "Siruthai", iconicDialogue: "Appadiye shock aayitten!" },
            duration: 5
          },
          {
            id: "s3",
            title: "Mutton Tenderness & Taste Explosion",
            spokenText: "First bite eduthom pa... Spoon vechaale mutton tender-ah butter maari odaiyudhu! Andha seeraga samba rice-oda pepper, mild cloves, and cooling curd onion raita combo bayangaramaana flavor blast! Vadivelu maari Building strong-u basement-um strong-u nu solla vaikkura taste!",
            bgImage: customSceneImages[2] || "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80",
            badge: "Taste Test • Macro Mutton Pull",
            meme: { comedian: "Vadivelu", movieRef: "Thalainagaram", iconicDialogue: "Building strong-u, basement-um strong-u!" },
            duration: 5
          },
          {
            id: "s4",
            title: "The Bill Verdict & Friend Tag CTA",
            spokenText: "Total bill just ₹240 thaan! Full unlimited feast, complete paisa vasool! Unga biryani addict friend-ah ippove comment-la tag pannunga who owes you a treat, and description-la exact Google Maps location potruken. மறக்காம Subscribe பண்ணி பெல் ஐகான் தட்டுங்க மக்களே!",
            bgImage: customSceneImages[3] || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
            badge: "Final Verdict • 5/5 Stars",
            duration: 5
          }
        ];
      }

      return [
        {
          id: "s1",
          title: "The Sizzling Food Reveal",
          spokenText: "Food lovers, today we found an incredible culinary secret! Look at this piping hot dum biryani—the aroma alone stops you in your tracks. We are testing if this 40-year-old spot lives up to the massive internet hype!",
          bgImage: customSceneImages[0] || "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
          badge: "Hook Shot • 4K Sizzle ASMR",
          duration: 5
        },
        {
          id: "s2",
          title: "Firewood Dum Kitchen Action",
          spokenText: "Stepping straight into the master kitchen—they have been slow-cooking this batch over real firewood for over four hours. The chef tosses whole spices into the sizzling wok and flames flare up immediately!",
          bgImage: customSceneImages[1] || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
          badge: "Kitchen Action • Roaring Wok Flames",
          duration: 5
        },
        {
          id: "s3",
          title: "The Taste & Texture Test",
          spokenText: "Taking the very first piping hot bite. The meat is so tender it literally shreds apart with a spoon. That subtle kick of black pepper, caramelized onions, and cooling mint raita creates a complete flavor explosion!",
          bgImage: customSceneImages[2] || "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80",
          badge: "Taste Test • Macro Mutton Pull",
          duration: 5
        },
        {
          id: "s4",
          title: "The Final Verdict & Location",
          spokenText: "The entire royal feast came out to just under $8! 100% worth every single cent. Tag your ultimate foodie partner in the comments who owes you a food hunt, and maps location is in the description below!",
          bgImage: customSceneImages[3] || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
          badge: "Final Verdict • 5/5 Stars",
          duration: 5
        }
      ];
    }

    if (category === "education") {
      return [
        {
          id: "s1",
          title: "The Study Trap (Hook)",
          spokenText: isTamilOrTanglish
            ? "Makkale! Exam season vandhaale book-ah paathu thalaiya sorithu irukkeengala? Stop highlighting 100% of your textbook right now! Nesamani maari Aani pudunga venam nu solla porom."
            : "Stop highlighting entire pages like a coloring book! In the next 60 seconds, we reveal how top students memorize 10x faster using active recall.",
          bgImage: customSceneImages[0] || "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
          badge: "Study Hook • Aesthetic Desk",
          meme: { comedian: "Vadivelu", movieRef: "Friends", iconicDialogue: "Aani pudunga venam!" },
          duration: 5
        },
        {
          id: "s2",
          title: "The Active Recall Hack",
          spokenText: isTamilOrTanglish
            ? "Try this Active Recall Feynman hack! Oru concept padicha odane book-ah close pannunga. Blank paper eduthu, oru 10-year old friend-ku explain pandra maari ezhudhi paarunga."
            : "The Feynman Technique: Close your book, take a blank sheet of paper, and explain the concept simply as if teaching a ten-year-old child. This locks 90% into long-term memory.",
          bgImage: customSceneImages[1] || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
          badge: "Feynman Demo • 1080p Whiteboard",
          duration: 5
        },
        {
          id: "s3",
          title: "Pomodoro Rhythm",
          spokenText: isTamilOrTanglish
            ? "25 minutes intense focus, 5 minutes break. Spaced repetition rhythm-la Day 1, Day 3, Day 7 review pannunga. Topper marks ungalukku guarantee!"
            : "Use the 25-minute Pomodoro rhythm. Review on Day 1, Day 3, and Day 7 to completely destroy the forgetting curve.",
          bgImage: customSceneImages[2] || "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80",
          badge: "Spaced Repetition • High Contrast",
          duration: 5
        },
        {
          id: "s4",
          title: "Outro & Free Planner",
          spokenText: isTamilOrTanglish
            ? "Free revision planner template description-la irukku, download pannikonga. மறக்காம Subscribe பண்ணி பெல் ஐகான் தட்டுங்க மக்களே! Go ace your exams!"
            : "Download the free study schedule template linked in the description below, drop a comment with your exam goal, and hit subscribe!",
          bgImage: customSceneImages[3] || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
          badge: "Study Outro • 4K",
          duration: 5
        }
      ];
    }

    // General Topic Fallback
    return [
      {
        id: "s1",
        title: "The Core Hook",
        spokenText: isTamilOrTanglish
          ? `Makkale! Innaiku namma paaka pora "${project?.topic || "Topic"}" pathi unmai enna nu paakuvom! Skip pannama full-ah paarunga!`
          : `If you're exploring "${project?.topic || "this topic"}", here is the unfiltered truth about what actually works!`,
        bgImage: customSceneImages[0] || "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
        badge: "Hook Shot • 4K",
        duration: 5
      },
      {
        id: "s2",
        title: "The Deep Breakdown",
        spokenText: isTamilOrTanglish
          ? "Namma la pala per indha mistake-ah repeat pandrom. Look at the real data on screen right now!"
          : "Most people fail because they focus on surface-level symptoms rather than the root mechanics.",
        bgImage: customSceneImages[1] || "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80",
        badge: "Deep Analysis • Macro",
        duration: 5
      },
      {
        id: "s3",
        title: "The Breakthrough",
        spokenText: isTamilOrTanglish
          ? "Idho namma key solution! Building strong-u basement-um strong-u nu solla vaikkura result!"
          : "Here is the exact framework that delivers massive clarity and immediate results.",
        bgImage: customSceneImages[2] || "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80",
        badge: "Breakthrough Demo",
        duration: 5
      },
      {
        id: "s4",
        title: "Outro & Call To Action",
        spokenText: isTamilOrTanglish
          ? "Indha breakdown useful-ah irundha share pannunga. மறக்காம Subscribe பண்ணி பெல் ஐகான் தட்டுங்க மக்களே!"
          : "Grab the complete resources linked below, drop your thoughts in the comments, and hit subscribe!",
        bgImage: customSceneImages[3] || "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80",
        badge: "Outro • 4K CTA",
        duration: 5
      }
    ];
  }, [project, category, isTamilOrTanglish, customSceneImages]);

  // Suggested B-Roll items for user to scroll and click to swap visuals
  const suggestedBRolls: BRollSuggestion[] = React.useMemo(() => {
    if (category === "food") {
      return [
        {
          id: "b1",
          title: "🔥 Slow-Mo Steaming Dum Scoop",
          imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
          badge: "120fps • Sizzle ASMR",
          prompt: "Cinematic 8K macro of steaming dum biryani with tender mutton, saffron rice, slow motion steam, studio lighting"
        },
        {
          id: "b2",
          title: "👨‍🍳 Roaring Firewood Wok Flames",
          imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
          badge: "Kitchen Action • Fire Flare",
          prompt: "Master chef tossing street food in giant flaming wok, high speed shutter, orange fire flare, 4K"
        },
        {
          id: "b3",
          title: "🥩 Tender Mutton Spoon Pull",
          imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
          badge: "Extreme Macro • 4K",
          prompt: "Extreme close up of tender slow-cooked mutton shredding with brass spoon, rich glistening gravy, food photography"
        },
        {
          id: "b4",
          title: "🥞 Crispy Ghee Roast Dosa Crunch",
          imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80",
          badge: "Crisp Audio ASMR",
          prompt: "Golden crispy ghee roast dosa breaking with audible crunch, steam rising, coconut chutney dips, 8K macro"
        },
        {
          id: "b5",
          title: "🍽️ Royal Feast Table Flatlay",
          imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
          badge: "Overhead 4K • Feast",
          prompt: "Overhead flatlay feast of South Indian biryani, brinjal dalcha, onion raita, boiled egg on fresh green banana leaf, warm restaurant ambiance"
        },
        {
          id: "b6",
          title: "🤤 Host First Bite Reaction",
          imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
          badge: "Presenter • Genuine Reaction",
          prompt: "Food reviewer expressing pure delight tasting aromatic street food, warm lighting, cinematic 50mm lens"
        }
      ];
    }

    if (category === "education") {
      return [
        {
          id: "b-edu-1",
          title: "📚 Aesthetic Study Desk & Notes",
          imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
          badge: "Top-Down Flatlay 4K",
          prompt: "Minimalist aesthetic study desk with open textbook, gel pen, iPad Pro with diagrams, warm lamp light, 8K"
        },
        {
          id: "b-edu-2",
          title: "✍️ Feynman Whiteboard Demo",
          imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
          badge: "Active Recall Demo",
          prompt: "Close up of student drawing active recall mind map diagram on glass whiteboard with markers, cinematic lighting"
        },
        {
          id: "b-edu-3",
          title: "⏱️ Pomodoro Timer & Coffee",
          imageUrl: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80",
          badge: "Focus Aesthetic",
          prompt: "Mechanical ticking focus timer beside steaming ceramic coffee mug on oak wood desk, morning sunlight"
        },
        {
          id: "b-edu-4",
          title: "📱 Digital Notion Summary",
          imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
          badge: "Digital Notes 4K",
          prompt: "Clean minimal Notion revision dashboard displaying spaced repetition calendar and toggle cards on laptop"
        }
      ];
    }

    return [
      {
        id: "b-gen-1",
        title: "💻 Studio Macro & Display",
        imageUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
        badge: "Studio 4K B-Roll",
        prompt: "Cinematic modern studio camera setup, RGB tube lighting, professional creator filming desk"
      },
      {
        id: "b-gen-2",
        title: "⚡ Dynamic Screencast & HUD",
        imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
        badge: "Cyberpunk Terminal",
        prompt: "Futuristic neon data streams, high-speed code execution and kinetic metrics reflecting on dark glass"
      },
      {
        id: "b-gen-3",
        title: "📱 Flagship Camera Shootout",
        imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80",
        badge: "Tech Review Macro",
        prompt: "Extreme close up of metallic camera lens module on sleek smartphone, studio key light reflection, 8K"
      }
    ];
  }, [category]);

  const totalDuration = scenes.length * 5;

  const currentSceneIndex = Math.min(
    Math.floor(currentTimeSec / 5),
    scenes.length - 1
  );
  const currentScene = scenes[currentSceneIndex] || scenes[0];

  // Speech Synthesis: speak current scene text aloud
  useEffect(() => {
    if (!isOpen || !isPlaying || isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentScene.spokenText);
    utterance.rate = voiceRate;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentSceneIndex, isOpen, isPlaying, isMuted, voiceRate]);

  // Main playback timer
  useEffect(() => {
    let interval: any;
    if (isOpen && isPlaying && !isGenerating) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => (prev >= totalDuration - 1 ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, isPlaying, totalDuration, isGenerating]);

  // Simulated AI Video Re-generation
  const handleRegenerateCasualVideo = () => {
    setIsGenerating(true);
    setIsPlaying(false);
    setGenerationStep("Analyzing review hooks and taste tone...");

    setTimeout(() => {
      setGenerationStep("Curating cinematic food B-roll & fire sizzle...");
    }, 600);

    setTimeout(() => {
      setGenerationStep("Syncing reviewer voiceover and kinetic subtitles...");
    }, 1200);

    setTimeout(() => {
      setIsGenerating(false);
      setCurrentTimeSec(0);
      setIsPlaying(true);
    }, 1800);
  };

  const handleApplyBRollToActiveScene = (imageUrl: string) => {
    setCustomSceneImages((prev) => ({
      ...prev,
      [currentSceneIndex]: imageUrl
    }));
  };

  const handleCopyPrompt = async (bRoll: BRollSuggestion) => {
    await copyToClipboard(bRoll.prompt);
    setCopiedPromptId(bRoll.id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  if (!isOpen) return null;

  const creatorHandle =
    category === "food"
      ? isTamilOrTanglish ? "@TamilFoodHunter" : "@StreetFoodAdventures"
      : category === "education"
      ? isTamilOrTanglish ? "@TamilStudyHacks" : "@SmartStudyHacks"
      : "@CreatorStudio";

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl my-auto rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col lg:flex-row max-h-[95dvh]">
        {/* LEFT / CENTER: The Dynamic Video Viewport & B-Roll Shelf */}
        <div className="flex-1 flex flex-col items-center justify-between bg-black/90 p-3 sm:p-5 relative overflow-y-auto">
          {/* Top Bar inside Viewport */}
          <div className="w-full flex items-center justify-between mb-2 text-white z-20">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {category === "food" ? "🍗 Food Reviewer AI Simulator" : "🎙️ AI Video Simulator"} &bull; {videoStyle.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Aspect Ratio Switcher */}
              <button
                onClick={() => setAspectRatio((prev) => (prev === "9:16" ? "16:9" : "9:16"))}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                title="Toggle Aspect Ratio (Reels 9:16 vs Landscape 16:9)"
              >
                {aspectRatio === "9:16" ? <Smartphone className="h-3.5 w-3.5 text-amber-400" /> : <Tv className="h-3.5 w-3.5 text-cyan-400" />}
                <span>{aspectRatio}</span>
              </button>

              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Video Container (Dynamic Aspect Ratio: 9:16 Reel or 16:9 Landscape) */}
          <div
            className={`relative rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-900 shadow-2xl transition-all duration-500 flex flex-col ${
              aspectRatio === "9:16"
                ? "w-full max-w-[310px] sm:max-w-[325px] aspect-[9/16] max-h-[58dvh]"
                : "w-full max-w-2xl aspect-video max-h-[55dvh]"
            }`}
          >
            {/* AI Generation Overlay State */}
            {isGenerating && (
              <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                <div>
                  <h4 className="text-sm font-bold text-white">Synthesizing Review Scenes...</h4>
                  <p className="text-xs text-primary font-mono mt-1 animate-pulse">
                    {generationStep}
                  </p>
                </div>
              </div>
            )}

            {/* Video Feed Image with Ken Burns Zoom & Style Effects */}
            <div className="relative flex-1 w-full overflow-hidden bg-zinc-950">
              <img
                src={currentScene.bgImage}
                alt={currentScene.title}
                className={`w-full h-full object-cover transition-all duration-1000 ${
                  isPlaying ? "scale-110" : "scale-100"
                } ${videoStyle === "cinematic" ? "brightness-90 contrast-125" : "brightness-100"}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/50" />

              {/* Top Scene Badge & Timeline Overlay */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                <span className="rounded-md bg-black/75 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white border border-white/20">
                  {currentScene.badge}
                </span>

                <span className="rounded-md bg-primary/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-white">
                  0:{currentTimeSec < 10 ? `0${currentTimeSec}` : currentTimeSec} / 0:{totalDuration}
                </span>
              </div>

              {/* Reel Social HUD Overlay (Right-hand action column like Instagram / TikTok) */}
              <div className="absolute right-2.5 bottom-16 z-20 flex flex-col items-center gap-3 text-white">
                <button
                  onClick={() => {
                    setIsLiked((prev) => !prev);
                    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
                  }}
                  className="flex flex-col items-center group transition-transform active:scale-125"
                  title="Like"
                >
                  <div className={`p-2 rounded-full backdrop-blur-md ${isLiked ? "bg-red-500/80 text-white" : "bg-black/60 text-white group-hover:bg-black/80"}`}>
                    <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                  </div>
                  <span className="text-[9px] font-bold mt-0.5">{likesCount.toLocaleString()}</span>
                </button>

                <div className="flex flex-col items-center">
                  <div className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-bold mt-0.5">2.4K</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-bold mt-0.5">Share</span>
                </div>
              </div>

              {/* Creator Handle & Audio Tag (Bottom-left overlay) */}
              <div className="absolute left-3 bottom-16 z-20 max-w-[70%] text-left">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="h-5 w-5 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center text-[9px] font-black text-white">
                    {category === "food" ? "🍗" : "🎙️"}
                  </span>
                  <span className="text-xs font-bold text-white drop-shadow-md">{creatorHandle}</span>
                  <span className="text-[9px] font-bold text-amber-400 bg-black/60 px-1 rounded">Follow</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-zinc-300 drop-shadow truncate">
                  <Music className="h-3 w-3 shrink-0 animate-spin" style={{ animationDuration: "4s" }} />
                  <span className="truncate">Original Audio &bull; Viral Review</span>
                </div>
              </div>

              {/* Tamil Comedy Meme Cutaway Pop-up Overlay */}
              {(videoStyle === "meme" || currentScene.meme) && currentScene.meme && (
                <div className="absolute top-10 right-2.5 z-20 animate-bounce">
                  <div className="rounded-xl border border-amber-400/40 bg-black/85 backdrop-blur-md p-1.5 text-center max-w-[130px] shadow-2xl">
                    <span className="text-[9px] font-black text-amber-400 block uppercase">
                      {currentScene.meme.comedian}
                    </span>
                    <p className="text-[9px] font-extrabold text-white leading-tight italic mt-0.5">
                      &ldquo;{currentScene.meme.iconicDialogue}&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {/* Kinetic Subtitles (Grok & Viral Reels Style with high contrast yellow/white typography) */}
              <div className="absolute inset-x-2.5 bottom-2.5 z-20 text-center">
                <div className="inline-block rounded-xl bg-black/90 backdrop-blur-md border border-white/20 px-3 py-1.5 shadow-2xl max-w-[95%]">
                  <p className="text-[11px] sm:text-xs font-black text-amber-300 uppercase tracking-wide leading-tight drop-shadow-md">
                    {currentScene.spokenText}
                  </p>
                </div>
              </div>
            </div>

            {/* Video Scrubber & Playback Controls Bar */}
            <div className="p-2.5 bg-zinc-950 border-t border-zinc-800 z-20 flex items-center justify-between gap-2.5 text-white">
              <button
                onClick={() => setIsPlaying((prev) => !prev)}
                className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white hover:scale-105 transition-transform shrink-0"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
              </button>

              <div className="flex-1 space-y-1">
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden cursor-pointer">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(currentTimeSec / totalDuration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400">
                  <span>Scene {currentSceneIndex + 1} of {scenes.length}</span>
                  <span className="truncate max-w-[130px]">{currentScene.title}</span>
                </div>
              </div>

              <button
                onClick={() => setIsMuted((prev) => !prev)}
                className="h-7 w-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0"
                title={isMuted ? "Unmute Voiceover" : "Mute Voiceover"}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5 text-red-400" /> : <Volume2 className="h-3.5 w-3.5 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* B-ROLL SUGGESTION SCROLL SHELF: Click to swap video visual in real time! */}
          <div className="w-full mt-3 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between mb-1.5 text-xs text-zinc-300">
              <span className="font-bold flex items-center gap-1.5 text-amber-400">
                <Camera className="h-3.5 w-3.5" />
                <span>Suggested B-Roll Clips & Images (Scroll & Click to Swap Active Scene)</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Scene {currentSceneIndex + 1} Active</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {suggestedBRolls.map((b) => (
                <div
                  key={b.id}
                  className="relative group shrink-0 w-36 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/60 p-1.5 text-left transition-all hover:border-amber-400/60"
                >
                  <div className="relative h-16 w-full rounded-lg overflow-hidden bg-zinc-950 mb-1">
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/80 px-1 py-0.5 text-[8px] font-bold text-amber-300">
                      {b.badge}
                    </span>
                  </div>

                  <p className="text-[10px] font-bold text-white truncate">{b.title}</p>

                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={() => handleApplyBRollToActiveScene(b.imageUrl)}
                      className="flex-1 rounded-md bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 py-0.5 text-[9px] font-bold text-center transition-colors"
                      title="Apply this B-roll to currently playing scene"
                    >
                      Apply Visual
                    </button>

                    <button
                      onClick={() => handleCopyPrompt(b)}
                      className="rounded-md bg-zinc-800 hover:bg-zinc-700 p-1 text-zinc-300 transition-colors"
                      title="Copy Midjourney/Grok AI Prompt"
                    >
                      {copiedPromptId === b.id ? (
                        <Check className="h-2.5 w-2.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-2.5 w-2.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT / SIDEBAR: AI Studio Controls & Reviewer Settings */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-950 p-4 space-y-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Reviewer Video Controls</span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Simulates casual creator review video with continuous voiceover & B-roll cutaways.
              </p>
            </div>

            {/* Reviewer Voice Speed Selector */}
            <div className="space-y-1.5 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
              <label className="text-[11px] font-semibold text-zinc-300 flex items-center justify-between">
                <span>Voiceover Pacing</span>
                <span className="text-amber-400 font-mono text-[10px]">{voiceRate}x</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setVoiceRate(0.9)}
                  className={`py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    voiceRate === 0.9 ? "bg-primary text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  0.9x Relaxed
                </button>
                <button
                  onClick={() => setVoiceRate(1.05)}
                  className={`py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    voiceRate === 1.05 ? "bg-primary text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  1.05x Normal
                </button>
                <button
                  onClick={() => setVoiceRate(1.2)}
                  className={`py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    voiceRate === 1.2 ? "bg-primary text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  1.2x Gen-Z Fast
                </button>
              </div>
            </div>

            {/* Video Style Switcher */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-300 block">AI Visual Style</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setVideoStyle("grok")}
                  className={`p-2 rounded-xl border text-left text-xs transition-all ${
                    videoStyle === "grok"
                      ? "border-primary bg-primary/10 text-white font-bold"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="block font-bold text-primary text-[11px]">⚡ Grok AI Short</span>
                  <span className="text-[9px] text-zinc-400">Kinetic & Punchy</span>
                </button>

                <button
                  onClick={() => setVideoStyle("vlog")}
                  className={`p-2 rounded-xl border text-left text-xs transition-all ${
                    videoStyle === "vlog"
                      ? "border-amber-500 bg-amber-500/10 text-white font-bold"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="block font-bold text-amber-400 text-[11px]">🎙️ Casual Vlog</span>
                  <span className="text-[9px] text-zinc-400">Natural Foodie</span>
                </button>

                <button
                  onClick={() => setVideoStyle("cinematic")}
                  className={`p-2 rounded-xl border text-left text-xs transition-all ${
                    videoStyle === "cinematic"
                      ? "border-cyan-500 bg-cyan-500/10 text-white font-bold"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="block font-bold text-cyan-400 text-[11px]">🎬 4K Cinema</span>
                  <span className="text-[9px] text-zinc-400">Letterbox & Warm</span>
                </button>

                <button
                  onClick={() => setVideoStyle("meme")}
                  className={`p-2 rounded-xl border text-left text-xs transition-all ${
                    videoStyle === "meme"
                      ? "border-pink-500 bg-pink-500/10 text-white font-bold"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="block font-bold text-pink-400 text-[11px]">🎭 Tamil Meme Cut</span>
                  <span className="text-[9px] text-zinc-400">Vadivelu Popups</span>
                </button>
              </div>
            </div>

            {/* Scene Rundown List */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-300 block">Reviewer Beats ({scenes.length})</label>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {scenes.map((sc, i) => (
                  <button
                    key={sc.id}
                    onClick={() => {
                      setCurrentTimeSec(i * 5);
                      setIsPlaying(true);
                    }}
                    className={`w-full p-1.5 rounded-lg text-left text-[11px] flex items-center justify-between border transition-all ${
                      currentSceneIndex === i
                        ? "border-primary bg-primary/20 text-white font-bold"
                        : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-zinc-800 text-[9px] font-bold">
                        {i + 1}
                      </span>
                      <span className="truncate">{sc.title}</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono">0:{i * 5}s</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <button
              onClick={handleRegenerateCasualVideo}
              disabled={isGenerating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Regenerate Review Pacing ⚡</span>
            </button>

            <button
              onClick={onClose}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Close Simulator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
