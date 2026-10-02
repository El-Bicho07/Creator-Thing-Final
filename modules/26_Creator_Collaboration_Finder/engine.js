import { getCategoryAdjacency, getFormatCompatibility } from './data.js';

function getJaccard(setA, setB) {
  if (setA.length === 0 && setB.length === 0) return 0;
  const a = new Set(setA.map(t => t.toLowerCase()));
  const b = new Set(setB.map(t => t.toLowerCase()));
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

const objectiveStrengths = {
  "Joint research paper/repo": ["Analytical rigor", "Deep technical authority", "Thorough research", "High-value insights"],
  "Skill trade/co-production": ["High production value", "Exceptional storytelling", "Strong visual identity", "Emotional resonance", "Aesthetic appeal"],
  "Audience cross-pollination": ["High reach", "Massive reach", "Loyal listener base", "Highly engaged niche audience"],
  "Guest appearance": ["Authenticity", "Clear communication", "Entertaining presentation", "Highly interactive community", "Actionable content"]
};

export function scoreMatch(user, creator) {
  // Category adjacency (40%)
  const catAdjacency = getCategoryAdjacency(user.discipline, creator.discipline);
  
  // Audience symmetry (25%)
  let audSymmetry = 0;
  if (user.audience && creator.audience) {
    const minAud = Math.min(user.audience, creator.audience);
    const maxAud = Math.max(user.audience, creator.audience);
    const ratio = minAud / maxAud;
    audSymmetry = Math.sqrt(ratio);
  }
  if (user.objective === "Skill trade/co-production" || user.objective === "Guest appearance") {
    audSymmetry = Math.max(audSymmetry, 0.7);
  }

  // Format compatibility (20%)
  // User format derived from platform or assumed written for simplicity if not in intake
  // Let's map user platform to a rough format
  const platformFormat = {
    "YouTube": "video",
    "Substack": "written",
    "Podcast": "audio",
    "GitHub": "code",
    "Instagram": "visual"
  };
  const userFormat = platformFormat[user.platform] || "written";
  const formatCompat = getFormatCompatibility(userFormat, creator.formatStyle);

  // Shared intersections (10%)
  const sharedIntersections = getJaccard(user.secondaryTags || [], creator.secondaryTags || []);

  // Objective fit (5%)
  let objFit = 0.5; // baseline
  const targetStrengths = objectiveStrengths[user.objective] || [];
  const matches = creator.strengths.filter(s => targetStrengths.includes(s)).length;
  if (matches > 0) objFit = 0.8 + (0.1 * matches);

  const total = (catAdjacency * 0.4) + (audSymmetry * 0.25) + (formatCompat * 0.2) + (sharedIntersections * 0.1) + (objFit * 0.05);
  
  return {
    total: Math.round(total * 100),
    catAdjacency: Math.round(catAdjacency * 100),
    audSymmetry: Math.round(audSymmetry * 100),
    formatCompat: Math.round(formatCompat * 100),
    sharedIntersections: Math.round(sharedIntersections * 100)
  };
}

export function generateBreakdownText(user, creator, scores) {
  return {
    audienceOverlap: `Your audiences share a ${scores.audSymmetry}% symmetry profile. Given your respective sizes, cross-promotion could yield meaningful conversion without feeling unbalanced.`,
    friction: creator.caveat ? `Caveat: ${creator.caveat}` : `No major friction points identified for this pairing.`,
    pastFormats: `Similar past formats include: ${creator.trackRecord || "A typical structured collaboration blending your respective core disciplines."}`
  };
}

export function generateIdeas(user, creator) {
  const scope1 = "12-16 hours total";
  const split1 = `You: Content framing / Them: Production`;
  
  const scope2 = "4-8 hours total";
  const split2 = `You: Technical asset / Them: Distribution`;
  
  const scope3 = "2-3 hours total";
  const split3 = `You: Live interaction / Them: Hosting & moderation`;

  return [
    { title: "Co-produced Media Piece", scope: scope1, split: split1, id: "idea-1" },
    { title: "Technical/Creative Asset", scope: scope2, split: split2, id: "idea-2" },
    { title: "Live Synchronous Session", scope: scope3, split: split3, id: "idea-3" }
  ];
}

export function generatePitch(user, creator, tone, idea) {
  const t = tone === "Casual DM";
  
  let p1 = t 
    ? `Hey ${creator.name.split(' ')[0]}, been following your work on ${creator.platform} for a bit. Your approach to ${creator.secondaryTags[0] || creator.discipline.toLowerCase()} really resonates with what I'm building.`
    : `Hi ${creator.name}, I am reaching out because I admire your work in ${creator.discipline}, particularly your focus on ${creator.secondaryTags[0] || 'your core topics'}. Our audiences share a strong alignment.`;
    
  let p2 = t
    ? `I had an idea for a ${idea.title.toLowerCase()}. The scope is about ${idea.scope}. Thinking we could split it: ${idea.split}. It aligns well with my current focus on ${user.secondaryTags[0] || user.discipline.toLowerCase()}.`
    : `I am proposing a collaboration on a ${idea.title.toLowerCase()}. We estimate the production scope at ${idea.scope}, divided as follows: ${idea.split}. This leverages both of our strengths effectively.`;
    
  let p3 = t
    ? `Let me know if you'd be open to a quick chat next week to see if there's a fit.`
    : `Please let me know if you have bandwidth to discuss this further. I am available for a brief call next week to explore the details.`;

  return `${p1}\n\n${p2}\n\n${p3}`;
}
