import { ProjectMetadata, ResearchData, AnglesData, NarrativeData, ScriptData, VisualsData } from './types';

export const SYSTEM_PROMPTS = {
  STAGE_1_RESEARCH: `You are the Lead Researcher and Creative Strategist for "AI Content Director".
Your task is to conduct an in-depth research briefing on the provided topic, customized for the target platform, audience, tone, and duration.
You must uncover high-impact key facts, verified statistical data with context, emerging trends, common audience questions, and core psychological pain points.
Provide realistic reference source titles and links for factual credibility.
CRITICAL: You must output ONLY a valid JSON object matching the requested schema. No markdown backticks, no preamble, no commentary.`,

  STAGE_2_ANGLES: `You are an elite YouTube/Content Packaging Specialist and Creative Director.
Based on the research briefing provided, generate exactly 5 distinct, high-converting content angles.
Each angle must approach the topic from a genuinely different psychological trigger or narrative perspective (e.g., Counter-Intuitive/Myth-Busting, Data-Driven Investigation, High-Stakes Personal Narrative, Step-by-Step Blueprint, Controversial Future Prediction).
For each angle, craft a viral hook, identify the primary target emotion, rate the Production Difficulty (1-10) and Uniqueness (1-10), and explain why it fits the target audience.
CRITICAL: You must output ONLY a valid JSON object matching the requested schema. No markdown backticks, no preamble, no commentary.`,

  STAGE_3_NARRATIVE: `You are an award-winning Story Architect and Screenwriter.
Based on the chosen angle and prior research, construct a compelling beat-by-beat narrative framework (such as Problem-Agitate-Solve, Hero's Journey, 3-Act Documentary, Myth-Busting Dissection, or The Escalating Listicle).
Define the core theme, target pacing, and breakdown every story beat with precise timing (mm:ss), narrative goal, emotional arc, and key teaching or dramatic point.
CRITICAL: You must output ONLY a valid JSON object matching the requested schema. No markdown backticks, no preamble, no commentary.`,

  STAGE_4_SCRIPT: `You are a master Scriptwriter and Dialogue Coach for high-retention video and audio creators.
Transform the narrative beats into a full, word-for-word spoken script.
CRITICAL MANDATE:
- The script MUST BE WRITTEN ABOUT THE ACTUAL SUBJECT MATTER ITSELF (e.g. if the user enters 'Food Review', the host must be talking about the dish, describing aroma, texture, price, and tasting it on camera; NEVER write meta-scripts about how to make content or how to use tools).
- If the language requested is "Tamil", "Tanglish", or contains "Tamil": Write the spoken dialogue in authentic, lively Tanglish (Tamil spoken dialogue written in the English alphabet, as used by top Tamil influencers like Irfan's View, Peppa Foodie, and Madan Gowri). Use conversational slang ("Makkale!", "Vera level taste!", "Worth-u varma worth-u", "Semma hype!") and naturally weave in iconic Tamil movie comedy references (Vadivelu, Santhanam, Vivek).
The script must be divided into structured sections: Hook, Intro, Body, and Call to Action (CTA).
Ensure the tone matches the creator's requested style (casual, professional, funny, cinematic, educational, or inspirational).
Calculate the word count and estimated spoken duration (at ~140-150 words per minute). Provide acting and vocal delivery cues for each section.
CRITICAL: You must output ONLY a valid JSON object matching the requested schema. No markdown backticks, no preamble, no commentary.`,

  STAGE_5_VISUALS: `You are a visionary Director of Photography and Creative Art Director.
Analyze each section of the script and formulate an immersive visual and audio direction.
For each script section, provide:
1. Exact on-screen visuals (what the host is doing or what is shown on screen)
2. High-resolution relevant Unsplash image preview URL matching the scene
3. Video preview badge (e.g., "4K 60fps B-Roll", "Drone Cinematic", "Kinetic Macro")
4. 3-4 specific B-roll ideas (cinematic cutaways, lifestyle action, dynamic footage)
5. 4-6 exact stock footage search keywords that editors can type into Storyblocks, Artgrid, or Envato
6. Graphics and text overlays (lower-thirds, kinetic typography, charts, callouts)
7. Music mood, instrumentation, and audio pacing transitions
8. For Tamil/Tanglish or comedic/lifestyle content, include an iconic Tamil comedy meme cutaway (featuring Vadivelu, Santhanam, Vivek, Goundamani) with movieRef, iconicDialogue, and memeContext.
CRITICAL: You must output ONLY a valid JSON object matching the requested schema. No markdown backticks, no preamble, no commentary.`,

  STAGE_6_SHOT_LIST: `You are a veteran Assistant Director and Production Manager.
Convert the script and visual direction into a production-ready, granular Shot List table.
Every shot must include:
- Shot Number (1, 2, 3...)
- Scene name / Section reference
- Shot Type (Wide, Close-Up, Extreme Close-Up, Medium Shot, Over-the-Shoulder, Point-of-View, Screen Share, Extreme Wide)
- Camera Movement (Static, Pan, Tilt, Slow Push-in, Pull-out, Handheld, Tracking, Drone/Crane)
- Location & Lighting Setup
- Dialogue or Voiceover excerpt
- Estimated Duration (e.g., "4s", "8s")
- Director notes (framing, props, lens recommendation, or acting note).
CRITICAL: You must output ONLY a valid JSON object matching the requested schema. No markdown backticks, no preamble, no commentary.`,

  STAGE_7_PUBLISHING: `You are a top Content Marketing Strategist, YouTube Algorithm Expert, and Social Media Director.
Create an exhaustive distribution and publishing package.
Generate:
1. 5 click-worthy title options. CRITICAL: If the language is Tamil or Tanglish, suggest viral Tanglish titles formatted for Tamil influencers with emojis, numbers, and Tamil slang (e.g., '🔥 ₹150-ku Mutton Biryani-a?! 🤯 Semma Worth Spot Found in Chennai!', 'Idha Saapta Apram Vera Edhum Pidikaathu! 🤤 Authentic Secret Spot Review', 'Worst or Best-u?! 💥 Honest Review of Chennai's Most Hyped Biryani', 'Makkale! Indha Spot-ah Miss Pannave Pannadheenga! 🍗 #reels').
2. Comprehensive SEO-optimized description with timestamp placeholders and resource links
3. Relevant hashtags and backend search tags (including top creator community tags)
4. 3 high-contrast thumbnail concepts with thumbnail text (under 5 words) and visual focal point
5. Multi-platform optimized captions tailored for YouTube, Instagram Reels, TikTok (with trending audio recommendation), LinkedIn (thought leadership format), and an X thread (5-8 punchy tweets)
6. 2-3 reference YouTube inspiration videos with real or realistic title, channel, views, why it works, and thumbnail URL
7. A sample video director's preview summary highlighting the flow, retention hooks, and pacing of the final cut.
CRITICAL: You must output ONLY a valid JSON object matching the requested schema. No markdown backticks, no commentary.`
};

