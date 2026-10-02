const sampleCreators = [
  {
    id: "creator_alex_rivera",
    name: "Alex Rivera",
    niche: "Tech, Productivity & Remote Work",
    bio: "Tech reviewer, workflow architect, and software engineer sharing high-leverage digital tools, setup aesthetics, and desk workflows.",
    platforms: [
      { platform: "YouTube", handle: "@alexriveratech", followers: "95,000", url: "https://youtube.com/@alexriveratech" },
      { platform: "Instagram", handle: "@alexrivera.tech", followers: "38,000", url: "https://instagram.com/alexrivera.tech" },
      { platform: "TikTok", handle: "@alexriveratech", followers: "52,000", url: "https://tiktok.com/@alexriveratech" },
      { platform: "Newsletter", handle: "The High-Leverage Desk", followers: "14,500", url: "https://alexrivera.substack.com" }
    ],
    metrics: {
      totalReach: "199,500",
      avgEngagementRate: "4.8%",
      avgYoutubeViews: "24,000",
      avgReelViews: "65,000",
      newsletterOpenRate: "47.2%"
    },
    demographics: {
      ageSplit: "18-24 (28%), 25-34 (54%), 35-44 (15%), 45+ (3%)",
      genderSplit: "64% Male, 33% Female, 3% Non-binary",
      topLocations: "United States (58%), United Kingdom (14%), Canada (9%), Germany (6%), Australia (5%)",
      coreAudience: "Software engineers, tech product managers, college students, remote knowledge workers, and startup founders."
    },
    contentStyle: "Clean, cinematic minimal aesthetics with high-signal, zero-fluff screen tutorials, side-by-side gear comparisons, and workflow teardowns.",
    pastBrands: "Logitech, Keychron, CleanShot X, Raycast, Linear, Loom, Setapp",
    notableWins: [
      "Generated 3,200+ paid trial conversions for Raycast productivity suite in Q4 2025.",
      "Dedicated YouTube desk tour video reached 185k organic views with a 6.4% click-through rate.",
      "Consistently ranks in top 5% engagement benchmarks for consumer productivity creators."
    ],
    rateCard: {
      dedicatedYoutube: 2400,
      integratedYoutube: 1200,
      dedicatedReelTiktok: 950,
      reelStoryBundle: 1250,
      newsletterSponsorship: 750,
      thirtyDayUsageRights: 400
    },
    contactInfo: {
      email: "collabs@alexrivera.tech",
      website: "https://alexrivera.tech",
      mediaKitUrl: "https://alexrivera.tech/mediakit",
      preferredContact: "collabs@alexrivera.tech"
    }
  },
  {
    id: "creator_maya_chen",
    name: "Maya Chen",
    niche: "Mindful Living, Sustainable Wellness & Everyday Habits",
    bio: "Holistic wellness advocate, daily morning routine creator, and plant-based nutrition enthusiast inspiring 100k+ individuals to slow down and live intentionally.",
    platforms: [
      { platform: "Instagram", handle: "@mayachenwellness", followers: "68,000", url: "https://instagram.com/mayachenwellness" },
      { platform: "TikTok", handle: "@mayachenwell", followers: "84,000", url: "https://tiktok.com/@mayachenwell" },
      { platform: "YouTube", handle: "@mayachenmindful", followers: "32,000", url: "https://youtube.com/@mayachenmindful" }
    ],
    metrics: {
      totalReach: "184,000",
      avgEngagementRate: "6.2%",
      avgYoutubeViews: "18,500",
      avgReelViews: "78,000",
      newsletterOpenRate: ""
    },
    demographics: {
      ageSplit: "18-24 (32%), 25-34 (48%), 35-44 (16%), 45+ (4%)",
      genderSplit: "78% Female, 19% Male, 3% Non-binary",
      topLocations: "United States (62%), Canada (16%), UK (11%), Australia (6%)",
      coreAudience: "Urban professionals, wellness enthusiasts, mindful mothers, and sustainable lifestyle seekers looking for authentic wellness routines."
    },
    contentStyle: "Warm, aesthetic natural lighting, soothing voiceover storytelling, honest reviews, and step-by-step mindful daily practices.",
    pastBrands: "Athletic Greens, Hatch Restore, Ritual Vitamins, Lululemon, Seed Probiotics",
    notableWins: [
      "Over $42,000 tracked affiliate GMV driven for Seed Probiotics across two dedicated reels.",
      "Maintains a 6.2% average engagement rate (more than 2.5x the wellness industry average of 2.1%).",
      "91% repeat sponsor retention rate over the last 18 months."
    ],
    rateCard: {
      dedicatedYoutube: 1800,
      integratedYoutube: 900,
      dedicatedReelTiktok: 1100,
      reelStoryBundle: 1400,
      newsletterSponsorship: 0,
      thirtyDayUsageRights: 450
    },
    contactInfo: {
      email: "partnerships@mayachen.co",
      website: "https://mayachenwellness.com",
      mediaKitUrl: "https://mayachenwellness.com/deck",
      preferredContact: "partnerships@mayachen.co"
    }
  }
];

const sampleBrands = [
  {
    brandName: "Notion",
    websiteUrl: "https://notion.so",
    industry: "Productivity Software / SaaS",
    productCampaign: "Notion Projects & Notion AI for Creators & Freelancers",
    targetAudience: "Knowledge workers, freelancers, creative entrepreneurs, and agile teams wanting to centralize docs, tasks, and project roadmaps.",
    brandToneValues: "Minimalist, empowering, playful yet productive, intellectual, streamlined.",
    campaignGoals: ["Conversions / Signups", "Product Awareness", "UGC / Tutorial Content"],
    notes: "Highlight how Notion replaces 5 fragmented apps with one cohesive workspace. Emphasize Notion AI for auto-summarizing meeting notes and organizing project roadmaps."
  },
  {
    brandName: "Athletic Greens (AG1)",
    websiteUrl: "https://drinkag1.com",
    industry: "Health, Nutrition & Wellness Supplements",
    productCampaign: "AG1 Morning Habit Kickstart & Travel Packs",
    targetAudience: "Health-conscious adults (ages 22-45), busy professionals, athletes, and wellness seekers seeking foundational daily nutrition without swallowing 12 pill bottles.",
    brandToneValues: "Science-backed, premium, holistic, authentic, high-vitality.",
    campaignGoals: ["Sales / Subscriptions", "Brand Awareness", "Educational Storytelling"],
    notes: "Focus on the daily routine habit loop: 1 scoop, cold water, morning sunlight. Mention the 75 high-quality vitamins, minerals, and whole-food sourced nutrients. Special creator link offer."
  },
  {
    brandName: "NordVPN",
    websiteUrl: "https://nordvpn.com",
    industry: "Cybersecurity & Digital Privacy",
    productCampaign: "Threat Protection Pro & Multi-Device Digital Privacy",
    targetAudience: "Digital nomads, remote workers, travelers using public Wi-Fi, and security-minded tech consumers.",
    brandToneValues: "Reliable, robust, reassuring, tech-savvy, accessible.",
    campaignGoals: ["Conversions / Sales", "Brand Awareness"],
    notes: "Demonstrate real-world utility: working safely from public coffee shops, blocking intrusive malware ads, and accessing region-free streaming."
  }
];

module.exports = {
  sampleCreators,
  sampleBrands
};
