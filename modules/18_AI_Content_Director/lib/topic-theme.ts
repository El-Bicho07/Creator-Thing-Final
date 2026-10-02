import { TopicCategory } from "./types";

export interface TopicThemeConfig {
  category: TopicCategory;
  name: string;
  badge: string;
  glowColor: string;
  accentGradient: string;
  emojis: string[];
  bannerEmoji: string;
  description: string;
}

export function detectTopicTheme(topic: string = ""): TopicThemeConfig {
  const lower = topic.toLowerCase();

  // 1. Food & Cooking
  if (
    lower.includes("food") ||
    lower.includes("biryani") ||
    lower.includes("restaurant") ||
    lower.includes("dosa") ||
    lower.includes("burger") ||
    lower.includes("pizza") ||
    lower.includes("cafe") ||
    lower.includes("cooking") ||
    lower.includes("eat") ||
    lower.includes("chef") ||
    lower.includes("street food") ||
    lower.includes("recipe") ||
    lower.includes("snack") ||
    lower.includes("sweet") ||
    lower.includes("dining") ||
    lower.includes("taste")
  ) {
    return {
      category: "food",
      name: "Food & Culinary Review",
      badge: "border-amber-500/40 text-amber-500 bg-amber-500/10",
      glowColor: "bg-amber-500/20",
      accentGradient: "from-amber-500/15 via-orange-500/10 to-red-500/5",
      emojis: ["🍔", "🍕", "🍜", "🍗", "🌶️", "🍰", "🍱", "🥑", "🥘", "🌮", "🍩", "☕", "🍲", "🥩", "🧁"],
      bannerEmoji: "🍔 🍜 🍗",
      description: "Sizzling culinary visuals, mouth-watering macro B-roll, and taste reaction hooks"
    };
  }

  // 2. Education, Study & Notebook
  if (
    lower.includes("study") ||
    lower.includes("exam") ||
    lower.includes("book") ||
    lower.includes("notebook") ||
    lower.includes("pen") ||
    lower.includes("laptop") ||
    lower.includes("tips") ||
    lower.includes("student") ||
    lower.includes("school") ||
    lower.includes("college") ||
    lower.includes("learn") ||
    lower.includes("education") ||
    lower.includes("notes") ||
    lower.includes("productivity") ||
    lower.includes("guide") ||
    lower.includes("memory")
  ) {
    return {
      category: "education",
      name: "Education, Study & Notebook",
      badge: "border-blue-500/40 text-blue-400 bg-blue-500/10",
      glowColor: "bg-blue-500/20",
      accentGradient: "from-blue-500/15 via-cyan-500/10 to-emerald-500/5",
      emojis: ["📚", "✍️", "💻", "📝", "🎓", "📖", "💡", "🎒", "⏱️", "✏️", "🧠", "📌", "📑", "🔬", "📐"],
      bannerEmoji: "📚 ✍️ 💻",
      description: "High-focus study aesthetic, kinetic diagrams, digital notebook notes & scholarly clarity"
    };
  }

  // 3. Tech, Coding & AI
  if (
    lower.includes("tech") ||
    lower.includes("coding") ||
    lower.includes("code") ||
    lower.includes("ai") ||
    lower.includes("software") ||
    lower.includes("developer") ||
    lower.includes("programming") ||
    lower.includes("app") ||
    lower.includes("python") ||
    lower.includes("javascript") ||
    lower.includes("computer") ||
    lower.includes("gadget") ||
    lower.includes("phone") ||
    lower.includes("mobile") ||
    lower.includes("apple") ||
    lower.includes("android") ||
    lower.includes("hardware")
  ) {
    return {
      category: "tech",
      name: "Tech, AI & Developer Studio",
      badge: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
      glowColor: "bg-cyan-500/20",
      accentGradient: "from-cyan-500/15 via-indigo-500/10 to-purple-500/5",
      emojis: ["💻", "🤖", "⚡", "📱", "🧠", "💾", "⌨️", "🚀", "🌐", "🖥️", "📡", "⚙️", "🔌", "🕹️", "📟"],
      bannerEmoji: "💻 🤖 ⚡",
      description: "Cyberpunk HUD overlays, kinetic terminal screencasts, and futuristic high-tech B-roll"
    };
  }

  // 4. Fitness & Health
  if (
    lower.includes("fitness") ||
    lower.includes("gym") ||
    lower.includes("workout") ||
    lower.includes("health") ||
    lower.includes("exercise") ||
    lower.includes("diet") ||
    lower.includes("muscle") ||
    lower.includes("weight") ||
    lower.includes("training") ||
    lower.includes("running") ||
    lower.includes("yoga") ||
    lower.includes("body")
  ) {
    return {
      category: "fitness",
      name: "Peak Fitness & High Energy",
      badge: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
      glowColor: "bg-emerald-500/20",
      accentGradient: "from-emerald-500/15 via-lime-500/10 to-teal-500/5",
      emojis: ["🏋️", "🥦", "🏃", "🥗", "🥑", "💧", "🧘", "🥇", "🍏", "⚡", "🥊", "🍎", "🚴", "🏆", "💪"],
      bannerEmoji: "🏋️ 🥦 🏃",
      description: "High-octane gym motivation, heart-rate pacing, macro meal prep & explosive form cues"
    };
  }

  // 5. Finance & Business
  if (
    lower.includes("money") ||
    lower.includes("finance") ||
    lower.includes("invest") ||
    lower.includes("stock") ||
    lower.includes("trading") ||
    lower.includes("crypto") ||
    lower.includes("bitcoin") ||
    lower.includes("wealth") ||
    lower.includes("business") ||
    lower.includes("cash") ||
    lower.includes("dollar") ||
    lower.includes("rupee") ||
    lower.includes("profit") ||
    lower.includes("passive income")
  ) {
    return {
      category: "finance",
      name: "Wealth & Finance Strategy",
      badge: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
      glowColor: "bg-emerald-500/20",
      accentGradient: "from-emerald-500/15 via-amber-500/10 to-emerald-500/5",
      emojis: ["💰", "📈", "💳", "💵", "🪙", "🏦", "📊", "💎", "📉", "🤑", "🏷️", "💼", "🏧", "🧾", "💸"],
      bannerEmoji: "💰 📈 💵",
      description: "Sharp data charts, compound interest breakdowns, Wall Street aesthetics & wealth psychology"
    };
  }

  // 6. Cinema & Entertainment
  if (
    lower.includes("cinema") ||
    lower.includes("movie") ||
    lower.includes("film") ||
    lower.includes("comedy") ||
    lower.includes("vadivelu") ||
    lower.includes("santhanam") ||
    lower.includes("actor") ||
    lower.includes("entertainment") ||
    lower.includes("review") ||
    lower.includes("theatre") ||
    lower.includes("dance") ||
    lower.includes("song") ||
    lower.includes("trailer")
  ) {
    return {
      category: "entertainment",
      name: "Cinema & Entertainment Studio",
      badge: "border-purple-500/40 text-purple-400 bg-purple-500/10",
      glowColor: "bg-purple-500/20",
      accentGradient: "from-purple-500/15 via-pink-500/10 to-amber-500/5",
      emojis: ["🎬", "🍿", "🎥", "🎭", "🎟️", "🌟", "🎸", "🎙️", "📺", "📽️", "🕶️", "🏆", "🕺", "🎪", "🎧"],
      bannerEmoji: "🎬 🍿 🎭",
      description: "Filmmaking clapperboards, theatrical lighting, iconic comic cutaways & popcorn entertainment"
    };
  }

  // 7. Travel & Tourism
  if (
    lower.includes("travel") ||
    lower.includes("trip") ||
    lower.includes("hotel") ||
    lower.includes("flight") ||
    lower.includes("tourism") ||
    lower.includes("beach") ||
    lower.includes("mountain") ||
    lower.includes("vacation") ||
    lower.includes("resort") ||
    lower.includes("explore")
  ) {
    return {
      category: "travel",
      name: "Wanderlust & Travel Adventure",
      badge: "border-sky-500/40 text-sky-400 bg-sky-500/10",
      glowColor: "bg-sky-500/20",
      accentGradient: "from-sky-500/15 via-teal-500/10 to-amber-500/5",
      emojis: ["✈️", "🏖️", "📸", "🌴", "🎒", "🗺️", "🚗", "🏨", "🌅", "🧳", "🧭", "⛵", "🏕️", "🚂", "🏝️"],
      bannerEmoji: "✈️ 🏖️ 🌴",
      description: "Golden hour vistas, drone coastline sweeps, passport stamps & cinematic wanderlust"
    };
  }

  // 8. Fashion & Glamour
  if (
    lower.includes("fashion") ||
    lower.includes("beauty") ||
    lower.includes("makeup") ||
    lower.includes("skincare") ||
    lower.includes("style") ||
    lower.includes("outfit") ||
    lower.includes("clothes") ||
    lower.includes("dress") ||
    lower.includes("model")
  ) {
    return {
      category: "fashion",
      name: "Haute Couture & Glamour",
      badge: "border-pink-500/40 text-pink-400 bg-pink-500/10",
      glowColor: "bg-pink-500/20",
      accentGradient: "from-pink-500/15 via-rose-500/10 to-purple-500/5",
      emojis: ["👗", "💄", "👠", "🕶️", "🛍️", "✨", "💍", "💅", "🌸", "📸", "🎀", "👛", "🪞", "👑", "👢"],
      bannerEmoji: "👗 ✨ 💄",
      description: "High-contrast editorial lighting, fabric macro textures & runway-inspired visual flair"
    };
  }

  // Default General Creator Studio
  return {
    category: "general",
    name: "AI Content Creator Studio",
    badge: "border-primary/40 text-primary bg-primary/10",
    glowColor: "bg-primary/20",
    accentGradient: "from-primary/15 via-indigo-500/10 to-purple-500/5",
    emojis: ["⚡", "💡", "🚀", "🎯", "🔥", "✨", "🎬", "🌟", "📈", "🧠", "🎥", "🎙️"],
    bannerEmoji: "🚀 🔥 💡",
    description: "Multi-platform algorithm optimization, psychological retention hooks & studio production"
  };
}