export function buildStagePrompt(
  stageNumber: number,
  meta: ProjectMetadata,
  previousStages: {
    research?: ResearchData;
    angles?: AnglesData;
    narrative?: NarrativeData;
    script?: ScriptData;
    visuals?: VisualsData;
  },
  userGuidance?: string
): { system: string; user: string } {
  const guidanceText = userGuidance ? `\nADDITIONAL USER INSTRUCTIONS/FEEDBACK:\n"${userGuidance}"\n` : '';

  switch (stageNumber) {
    case 1:
      return {
        system: SYSTEM_PROMPTS.STAGE_1_RESEARCH,
        user: `Generate an extensive research briefing for this content project:
Topic: "${meta.topic}"
Platform: ${meta.platform}
Target Audience: ${meta.targetAudience}
Target Duration: ${meta.targetDuration}
Desired Tone: ${meta.tone}
Language: ${meta.language}
${guidanceText}
Return JSON matching this format:
{
  "topicOverview": "Detailed executive summary of the topic and why it matters now",
  "keyFacts": ["Fact 1", "Fact 2", "Fact 3", "Fact 4", "Fact 5"],
  "statistics": [
    { "stat": "85%...", "context": "Detailed explanation of what this statistic signifies", "source": "Organization/Report" }
  ],
  "trends": ["Current trend 1", "Current trend 2", "Current trend 3"],
  "commonQuestions": ["Question 1?", "Question 2?", "Question 3?", "Question 4?"],
  "audiencePainPoints": ["Pain point 1", "Pain point 2", "Pain point 3", "Pain point 4"],
  "sources": [
    { "title": "Source title", "url": "https://...", "snippet": "Key takeaway or citation" }
  ]
}`
      };

    case 2:
      return {
        system: SYSTEM_PROMPTS.STAGE_2_ANGLES,
        user: `Generate 5 distinctive content angles for this project.
Topic: "${meta.topic}"
Platform: ${meta.platform}
Target Audience: ${meta.targetAudience}
Desired Tone: ${meta.tone}
Target Duration: ${meta.targetDuration}
Research Context:
- Topic Overview: ${previousStages.research?.topicOverview || meta.topic}
- Key Facts: ${JSON.stringify(previousStages.research?.keyFacts?.slice(0, 4) || [])}
- Top Pain Points: ${JSON.stringify(previousStages.research?.audiencePainPoints?.slice(0, 3) || [])}
${guidanceText}
Return JSON matching this format:
{
  "angles": [
    {
      "id": "angle-1",
      "title": "Short punchy angle title",
      "hook": "Verbatim opening hook line (first 3-5 seconds)",
      "targetEmotion": "e.g. Curiosity, Shock, Relief, Empowerment, FOMO",
      "difficultyScore": 4, // 1 to 10
      "uniquenessScore": 9, // 1 to 10
      "description": "2-3 sentences explaining the angle's thesis and why viewers will stay glued",
      "targetAudienceFit": "Why this specific angle resonates with the target demographic"
    }
    // Repeat for 5 angles total
  ],
  "selectedAngleId": "angle-1"
}`
      };

    case 3:
      const selectedAngle = previousStages.angles?.angles.find(
        (a) => a.id === previousStages.angles?.selectedAngleId
      ) || previousStages.angles?.angles[0];

      return {
        system: SYSTEM_PROMPTS.STAGE_3_NARRATIVE,
        user: `Develop a structured narrative architecture and beat outline.
Topic: "${meta.topic}"
Platform: ${meta.platform}
Target Duration: ${meta.targetDuration}
Tone: ${meta.tone}
Chosen Angle: "${selectedAngle?.title || 'Main Thesis'}"
Angle Hook: "${selectedAngle?.hook || ''}"
Angle Thesis: "${selectedAngle?.description || ''}"
${guidanceText}
Return JSON matching this format:
{
  "framework": "e.g., Problem-Agitate-Solve / Hero's Journey / 3-Act Documentary / Myth-Busting Dissection",
  "coreTheme": "The single overarching moral or core truth of this video",
  "targetPacing": "e.g., Fast & punchy with suspenseful pauses",
  "estimatedTotalMinutes": 8,
  "beats": [
    {
      "act": "Act 1: The Inciting Reality",
      "beatTitle": "The Shocking Status Quo",
      "timing": "0:00 - 0:45",
      "goal": "Hook audience and dismantle initial assumption",
      "emotionalArc": "Curiosity -> Unease",
      "keyPoint": "Why the old way no longer functions"
    }
  ]
}`
      };

    case 4:
      return {
        system: SYSTEM_PROMPTS.STAGE_4_SCRIPT,
        user: `Write a complete, high-retention video/audio script based on the narrative beats.
Topic: "${meta.topic}"
Platform: ${meta.platform}
Target Duration: ${meta.targetDuration}
Tone: ${meta.tone}
Language: ${meta.language}
Narrative Framework: ${previousStages.narrative?.framework || 'Narrative Structure'}
Core Theme: ${previousStages.narrative?.coreTheme || meta.topic}
Beats Overview: ${JSON.stringify(previousStages.narrative?.beats || [])}
${meta.language.toLowerCase().includes('tamil') || meta.language.toLowerCase().includes('tanglish') ? 'CRITICAL REQUIREMENT: Spoken text MUST be in Tanglish (Tamil conversational dialogue written using the English alphabet, with lively Tamil creator slang and comedy punchlines).' : ''}
${guidanceText}
Format into 4 or more structured sections (Hook, Intro, Body, CTA).
Return JSON matching this format:
{
  "tone": "${meta.tone}",
  "totalWordCount": 850,
  "estimatedDurationSec": 340,
  "estimatedDurationFormatted": "5m 40s",
  "sections": [
    {
      "id": "sec-1",
      "sectionType": "hook", // 'hook', 'intro', 'body', or 'cta'
      "title": "The Pattern Interrupt",
      "spokenText": "Full spoken dialogue word-for-word here...",
      "durationSec": 25,
      "deliveryNotes": "High energy, lean into camera, pause for 1 second after first sentence"
    }
  ]
}`
      };

    case 5:
      return {
        system: SYSTEM_PROMPTS.STAGE_5_VISUALS,
        user: `Create the comprehensive visual direction, B-roll plan, and audio design for the script.
Topic: "${meta.topic}"
Platform: ${meta.platform}
Language: ${meta.language}
Script Sections:
${JSON.stringify(previousStages.script?.sections || [])}
${guidanceText}
Return JSON matching this format:
{
  "overallMood": "Cinematic tech documentary, moody low-key lighting with vibrant accent neon",
  "colorPaletteSuggestion": "Deep slate navy, tungsten amber, electric cyan accents",
  "musicPacing": "Building synthwave drone into energetic syncopated beat at the climax",
  "items": [
    {
      "sectionId": "sec-1",
      "sectionTitle": "Section title from script",
      "onScreenVisuals": "What is visually occurring on camera with talent or primary focal point",
      "imageUrl": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80",
      "videoPreviewBadge": "4K 60fps B-Roll",
      "bRollIdeas": ["Cutaway 1 description", "Cutaway 2 description", "Cutaway 3 description"],
      "stockKeywords": ["cyberpunk server rack", "frustrated developer macro", "neon code overlay"],
      "graphicsOverlays": ["Lower third with bold stats", "Split-screen comparison banner"],
      "musicMood": "Tense rhythmic pulse, 110 BPM",
      "tamilComedyMeme": {
        "comedian": "Vadivelu",
        "movieRef": "Winner (Kaipulla)",
        "iconicDialogue": "Venaam... Valikidhu... Azhudhuduven!",
        "memeContext": "Quick comedic cutaway reaction as a funny meme break"
      }
    }
  ]
}`
      };

    case 6:
      return {
        system: SYSTEM_PROMPTS.STAGE_6_SHOT_LIST,
        user: `Generate a production-ready Shot List table for shooting this content.
Topic: "${meta.topic}"
Platform: ${meta.platform}
Script & Visual Directives:
${JSON.stringify(previousStages.visuals?.items?.slice(0, 6) || [])}
${guidanceText}
Return JSON matching this format:
{
  "totalShots": 12,
  "estimatedShootHours": "2.5 Hours",
  "locationSummary": ["Studio Desk Setup", "Workshop Table", "Outdoor Streetscape"],
  "shots": [
    {
      "id": "shot-1",
      "shotNumber": 1,
      "scene": "Scene 1: Hook / Intro",
      "shotType": "Medium Shot", // 'Extreme Wide', 'Wide', 'Medium Shot', 'Close-Up', 'Extreme Close-Up', 'Over-the-Shoulder', 'Point-of-View', 'Screen Share'
      "cameraMovement": "Slow Push-in", // 'Static', 'Pan', 'Tilt', 'Slow Push-in', 'Pull-out', 'Handheld', 'Tracking', 'Drone/Crane'
      "locationSetup": "Studio Desk, 35mm lens, Key light 45 deg, RGB rim light",
      "dialogueVo": "Spoken line excerpt",
      "duration": "5s",
      "notes": "Direct eye contact with lens, snappy delivery",
      "isCompleted": false
    }
  ]
}`
      };

    case 7:
      return {
        system: SYSTEM_PROMPTS.STAGE_7_PUBLISHING,
        user: `Create the complete publishing and multi-platform distribution package.
Topic: "${meta.topic}"
Platform: ${meta.platform}
Target Audience: ${meta.targetAudience}
Script Summary: ${previousStages.script?.sections?.map(s => s.title + ': ' + s.spokenText.slice(0, 100)).join(' | ') || meta.topic}
${guidanceText}
Return JSON matching this format:
{
  "titleOptions": [
    "Title 1 (High Curiosity)",
    "Title 2 (Direct Value)",
    "Title 3 (Negative Hook / Mistake)",
    "Title 4 (Question / Revelation)",
    "Title 5 (Story / Transformation)"
  ],
  "seoDescription": "Full formatted YouTube/VOD description with summary, timestamps markers, and call to action",
  "hashtags": ["#AIContent", "#CreatorEconomy", "#Production", "#Filmmaking"],
  "tags": ["ai content", "video production", "youtube strategy", "scriptwriting", "content director"],
  "thumbnailIdeas": [
    {
      "mainText": "STOP DOING THIS",
      "visualConcept": "Split screen: creator pulling hair out vs. one-click automated dashboard glowing",
      "colorContrast": "Bright yellow bold typography on deep matte black with cyan glow"
    },
    {
      "mainText": "10X FASTER",
      "visualConcept": "Close-up reaction face with glowing HUD interface reflecting in glasses",
      "colorContrast": "Electric magenta on dark slate with high-contrast rim lighting"
    },
    {
      "mainText": "THE SECRET",
      "visualConcept": "Director's clapboard with holographic futuristic AI waveforms",
      "colorContrast": "Clean white and lime green on dark graphite"
    }
  ],
  "captions": {
    "youtube": {
      "title": "Selected primary YouTube title",
      "description": "YouTube optimized description with links and chapters",
      "tags": ["tag1", "tag2", "tag3"]
    },
    "instagramReels": {
      "caption": "Punchy IG Reel caption with line breaks and call-to-action to comment",
      "hashtags": ["#creator", "#reelsviral", "#filmmakers", "#videoproduction"]
    },
    "tiktok": {
      "caption": "Short, meme/relatable TikTok caption with hook",
      "soundIdea": "Original Audio or Trending Ambient Synth Beat",
      "hashtags": ["#tiktokcreators", "#techcontent", "#fyp", "#learnontiktok"]
    },
    "linkedin": {
      "hook": "Thought-provoking opening line for LinkedIn professionals",
      "postBody": "Body paragraphs with insights, numbered takeaways, and professional tone",
      "callToDiscussion": "What is your team's biggest bottleneck in content creation?"
    },
    "x": {
      "thread": [
        "1/ Most creators spend 20+ hours per video. Here is the exact breakdown...",
        "2/ The first bottleneck is ideation and research...",
        "3/ Next comes the narrative structure...",
        "4/ For the script, retention relies on pattern interrupts...",
        "5/ If you found this breakdown useful, RT the first tweet and bookmark for later!"
      ]
    }
  },
  "referenceVideos": [
    {
      "id": "ref-1",
      "title": "Top Viral Reference Video on this Topic",
      "channel": "Leading Creator Channel",
      "url": "https://www.youtube.com/results?search_query=video+production",
      "views": "1.8M views",
      "whyItWorks": "Incredible 3-second hook with fast-paced B-roll and clear value proposition",
      "thumbnailUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
      "tag": "Trending Hit"
    }
  ],
  "sampleVideoSummary": "Simulated Director Cut: Starts with a high-energy 5s cold hook, cuts quickly into dynamic B-roll with kinetic text overlays, introduces key problem with a relatable meme cutaway, delivers the core insight, and ends with a high-converting CTA."
}`
      };

    default:
      throw new Error(`Invalid stage number: ${stageNumber}`);
  }
}
