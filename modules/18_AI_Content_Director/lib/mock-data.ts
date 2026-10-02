import {
  ProjectMetadata,
  ResearchData,
  AnglesData,
  NarrativeData,
  ScriptData,
  VisualsData,
  ShotListData,
  PublishingData,
  ReferenceVideoItem
} from "./types";
import { detectTopicTheme } from "./topic-theme";

export function generateMockResearch(meta: ProjectMetadata): ResearchData {
  const topic = meta.topic || "Food Review";
  const audience = meta.targetAudience || "Foodies & Lifestyle Enthusiasts";
  const theme = detectTopicTheme(topic);
  const category = theme.category;

  if (category === "food") {
    return {
      topicOverview: `An on-the-ground culinary review analysis of "${topic}", examining authenticity markers, secret wood-fire slow dum cooking techniques, flavor balance, customer queue wait times, and price-to-portion value for ${audience}.`,
      keyFacts: [
        `Authentic wood-fired dum cooking requires 3.5 to 4 hours under charcoal embers, locking in moisture so mutton separates from bone with zero resistance.`,
        `Using Seeraga Samba (Jeeragasamba) short-grain rice allows up to 3x more broth and mutton fat absorption compared to long-grain Basmati.`,
        `True traditional recipes use hand-stone-ground whole spices and naturally aged cow ghee rather than synthetic coloring or artificial powders.`,
        `Foodie retention on Instagram Reels surges by 84% when sizzling audio (ASMR) and knife/spoon texture tests appear in the first 2 seconds.`,
        `Classic sour-tangy Brinjal Dalcha (Kathirikai Puli Pachadi) is scientifically paired to chemically cut through the richness of mutton fat.`
      ],
      statistics: [
        {
          stat: "9.6/10 Flavor Rating",
          context: "Aggregated across 5,200+ local food enthusiast reviews and weekend diners.",
          source: "Chennai Food Guide & Culinary Census"
        },
        {
          stat: "₹240 Avg Bill",
          context: "For an unlimited aromatic mutton biryani feast with boiled egg, brinjal dalcha, and curd raita.",
          source: "Local Street & Restaurant Audit"
        },
        {
          stat: "300+ Plates / Day",
          context: "Batch sells out completely within 2 hours of afternoon opening.",
          source: "Kitchen Operations Log"
        }
      ],
      trends: [
        "Midnight 2 AM street food vlogging with high-contrast portable LED lights",
        "Raw ASMR crunch and sizzle sounds replacing heavy background music",
        "Honest unfiltered price-to-taste audits by creator-reviewers",
        "Behind-the-counter kitchen flame cinematography showing firewood master cooking"
      ],
      commonQuestions: [
        `Is the mutton genuinely tender or chewy?`,
        `What time does the fresh hot batch come out of the dum?`,
        `Is there sufficient parking and family seating available?`,
        `Does this spot live up to the viral social media hype?`
      ],
      audiencePainPoints: [
        "Food spots with massive viral Instagram hype that serve lukewarm, rubbery dishes",
        "Surprise billing and exorbitant hidden taxes on basic items",
        "Unbearable 45-minute standing queues in high heat without shade or tokens",
        "Excessive artificial food colorings that cause throat irritation"
      ],
      sources: [
        {
          title: "Authentic Heritage Cooking Traditions & Spice Chemistry",
          url: "https://example.com/reports/heritage-dum-cooking",
          snippet: "Culinary breakdown of slow dum sealed claypot heat retention."
        },
        {
          title: "South Indian Culinary Guild: Seeraga Samba vs Basmati",
          url: "https://example.com/research/rice-grain-absorption",
          snippet: "Empirical study on broth absorption ratios in traditional Indian rice varieties."
        },
        {
          title: "Food Vlogger Retention & Taste Authenticity Benchmarks 2025",
          url: "https://example.com/food-creator-benchmarks",
          snippet: "Analysis of high-conversion food review framing on Instagram Reels."
        }
      ]
    };
  }

  if (category === "education") {
    return {
      topicOverview: `A cognitive science and productivity analysis of "${topic}", evaluating active recall frameworks, spaced repetition retention curves, and high-focus study environments for ${audience}.`,
      keyFacts: [
        `Passive re-reading drops memory retention by 80% within 48 hours according to the Ebbinghaus Forgetting Curve.`,
        `Active recall using the Feynman Technique increases long-term neural pathway consolidation by 3.4x over highlighting text.`,
        `Binaural alpha waves (40Hz) and lo-fi acoustic rhythm (85 BPM) reduce cortisol spikes and sustain deep focus for up to 90 minutes.`,
        `Visualizing notes in digital mind-maps improves cross-concept associative memory by 64% during exam conditions.`,
        `Spaced repetition intervals of 1-day, 3-day, and 7-day reviews prevent cognitive decay before major tests.`
      ],
      statistics: [
        {
          stat: "3.4x Memory Boost",
          context: "Achieved when students test themselves on blank paper instead of re-reading highlighted textbooks.",
          source: "Cognitive Science Learning Review"
        },
        {
          stat: "25 Min / 5 Min",
          context: "Optimal Pomodoro focus interval that prevents mental exhaustion during intense cram sessions.",
          source: "Neurobiology of Attention Span"
        },
        {
          stat: "91% Exam Score Jump",
          context: "Reported by students who implement spaced repetition flashcards for core formulas and definitions.",
          source: "Higher Education Study Benchmark"
        }
      ],
      trends: [
        "Aesthetic desk setups with ambient lighting and dual monitors",
        "Tanglish Gen-Z exam hack reels breaking down complex science in 60 seconds",
        "Digital iPad handwritten summaries replacing heavy paper binders",
        "Real-time 'Study With Me' pomodoro streams on social platforms"
      ],
      commonQuestions: [
        `How to stop forgetting formulas right before entering the exam hall?`,
        `Why does highlighting every line in the book fail?`,
        `How many hours of sleep are mandatory to consolidate memories?`,
        `What is the fastest way to revise an entire syllabus in 48 hours?`
      ],
      audiencePainPoints: [
        "Severe exam anxiety causing mental blanks despite studying 6 hours daily",
        "Procrastination and social media doom-scrolling during revision breaks",
        "Highlighting entire pages like painting a wall without retaining key terms",
        "Overwhelming syllabus without clear high-yield chapter prioritization"
      ],
      sources: [
        {
          title: "The Neurobiology of Long-Term Memory Retention",
          url: "https://example.com/reports/memory-neurobiology",
          snippet: "Clinical research on synaptic plasticity and spaced testing."
        },
        {
          title: "Active Recall vs Passive Review in Academic Performance",
          url: "https://example.com/research/active-recall-evidence",
          snippet: "Meta-analysis of 12,000 university students across STEM disciplines."
        }
      ]
    };
  }

  return {
    topicOverview: `An in-depth subject analysis of "${topic}", examining core mechanisms, audience interest drivers, practical applications, and breakthrough perspectives for ${audience}.`,
    keyFacts: [
      `Engaging content on ${meta.platform} achieves 70%+ retention when the core insight is demonstrated within the first 15 seconds.`,
      `Audience attention gravitates toward authentic demonstrations, real-world testing, and unfiltered personal perspectives.`,
      `High-performing presentations cut through noise by challenging common misconceptions with direct proof.`,
      `Visual pacing variance and kinetic overlays sustain engagement twice as long as monotone monologues.`,
      `Directly addressing the audience's primary curiosity within the first minute drives 4.5x higher comment participation.`
    ],
    statistics: [
      {
        stat: "4.8x Higher Shares",
        context: `For content that demonstrates counter-intuitive findings about "${topic}".`,
        source: "Digital Content Impact Study 2025"
      },
      {
        stat: "78% Audience Retention",
        context: "Sustained when every 40-50 seconds introduces a new visual stimulus or angle.",
        source: "Audience Attention Dynamics Benchmark"
      },
      {
        stat: "3.2x Engagement Rate",
        context: "When real pricing, testing metrics, or hands-on reactions are featured.",
        source: "Global Creator Engagement Index"
      }
    ],
    trends: [
      "Authentic unfiltered reviews replacing staged sponsorships",
      "Fast-paced conversational commentary with native cultural slang",
      "Macro close-ups and dynamic camera movements keeping pacing alive"
    ],
    commonQuestions: [
      `What makes "${topic}" genuinely stand out from competitors?`,
      `Is the actual experience worth the investment of time and money?`,
      `What are the hidden drawbacks that nobody talks about?`
    ],
    audiencePainPoints: [
      "Conflicting reviews and sponsored misinformation online",
      "Wasting money on overhyped products or substandard experiences",
      "Struggling to find reliable, unbiased recommendations"
    ],
    sources: [
      {
        title: "Consumer Trust & Digital Review Authenticity Report",
        url: "https://example.com/reports/review-authenticity",
        snippet: "Analysis of buyer decision drivers and influencer credibility."
      }
    ]
  };
}

export function generateMockAngles(meta: ProjectMetadata, research?: ResearchData): AnglesData {
  const topic = meta.topic || "Food Review";
  const theme = detectTopicTheme(topic);
  const category = theme.category;
  const isTamilOrTanglish =
    (meta.language || "").toLowerCase().includes("tamil") ||
    (meta.language || "").toLowerCase().includes("tanglish");

  if (category === "food") {
    if (isTamilOrTanglish) {
      return {
        angles: [
          {
            id: "angle-1",
            title: "🔥 ₹150 Street Food vs ₹800 Five-Star Taste Shootout",
            hook: `Makkale! ₹150 biryani ₹800 5-star hotel-oda semmaya irukka mudiyuma? Today we test it live!`,
            targetEmotion: "Shock & Curiosity",
            difficultyScore: 4,
            uniquenessScore: 9,
            description: `Blind taste test comparing an expensive luxury hotel biryani against this 40-year old authentic wood-fired street spot.`,
            targetAudienceFit: `Massively resonates with budget foodies, college students, and weekend food quest lovers.`
          },
          {
            id: "angle-2",
            title: "🤤 40-Year-Old Secret Firewood Dum Recipe",
            hook: `Oru chinna kadai-la daily 500 plates 2 hours-la sold out aagura secret enna theriyuma? Kitchen kulla poi paakuvom!`,
            targetEmotion: "Intrigue & Appetite",
            difficultyScore: 5,
            uniquenessScore: 9,
            description: `Stepping into the roaring firewood kitchen to document the hand-pounded masala, Seeraga Samba rice, and charcoal embers.`,
            targetAudienceFit: `High watch time for food enthusiasts who appreciate authentic heritage cooking.`
          },
          {
            id: "angle-3",
            title: "💥 Worst or Best-u?! Honest Review of Hyped Spot",
            hook: `Instagram-la hype pandra alavuku indha spot worth-a illa pure waste-a? No sponsor, straight-up honest verdict!`,
            targetEmotion: "High Trust & Relatability",
            difficultyScore: 3,
            uniquenessScore: 8,
            description: `Zero-fluff audit checking whether the viral social media buzz holds up to real taste, hygiene, and pricing.`,
            targetAudienceFit: `Builds immense credibility with audiences tired of fake paid creator promotions.`
          },
          {
            id: "angle-4",
            title: "🌙 Midnight 2 AM Biryani Hunting in Chennai",
            hook: `Night 2 manikku aavi parakka biryani saapda ponom... what happened blew our minds!`,
            targetEmotion: "Adventure & FOMO",
            difficultyScore: 6,
            uniquenessScore: 9,
            description: `Late night food quest capturing the steaming dum opening under city lights and the energetic midnight crowd.`,
            targetAudienceFit: `Viral Reel/Shorts format for night owls, techies, and street food lovers.`
          },
          {
            id: "angle-5",
            title: "⭐ The Hidden Gem Challenge: Board Illaadha Kadai",
            hook: `Google Maps-la kooda illaadha secret spot... but locals say this is the tastiest biryani in town!`,
            targetEmotion: "Discovery & Exclusivity",
            difficultyScore: 4,
            uniquenessScore: 9,
            description: `Exploring an unlisted eatery with zero marketing that sells out purely by word-of-mouth excellence.`,
            targetAudienceFit: `Generates massive saves and shares for viewers planning their next food outing.`
          }
        ],
        selectedAngleId: "angle-1"
      };
    }

    return {
      angles: [
        {
          id: "angle-1",
          title: "🔥 Street Food vs 5-Star Luxury: The Blind Taste Test",
          hook: `Can a $3 street food stall outperform an $80 luxury restaurant? We put both to a blind taste test today!`,
          targetEmotion: "Shock & Curiosity",
          difficultyScore: 4,
          uniquenessScore: 9,
          description: `Direct comparison between heritage slow-cooked recipes and high-end fine dining plating.`,
          targetAudienceFit: `Perfect for curious foodies who love value-for-money culinary battles.`
        },
        {
          id: "angle-2",
          title: "🤤 The 40-Year Firewood Dum Secret",
          hook: `Why does this tiny mom-and-pop shop sell out 400 plates in under 90 minutes every single day?`,
          targetEmotion: "Intrigue & Appetite",
          difficultyScore: 5,
          uniquenessScore: 9,
          description: `Behind-the-scenes masterclass into authentic slow cooking, whole spice marinades, and charcoal dum sealed clay pots.`,
          targetAudienceFit: `Culinary enthusiasts eager to see heritage techniques in action.`
        },
        {
          id: "angle-3",
          title: "💥 The Brutally Honest Food Audit (Is It Hyped?)",
          hook: `The internet calls this the #1 food spot in the city. Today we find out if it's legendary or an overpriced trap!`,
          targetEmotion: "Trust & Suspense",
          difficultyScore: 3,
          uniquenessScore: 8,
          description: `No sponsored sugar-coating—rating temperature, spice balance, meat tenderness, and queue wait times.`,
          targetAudienceFit: `Smart consumers looking for honest dining recommendations.`
        },
        {
          id: "angle-4",
          title: "🌙 Midnight Food Quest: The 2 AM Taste Hunt",
          hook: `Hunting down the most legendary 2 AM street food feast in the city!`,
          targetEmotion: "Adventure & Craving",
          difficultyScore: 5,
          uniquenessScore: 8,
          description: `Immersive nocturnal vlog through bustling night markets to catch fresh steaming batches hot off the fire.`,
          targetAudienceFit: `Short-form lovers who enjoy vibrant street cinematography.`
        },
        {
          id: "angle-5",
          title: "⭐ The Unmarked Hidden Gem Locals Keep Secret",
          hook: `There's no sign board and no website, but people queue around the block for this one dish.`,
          targetEmotion: "Discovery & Exclusivity",
          difficultyScore: 4,
          uniquenessScore: 9,
          description: `Discovering off-the-beaten-path culinary wonders recommended strictly by local elders.`,
          targetAudienceFit: `Travelers and foodies seeking authentic cultural flavors.`
        }
      ],
      selectedAngleId: "angle-1"
    };
  }

  if (category === "education") {
    if (isTamilOrTanglish) {
      return {
        angles: [
          {
            id: "angle-1",
            title: "Exam-ku Munnaadi Idha Mattum Paarunga! 🧠 10X Memory Secret",
            hook: `Exam season vandhaale blank aagudha? Stop highlighting textbooks right now makkale!`,
            targetEmotion: "Relief & Breakthrough",
            difficultyScore: 3,
            uniquenessScore: 9,
            description: `Dismantling passive reading illusions and demonstrating the active recall Feynman hack.`,
            targetAudienceFit: `Students dealing with exam cramming and memory overload.`
          },
          {
            id: "angle-2",
            title: "Stop Highlighting Everything Makkale! ❌ Aani Pudunga Venam Method",
            hook: `Highlighting everything doesn't mean you're studying—it's just coloring! Here is what toppers actually do.`,
            targetEmotion: "Shock & Reality Check",
            difficultyScore: 3,
            uniquenessScore: 8,
            description: `How highlighting tricks the brain into false mastery, and the blank-sheet recall alternative.`,
            targetAudienceFit: `High school and college students looking for efficiency.`
          },
          {
            id: "angle-3",
            title: "Top 3 Secret Study Tricks Toppers Hide From You! 🤫",
            hook: `Toppers 10 hours padika maataanga... they use this 25-minute Pomodoro rhythm. Steal it now!`,
            targetEmotion: "Curiosity & Advantage",
            difficultyScore: 4,
            uniquenessScore: 9,
            description: `Spaced repetition, question-led revision, and sleep memory consolidation explained in Tanglish.`,
            targetAudienceFit: `Competitive exam aspirants (JEE, NEET, TNPSC, semester exams).`
          },
          {
            id: "angle-4",
            title: "Padichadhu Marakkaama Irukka Indha Simple Hack! 📚",
            hook: `48 hours-la 80% syllabus marandhu pogudha? The Forgetting Curve solution is here!`,
            targetEmotion: "Empowerment",
            difficultyScore: 3,
            uniquenessScore: 8,
            description: `Day 1, Day 3, and Day 7 spaced testing framework that locks concepts permanently.`,
            targetAudienceFit: `Anyone trying to master difficult academic subjects.`
          },
          {
            id: "angle-5",
            title: "Exam Fear-ah Gaali Panna Indha Oru Technique Podhum! ⚡",
            hook: `Vadivelu maari tension aagama, exam hall-la cool-ah 90% score pandra mindset blueprint!`,
            targetEmotion: "Confidence & Calm",
            difficultyScore: 2,
            uniquenessScore: 8,
            description: `Pre-exam morning routine, hydration hacks, and tactical question paper scanning.`,
            targetAudienceFit: `Anxious students needing calm encouragement and practical tactics.`
          }
        ],
        selectedAngleId: "angle-1"
      };
    }
  }

  // General / Other Topics
  return {
    angles: [
      {
        id: "angle-1",
        title: isTamilOrTanglish ? `🔥 ${topic}: The Unfiltered Truth (Neengale Paaru-nga!)` : `The Unfiltered Truth About ${topic}`,
        hook: isTamilOrTanglish
          ? `Makkale! ${topic} pathi internet-la solra 90% vishayam fake! Unmai enna nu live-ah paakuvom!`
          : `Everything you've been told about "${topic}" is backwards, and here is the proof.`,
        targetEmotion: "Shock & Curiosity",
        difficultyScore: 4,
        uniquenessScore: 9,
        description: `Cutting through mainstream assumptions and delivering an evidence-backed deep dive into "${topic}".`,
        targetAudienceFit: `Appeals directly to skeptical, experienced viewers looking for honest insights.`
      },
      {
        id: "angle-2",
        title: isTamilOrTanglish ? `I Tested ${topic} For 7 Days: Semma Shocking Results!` : `I Tested ${topic} For 7 Days: The Real Verdict`,
        hook: isTamilOrTanglish
          ? `Naan 7 days continuous-ah ${topic} test pannen... the final result blew my mind!`
          : `I spent 7 days testing "${topic}" so you don't have to waste hundreds of hours.`,
        targetEmotion: "Empathy & High Stakes",
        difficultyScore: 6,
        uniquenessScore: 8,
        description: `A fast-paced experiential journey testing ${topic} in real life with unfiltered transparent metrics.`,
        targetAudienceFit: `High retention format for viewers who love genuine behind-the-scenes experiments.`
      },
      {
        id: "angle-3",
        title: isTamilOrTanglish ? `Top 3 Secret Hacks for ${topic} (Adra Sakka Blueprint)` : `The Step-by-Step Blueprint for ${topic}`,
        hook: isTamilOrTanglish
          ? `Steal this exact 3-step blueprint for ${topic} before everyone else catches on!`
          : `Steal this exact 5-step framework to master "${topic}" in record time.`,
        targetEmotion: "Empowerment & Relief",
        difficultyScore: 3,
        uniquenessScore: 8,
        description: `A hyper-practical masterclass with zero fluff, giving immediate actionable steps.`,
        targetAudienceFit: `Pragmatic viewers wanting clear, direct results.`
      },
      {
        id: "angle-4",
        title: isTamilOrTanglish ? `Worst or Best-u?! Honest Review of ${topic}` : `Is ${topic} Actually Worth It in 2026?`,
        hook: isTamilOrTanglish
          ? `Indha ${topic} worth-a illa pure waste-a? No sugar-coating, honest verdict! 💥`
          : `Is "${topic}" worth your hard-earned money and time in 2026? Here is the verdict.`,
        targetEmotion: "Trust & Suspense",
        difficultyScore: 4,
        uniquenessScore: 9,
        description: `Unbiased, critical evaluation weighing pros, cons, hidden costs, and overall payoff.`,
        targetAudienceFit: `Smart consumers and enthusiasts making purchasing or lifestyle decisions.`
      },
      {
        id: "angle-5",
        title: isTamilOrTanglish ? `Future Warning: ${topic} 2026 Shift!` : `The 2026 Future Shock: Where ${topic} Goes Next`,
        hook: isTamilOrTanglish
          ? `2026-la ${topic} completely maara podhu... don't make this huge mistake!`
          : `If you are still approaching "${topic}" the way you did last year, you're about to fall behind.`,
        targetEmotion: "Urgency & FOMO",
        difficultyScore: 5,
        uniquenessScore: 8,
        description: `Exploring upcoming trends, sudden paradigm shifts, and how to stay ahead of the curve.`,
        targetAudienceFit: `Forward-thinking creators and professionals wanting to stay ahead.`
      }
    ],
    selectedAngleId: "angle-1"
  };
}

export function generateMockNarrative(meta: ProjectMetadata, angles?: AnglesData): NarrativeData {
  const topic = meta.topic || "Food Review";
  const theme = detectTopicTheme(topic);
  const category = theme.category;
  const chosenAngle = angles?.angles.find(a => a.id === angles.selectedAngleId) || angles?.angles[0];
  const angleTitle = chosenAngle?.title || "The Honest Review";

  if (category === "food") {
    return {
      framework: "The Foodie Quest & Flavor Breakdown (Vlogger Arc)",
      coreTheme: `Uncovering why this authentic firewood slow-dum recipe creates unforgettable flavor, tender texture, and viral queues.`,
      targetPacing: "High-energy mouthwatering hook, kitchen flame sizzle, slow-motion taste reaction, honest verdict",
      estimatedTotalMinutes: meta.targetDuration.includes("60s") ? 1 : 3,
      beats: [
        {
          act: "Act 1: The Inciting Craving & Spot Arrival",
          beatTitle: "Steaming Pot First Impression",
          timing: "0:00 - 0:20",
          goal: "Break the viewer's scroll with rising steam, sizzling sounds, and immediate location establishment.",
          emotionalArc: "Appetite & Curiosity",
          keyPoint: `Arriving at the spot, inhaling the 40-year old authentic aroma, and showing the massive Seeraga Samba pot.`
        },
        {
          act: "Act 2: Kitchen Secrets & Firewood Dum",
          beatTitle: "Behind the Counter Flames",
          timing: "0:20 - 0:45",
          goal: "Reveal the master cooking craftsmanship that separates this spot from ordinary commercial eateries.",
          emotionalArc: "Awe & Respect",
          keyPoint: "Showing the 4-hour firewood dum, charcoal embers, and master chef tossing whole spices into clarified ghee."
        },
        {
          act: "Act 3: First Hot Bite & Texture Breakdown",
          beatTitle: "The Mutton Softness Test",
          timing: "0:45 - 1:15",
          goal: "Deliver the ultimate taste payoff with audible ASMR and expressive host reaction.",
          emotionalArc: "Ecstasy & Craving",
          keyPoint: "Demonstrating how the meat shreds effortlessly with a spoon, tasting the spiced rice, and feeling the flavor blast."
        },
        {
          act: "Act 4: Accompaniments & Spicy Meter Test",
          beatTitle: "Dalcha & Raita Balance",
          timing: "1:15 - 1:35",
          goal: "Audit the complete meal experience—the tangy brinjal puli pachadi and refreshing onion raita.",
          emotionalArc: "Satisfaction & Trust",
          keyPoint: "Testing the spice level on a 1-10 scale and evaluating the generous portion sizes."
        },
        {
          act: "Act 5: Bill Breakdown, Final Rating & Tag CTA",
          beatTitle: "Paisa Vasool Verdict",
          timing: "1:35 - 2:00",
          goal: "Give the definitive verdict, reveal the exact bill (₹240), and prompt viewers to tag their foodie buddies.",
          emotionalArc: "Empowerment & FOMO",
          keyPoint: "5/5 Star rating, exact Google Maps location reminder, and subscribe call to action."
        }
      ]
    };
  }

  if (category === "education") {
    return {
      framework: "The 25-Minute Mastery Blueprint (Active Recall Arc)",
      coreTheme: `Eliminating exam anxiety by replacing passive reading with high-efficiency active testing.`,
      targetPacing: "Urgent empathetic hook, stark science contrast, step-by-step demonstration, confident resolution",
      estimatedTotalMinutes: meta.targetDuration.includes("60s") ? 1 : 3,
      beats: [
        {
          act: "Act 1: The Cramming Trap",
          beatTitle: "Highlighting Everything Illusion",
          timing: "0:00 - 0:30",
          goal: "Hook students by acknowledging the frustration of studying 5 hours yet forgetting everything.",
          emotionalArc: "Relief & Validation",
          keyPoint: "Showing why highlighting textbooks creates an illusion of competence without memory consolidation."
        },
        {
          act: "Act 2: The Forgetting Curve Revelation",
          beatTitle: "Why Memories Decay in 48 Hours",
          timing: "0:30 - 1:10",
          goal: "Present the empirical neuroscience curve that proves passive re-reading fails.",
          emotionalArc: "Revelation",
          keyPoint: "Displaying the 80% drop-off graph and introducing the active testing principle."
        },
        {
          act: "Act 3: The Feynman Blank-Sheet Hack",
          beatTitle: "Explain It Like You're 10",
          timing: "1:10 - 2:00",
          goal: "Walk through the exact 3-step blank sheet exercise that cements complex concepts.",
          emotionalArc: "Clarity & Mastery",
          keyPoint: "Demonstrating how explaining a topic without notes locks 90% into long-term recall."
        },
        {
          act: "Act 4: Spaced Repetition Calendar",
          beatTitle: "1-Day, 3-Day, 7-Day Rhythm",
          timing: "2:00 - 2:30",
          goal: "Give a concrete review schedule to automate exam revision.",
          emotionalArc: "Control & Calm",
          keyPoint: "Quick review intervals that prevent pre-exam panic."
        },
        {
          act: "Act 5: Final Playoff & Free Template CTA",
          beatTitle: "Ace Your Exams",
          timing: "2:30 - 3:00",
          goal: "Invite students to download the free planner and share which subject is toughest.",
          emotionalArc: "Empowerment",
          keyPoint: "Actionable link in description and community encouragement."
        }
      ]
    };
  }

  return {
    framework: "The Deep Dive & Revelation Arc",
    coreTheme: `Providing an unfiltered, authentic exploration of "${topic}" with hands-on proof and high-signal insights.`,
    targetPacing: "High-octane opening hook, measured analytical middle, accelerating resolution",
    estimatedTotalMinutes: meta.targetDuration.includes("60s") ? 1 : 4,
    beats: [
      {
        act: "Act 1: The Inciting Reality",
        beatTitle: "The Common Myth Shattered",
        timing: "0:00 - 0:30",
        goal: "Hook the audience and break passive scrolling with a direct demonstration.",
        emotionalArc: "Curiosity -> Unease",
        keyPoint: `Why the standard consensus regarding "${topic}" fails in real-world testing.`
      },
      {
        act: "Act 2: The Hands-On Test",
        beatTitle: "Unmasking What Really Works",
        timing: "0:30 - 1:30",
        goal: "Deconstruct the exact mechanics of why the old approach falls short.",
        emotionalArc: "Revelation & Validation",
        keyPoint: `Live testing and showing the actual unfiltered numbers and reactions.`
      },
      {
        act: "Act 3: The Secret Formula",
        beatTitle: "The Breakthrough Insight",
        timing: "1:30 - 2:30",
        goal: "Deliver the core solution or perspective that changes the game.",
        emotionalArc: "Clarity & Excitement",
        keyPoint: `How adopting ${angleTitle} delivers superior, lasting results.`
      },
      {
        act: "Act 4: The Final Verdict & Actionable Next Step",
        beatTitle: "The Takeaway & Community Call",
        timing: "2:30 - 3:00",
        goal: "Deliver the definitive verdict and invite audience discussion.",
        emotionalArc: "Empowerment",
        keyPoint: "Community challenge and resources in the description."
      }
    ]
  };
}

export function generateMockScript(meta: ProjectMetadata, narrative?: NarrativeData): ScriptData {
  const topic = meta.topic || "Food Review";
  const theme = detectTopicTheme(topic);
  const category = theme.category;
  const isTamilOrTanglish =
    (meta.language || "").toLowerCase().includes("tamil") ||
    (meta.language || "").toLowerCase().includes("tanglish");

  if (category === "food") {
    if (isTamilOrTanglish) {
      return {
        tone: meta.tone,
        totalWordCount: 460,
        estimatedDurationSec: 120,
        estimatedDurationFormatted: "2m 00s",
        sections: [
          {
            id: "sec-1",
            sectionType: "hook",
            title: "The Sizzling Food Reveal (Makkale Tanglish Hook)",
            spokenText: `Makkale! Innaiku namma enga vandhirukkom theriyuma? Chennai-la 40 varushama irukura legendary Ambur Star Biryani spot! Indha smell paathenee thala sutthudhu... Just look at this steaming seeraga samba rice and tender mutton! Aavi parakka irukku pa... Skip pannama paarunga, indha taste worth-u varma worth-u!`,
            durationSec: 20,
            deliveryNotes: "Direct eye contact with lens, wide smile, leaning in over the steaming plate. Expressive hand gesture on 'worth-u varma worth-u'."
          },
          {
            id: "sec-2",
            sectionType: "intro",
            title: "Kitchen Firewood Dum Magic (Appadiye Shock Aayitten)",
            spokenText: `Kitchen kulla poi paatha... pure firewood dum cooking! Daily 4 hours slow cook pandraanga. Master chef andha masala-va toss panna odane leapaana roaring flame paatheengala? Santhanam style-la "Appadiye shock aayitten!" No artificial color, pure ghee fragrance and hand-ground black pepper aroma!`,
            durationSec: 30,
            deliveryNotes: "Excited and energetic, turning toward kitchen flames, voice rises slightly on 'roaring flame'."
          },
          {
            id: "sec-3",
            sectionType: "body",
            title: "The Mutton Softness & Taste Blast (Building Strong-u Basement Strong-u)",
            spokenText: `First bite eduthom pa... Spoon vechaale mutton tender-ah butter maari odaiyudhu! Andha seeraga samba rice-oda pepper, mild cloves, and cooling curd onion raita combo bayangaramaana flavor blast! Vadivelu maari "Building strong-u, basement-um strong-u" nu solla vaikkura taste. Mutton literally melts in your mouth!`,
            durationSec: 45,
            deliveryNotes: "Close-up taste reaction, audible sigh of satisfaction on first bite, expressive nodding and pointing to plate."
          },
          {
            id: "sec-4",
            sectionType: "cta",
            title: "The Bill Verdict & Friend Tag CTA (Adra Sakka Outro)",
            spokenText: `Total bill just ₹240 thaan! Full unlimited feast, complete paisa vasool! Unga biryani addict friend-ah ippove comment-la tag pannunga who owes you a treat, and description-la exact Google Maps location potruken. மறக்காம Subscribe பண்ணி பெல் ஐகான் தட்டுங்க மக்களே! Next endha spot pogalam nu comment pannunga!`,
            durationSec: 25,
            deliveryNotes: "Holding up receipt playfully, warm natural smile, pointing downward for description link."
          }
        ]
      };
    }

    return {
      tone: meta.tone,
      totalWordCount: 480,
      estimatedDurationSec: 130,
      estimatedDurationFormatted: "2m 10s",
      sections: [
        {
          id: "sec-1",
          sectionType: "hook",
          title: "The Sizzling Food Reveal (Viral Hook)",
          spokenText: `Food lovers, today we just found the most legendary culinary secret in the city! Look at this piping hot dum biryani—the aroma alone fills the entire street. We're doing an unfiltered taste test to see if this 40-year-old spot actually lives up to the internet hype!`,
          durationSec: 20,
          deliveryNotes: "Medium close-up over steaming pot. Direct eye contact, genuine curiosity and excitement."
        },
        {
          id: "sec-2",
          sectionType: "intro",
          title: "Inside the Firewood Kitchen",
          spokenText: `Stepping straight into the master kitchen—they've been slow-cooking this batch over real firewood for over four hours. The chef tosses the whole spices into the sizzling wok, and the flame flares up immediately. Zero artificial colors, just pure clarified ghee and hand-ground spices!`,
          durationSec: 30,
          deliveryNotes: "Handheld camera stepping beside wok. High energy, pointing toward leaping flame."
        },
        {
          id: "sec-3",
          sectionType: "body",
          title: "The First Bite & Texture Breakdown",
          spokenText: `Taking the very first piping hot bite. The meat is so tender it literally shreds apart with a spoon. That subtle kick of black pepper, caramelized onions, and the cooling mint raita creates a complete flavor explosion. Absolute 10 out of 10 texture!`,
          durationSec: 50,
          deliveryNotes: "Close-up macro on fork/spoon lifting meat, closed eyes savoring aroma, nodding enthusiastically."
        },
        {
          id: "sec-4",
          sectionType: "cta",
          title: "The Final Verdict & Location Tag",
          spokenText: `The entire royal feast came out to just under $8! 100% worth every single cent. Tag your ultimate foodie partner in the comments who owes you a food hunt, and the full Google Maps pin is linked in the description below. Hit that follow button for more food quests!`,
          durationSec: 30,
          deliveryNotes: "Friendly and grounded, giving double thumbs up to the kitchen team, pointing to description."
        }
      ]
    };
  }

  if (category === "education") {
    if (isTamilOrTanglish) {
      return {
        tone: meta.tone,
        totalWordCount: 440,
        estimatedDurationSec: 120,
        estimatedDurationFormatted: "2m 00s",
        sections: [
          {
            id: "sec-1",
            sectionType: "hook",
            title: "The Cramming Trap (Tanglish Gen-Z Hook)",
            spokenText: `Makkale! Exam season vandhaale book-ah paathu thalaiya sorithu irukkeengala? Stop highlighting 100% of your textbook right now! Nesamani maari "Aani pudunga venam" nu solla porom. Next 2 minutes-la topper secrets reveal pandren, skip pannama paarunga!`,
            durationSec: 20,
            deliveryNotes: "Direct eye contact, holding neon highlighter, playfully tossing it aside."
          },
          {
            id: "sec-2",
            sectionType: "intro",
            title: "The Illusion of Reading (Enna Koduma Saravanan Idhu)",
            spokenText: `Namma la pala per 5 hours padichum exam hall-la poi blank aaguvom. Enna koduma saravanan idhu! Problem unga memory illa, passive reading thaan. Book-ah marupadi marupadi vaasikuradhu reading illusion create pannum, aana brain-la store aagadhu!`,
            durationSec: 30,
            deliveryNotes: "Relatable, empathetic tone. Shrugging with a warm smile, showing textbook page."
          },
          {
            id: "sec-3",
            sectionType: "body",
            title: "The Active Recall 25-Min Feynman Hack",
            spokenText: `Idho namma Active Recall 25-minute Feynman hack! Step 1: Oru concept padicha odane book-ah close pannunga. Step 2: Blank paper eduthu, oru 10-year old friend-ku explain pandra maari Tanglish-la ezhudhi paarunga. Enga stumple aagureengalo, andha part mattum re-read pannunga. This locks 90% into long-term memory!`,
            durationSec: 45,
            deliveryNotes: "Writing on whiteboard/tablet, counting steps on fingers, high energy and clarity."
          },
          {
            id: "sec-4",
            sectionType: "cta",
            title: "Free Revision Planner & Ace Your Exams",
            spokenText: `Indha free revision planner template description-la irukku, download pannikonga. Ungalukku endha subject romba tough-a irukku nu comment-la sollunga. மறக்காம Subscribe பண்ணி பெல் ஐகான் தட்டுங்க மக்களே! Go ace your exams!`,
            durationSec: 25,
            deliveryNotes: "Encouraging smile, two thumbs up, pointing down toward description."
          }
        ]
      };
    }
  }

  // General Topic Script
  return {
    tone: meta.tone,
    totalWordCount: 450,
    estimatedDurationSec: 120,
    estimatedDurationFormatted: "2m 00s",
    sections: [
      {
        id: "sec-1",
        sectionType: "hook",
        title: "The Pattern Interrupt & Core Premise",
        spokenText: isTamilOrTanglish
          ? `Makkale! Innaiku namma paaka pora "${topic}" pathi internet-la pala per misinformation spread pandraanga. But today, the unfiltered truth is coming out! Skip pannama full-ah paarunga, ungalukku semma clarity kedaikum!`
          : `If you're exploring "${topic}", stop following outdated advice right now. In the next two minutes, we're cutting through the noise to reveal what actually works in the real world!`,
        durationSec: 20,
        deliveryNotes: "Sharp eye contact, confident posture, no preamble."
      },
      {
        id: "sec-2",
        sectionType: "intro",
        title: "The Problem & What Most People Miss",
        spokenText: isTamilOrTanglish
          ? `Namma la pala per indha mistake-ah daily repeat pandrom. Vadivelu maari "Aahaa oru mudivoda thaan irukinga" nu solra alavukku confusion! The real reason is nobody breaks down the core fundamentals step-by-step.`
          : `Most people struggle with this because they focus on surface-level symptoms rather than the root mechanics. When you inspect the actual data, the real bottleneck becomes immediately obvious.`,
        durationSec: 30,
        deliveryNotes: "Conversational, displaying screen demonstration or practical prop."
      },
      {
        id: "sec-3",
        sectionType: "body",
        title: "The Breakthrough Demonstration",
        spokenText: isTamilOrTanglish
          ? `Idho namma key solution! Step 1: Foundation-ah crystal clear-ah set pannunga. Vadivelu style-la "Building strong-u basement-um strong-u" nu irukanum! Watch what happens when we test this live—the performance jumps immediately!`
          : `Here is the framework that changes everything. Pillar one: Test the core assumption before committing resources. Pillar two: Rapid iteration with real feedback. Look at the live comparison on screen right now!`,
        durationSec: 45,
        deliveryNotes: "Energetic, pointing to graphics and B-roll cutaways."
      },
      {
        id: "sec-4",
        sectionType: "cta",
        title: "The Final Verdict & Community Call",
        spokenText: isTamilOrTanglish
          ? `Indha breakdown ungalukku useful-ah irundha, unga friends kooda share pannunga. Unga thoughts-ah comment-la drop pannunga. மறக்காம Subscribe பண்ணி பெல் ஐகான் தட்டுங்க மக்களே!`
          : `Grab the complete resource guide linked in the description below. Drop your biggest question in the comments—I reply to everyone. Hit subscribe for more unfiltered breakdowns!`,
        durationSec: 25,
        deliveryNotes: "Warm authentic smile, direct gesture toward comment section."
      }
    ]
  };
}

export function generateMockVisuals(meta: ProjectMetadata, script?: ScriptData): VisualsData {
  const lowerTopic = (meta.topic || "").toLowerCase();
  const isFood =
    lowerTopic.includes("food") ||
    lowerTopic.includes("biryani") ||
    lowerTopic.includes("restaurant") ||
    lowerTopic.includes("dosa") ||
    lowerTopic.includes("burger") ||
    lowerTopic.includes("pizza") ||
    lowerTopic.includes("cafe") ||
    lowerTopic.includes("cooking") ||
    lowerTopic.includes("street food") ||
    lowerTopic.includes("dining");

  const isEducation =
    lowerTopic.includes("study") ||
    lowerTopic.includes("exam") ||
    lowerTopic.includes("book") ||
    lowerTopic.includes("notebook") ||
    lowerTopic.includes("pen") ||
    lowerTopic.includes("laptop") ||
    lowerTopic.includes("tips") ||
    lowerTopic.includes("student") ||
    lowerTopic.includes("school") ||
    lowerTopic.includes("college") ||
    lowerTopic.includes("learn");

  if (isFood) {
    return {
      overallMood: "Mouth-watering culinary cinematography. High-key warm amber lighting, sizzling grill flares, ultra-sharp 4K macro textures of food spices and sauces.",
      colorPaletteSuggestion: "Saffron Gold (#F59E0B), Crimson Chili (#EF4444), Charred Charcoal (#18181B)",
      musicPacing: "Starts with crisp sizzle ASMR & pop beats, transitions to upbeat energetic Tamil/Urban lo-fi rhythm (120 BPM) with bass drops on taste reveals.",
      items: [
        {
          sectionId: "sec-1",
          sectionTitle: "The Sizzling Food Reveal (Viral Hook)",
          onScreenVisuals: "Host seated in front of a giant steaming claypot of aromatic Dum Biryani. Steam rises, camera pans down from host's excited reaction face into macro shot of succulent mutton pieces.",
          imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
          videoPreviewBadge: "4K 60fps &bull; Macro Sizzle ASMR",
          bRollIdeas: [
            "Extreme close-up of fragrant saffron rice being scooped with brass ladle",
            "Slow-motion ghee drizzle over crispy fried onions and fresh coriander",
            "Reaction shot of host smelling the aroma with eyes wide in disbelief"
          ],
          stockKeywords: ["biryani pot steaming macro", "indian street food sizzle", "chef plating garnish", "slow motion ghee pour"],
          graphicsOverlays: [
            "Floating rating counter: 'FLAVOR SCORE: 9.8/10'",
            "Bold kinetic text pop: 'SECRET 50-YEAR RECIPE'",
            "Location GPS pin animation: 'Royapettah, Chennai'"
          ],
          musicMood: "Dead silence for sizzling audio for 4s, followed by punchy bass drop",
          tamilComedyMeme: {
            comedian: "Vadivelu",
            movieRef: "Winner (Kaipulla)",
            iconicDialogue: "Venaam... Valikidhu... Azhudhuduven!",
            memeContext: "Kaipulla emotional face when the waiter mentions this biryani has 10 spicy green chilies per plate."
          }
        },
        {
          sectionId: "sec-2",
          sectionTitle: "The Taste Breakdown & Texture Test",
          onScreenVisuals: "Host taking the first piping hot bite. Medium close-up with shallow depth of field. Soft golden rim light catching the steam.",
          imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80",
          videoPreviewBadge: "1080p &bull; Multi-Angle Taste Test",
          bRollIdeas: [
            "Close-up of crispy ghee roast dosa breaking with audible crunch",
            "Dipping hot chicken tikka into cooling mint chutney in slow motion",
            "Table flatlay showing the full royal banquet spread with smoking skewers"
          ],
          stockKeywords: ["crispy dosa crunch macro", "tasting food authentic reaction", "table flatlay food feast", "curry bubbling pan"],
          graphicsOverlays: [
            "Spice Meter Graphic: Mild -> Medium -> INSANE SPICY 🔥",
            "Cost breakdown lower third: '₹220 per plate &bull; Worth every rupee'"
          ],
          musicMood: "Warm upbeat acoustic and tabla groove with playful comedic flutes",
          tamilComedyMeme: {
            comedian: "Vivek",
            movieRef: "Run",
            iconicDialogue: "Idhu kakka biryani daa!",
            memeContext: "Playful cutaway when jokingly asking the street vendor how they sell so much food at such cheap prices."
          }
        },
        {
          sectionId: "sec-3",
          sectionTitle: "The Secret Kitchen & Master Chef Cooking",
          onScreenVisuals: "Handheld camera stepping inside the roaring kitchen. Master chef tossing spices into massive wok with roaring orange flame.",
          imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
          videoPreviewBadge: "High Speed &bull; Kitchen Fire Wok",
          bRollIdeas: [
            "Slow-mo 120fps shot of flames leaping 2 feet into the air as oil hits wok",
            "Chef grating aged cheese and pouring rich simmering masala gravy",
            "Fast-paced jump cuts of knife chopping onions with rhythmic speed"
          ],
          stockKeywords: ["wok chef fire flame 4k", "commercial kitchen cooking action", "spices falling slow motion", "meat searing hot grill"],
          graphicsOverlays: [
            "Secret Ingredient Callout: 'Black Stone Flower (Kalpasi) + Pure Desi Ghee'",
            "Cooking Time Badge: 'Slow Dum Cooked for 4 Hours'"
          ],
          musicMood: "Driving percussion with high adrenaline kitchen beats",
          tamilComedyMeme: {
            comedian: "Vadivelu",
            movieRef: "Thalainagaram (Naai Sekar)",
            iconicDialogue: "Building strong-u, basement weak-u!",
            memeContext: "Hilarious cutaway comparing restaurants that spend lakhs on AC interior but serve cold rubbery food."
          }
        },
        {
          sectionId: "sec-4",
          sectionTitle: "The Final Verdict & Foodie Outro",
          onScreenVisuals: "Host finishing the plate with clean finger bowl, delivering authentic final rating directly to the lens.",
          imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
          videoPreviewBadge: "Studio Outro &bull; 4K Warm Key",
          bRollIdeas: [
            "Time-lapse of the long queue outside the restaurant waiting for a table",
            "Host wiping mouth with napkin and giving double thumbs up to chef",
            "Google Maps route graphic showing how to reach the shop"
          ],
          stockKeywords: ["restaurant queue crowd", "empty clean dinner plate", "foodie thumbs up smiling", "night street food market"],
          graphicsOverlays: [
            "FINAL VERDICT BADGE: 5/5 MUST VISIT MUST TRY ⭐️⭐️⭐️⭐️⭐️",
            "Tag a friend who owes you a Biryani Treat in the comments! 👇"
          ],
          musicMood: "Uplifting celebratory rhythm with smooth fade-out",
          tamilComedyMeme: {
            comedian: "Santhanam",
            movieRef: "Siruthai",
            iconicDialogue: "Appadiye shock aayitten!",
            memeContext: "Closing reaction to the massive food portion size and bill arriving at half the expected price."
          }
        }
      ]
    };
  }

  if (isEducation) {
    return {
      overallMood: "Deep focus scholarly aesthetic. Clean natural desk daylight, warm oak wood table, crisp highlighters, digital iPad notes, and focused cinematic macro shots.",
      colorPaletteSuggestion: "Scholar Navy (#1E3A8A), Sage Green (#10B981), Amber Pencil Tungsten (#F59E0B)",
      musicPacing: "Binaural alpha waves (40Hz) and gentle lo-fi study beat (85 BPM) designed for maximum cognitive retention.",
      items: [
        {
          sectionId: "sec-1",
          sectionTitle: "The Retention Crisis (Viral Hook)",
          onScreenVisuals: "Overhead top-down flatlay shot of an open notebook, steaming coffee mug, and digital iPad Pro glowing with active handwritten diagram.",
          imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
          videoPreviewBadge: "4K Overhead &bull; Flatlay Macro",
          bRollIdeas: [
            "Macro close-up of gel pen tip writing ink on textured ivory notebook paper",
            "Neon yellow pastel highlighter gliding across textbook line",
            "Time-lapse of clock ticking rapidly while student flips pages frantically"
          ],
          stockKeywords: ["notebook handwritten study notes", "highlighter pen paper macro", "coffee study desk student", "focus study timer"],
          graphicsOverlays: [
            "Forgetting Curve graph showing 80% loss in 24 hours",
            "Kinetic Title: 'STOP HIGHLIGHTING EVERYTHING'"
          ],
          musicMood: "Soft ticking metronome transitioning to calming lo-fi piano chords",
          tamilComedyMeme: {
            comedian: "Vadivelu",
            movieRef: "Friends",
            iconicDialogue: "Aani pudunga venam!",
            memeContext: "Cutaway to Nesamani when warning students not to highlight 100% of the textbook like painting a wall."
          }
        },
        {
          sectionId: "sec-2",
          sectionTitle: "The Active Recall Framework",
          onScreenVisuals: "Host demonstrating the blank-sheet Feynman technique on a matte glass whiteboard with bold markers.",
          imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
          videoPreviewBadge: "1080p &bull; Feynman Whiteboard Demo",
          bRollIdeas: [
            "Hands organizing minimalist flashcards into Leitner system boxes",
            "Split screen showing passive re-reading vs active spaced recall testing",
            "Clean digital Notion dashboard with organized toggle lists"
          ],
          stockKeywords: ["whiteboard diagram explanation", "flashcards revision student", "ipad pencil notes app", "focused student library"],
          graphicsOverlays: [
            "Rule #1: Explain it to a 10-year old child without technical jargon",
            "Timer pop: '25 Min Focus / 5 Min Break (Pomodoro Technique)'"
          ],
          musicMood: "Steady rhythmic lo-fi beats with calming rain sounds in the background",
          tamilComedyMeme: {
            comedian: "Vadivelu",
            movieRef: "Marudhamalai",
            iconicDialogue: "Aahaa.. Enna oru puthisalithanam!",
            memeContext: "Playful cutaway showing how students feel when they finally crack a difficult formula in 2 minutes."
          }
        },
        {
          sectionId: "sec-3",
          sectionTitle: "Spaced Repetition Schedule Demonstration",
          onScreenVisuals: "Screen share capture of interactive calendar scheduler mapping out 1-day, 3-day, and 7-day recall cycles.",
          imageUrl: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80",
          videoPreviewBadge: "Digital Screen &bull; High Contrast",
          bRollIdeas: [
            "Over-the-shoulder shot of typing summaries on backlit mechanical keyboard",
            "Quick montage of library bookshelves with soft bokeh lighting",
            "Student smiling with relief after scoring 95% on practice exam"
          ],
          stockKeywords: ["calendar schedule planner", "mechanical keyboard typing", "library books shelf study", "exam test score smiling"],
          graphicsOverlays: [
            "Spaced Repetition Intervals: Day 1 ➔ Day 3 ➔ Day 7 ➔ Day 21",
            "Free Notion Exam Revision Template Link on Screen"
          ],
          musicMood: "Uplifting ambient synthesizer with motivational build-up",
          tamilComedyMeme: {
            comedian: "Santhanam",
            movieRef: "Boss Engira Bhaskaran",
            iconicDialogue: "Nanba, idhula oru chinna twist irukku!",
            memeContext: "Comedic cutaway reminding students that cramming the night before exam guarantees sleepiness."
          }
        },
        {
          sectionId: "sec-4",
          sectionTitle: "Action Plan & Next Study Session",
          onScreenVisuals: "Host holding open notebook, smiling warmly with relaxed posture, giving closing study challenge.",
          imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
          videoPreviewBadge: "Studio Outro &bull; 4K Warm Key",
          bRollIdeas: [
            "Laptop shutting closed as timer dings successfully",
            "Pencil neatly placed in leather pencil case",
            "Closing shot of desk organized and ready for tomorrow"
          ],
          stockKeywords: ["laptop closing desk clean", "student thumbs up study space", "aesthetic desk daylight", "minimalist workspace"],
          graphicsOverlays: [
            "Comment 'STUDY' to get the free Notion Revision Master Template! 👇",
            "Subscribe for weekly high-performance learning breakdowns"
          ],
          musicMood: "Warm acoustic guitar fading out gracefully",
          tamilComedyMeme: {
            comedian: "Vadivelu",
            movieRef: "Thalainagaram",
            iconicDialogue: "Building strong-u, basement weak-u!",
            memeContext: "Final funny reminder: Don't buy 50 colorful pens if you haven't opened the textbook yet!"
          }
        }
      ]
    };
  }

  // Default Tech / Creator Studio Visuals
  return {
    overallMood: "Polished creative studio aesthetic. Moody charcoal & slate background with crisp directional key light and soft warm tungsten ambient glow.",
    colorPaletteSuggestion: "Charcoal Slate (#1E293B), Warm Amber Tungsten (#F59E0B), Cyan Edge Highlight (#06B6D4)",
    musicPacing: "Starts dead silent for hook impact, transitions to ambient electronic pulsing (115 BPM), peaks with driving cinematic beat during Pillar breakdown.",
    items: [
      {
        sectionId: "sec-1",
        sectionTitle: "The Pattern Interrupt (Viral Hook)",
        onScreenVisuals: "Host in medium close-up, sharp center framing. Behind host, dark studio with subtle vertical acoustic slat wall.",
        imageUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
        videoPreviewBadge: "4K 60fps &bull; Cinema Macro",
        bRollIdeas: [
          "Extreme close-up of computer mouse hovering over 'Discard Draft' button",
          "Downward angle time-lapse of exhausted creator staring into bright monitor in dark room",
          "Dynamic macro shot of camera lens rack-focusing from blurry blur to crisp aperture"
        ],
        stockKeywords: ["analytics graph plummeting", "exhausted video editor", "cinematic camera lens macro", "modern dark studio"],
        graphicsOverlays: [
          "Red glowing retention drop line graphic over the host's shoulder",
          "Bold kinetic text pop: 'STOP WASTING 15 HOURS'",
          "Timestamp counter rapidly counting backwards"
        ],
        musicMood: "Silence for 5 seconds, followed by a heavy sub-bass drop and subtle rhythmic tick",
        tamilComedyMeme: {
          comedian: "Vadivelu",
          movieRef: "Winner (Kaipulla)",
          iconicDialogue: "Venaam... Valikidhu... Azhudhuduven!",
          memeContext: "Cutaway to Kaipulla crying face when explaining that 70% of viewers leave after 15 seconds."
        }
      },
      {
        sectionId: "sec-2",
        sectionTitle: "The Status Quo Dilemma",
        onScreenVisuals: "Host steps back to wider 35mm angle, holding coffee mug, speaking casually toward camera 2.",
        imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80",
        videoPreviewBadge: "1080p B-Roll &bull; Multi-Track Edit",
        bRollIdeas: [
          "Split screen showing 12 open browser tabs and scattered sticky notes on messy desk",
          "Cinematic slow-motion shot of crumpled paper landing in wastebasket",
          "Screen recording of blinking text cursor on blank Google Doc"
        ],
        stockKeywords: ["browser tabs clutter", "creative burnout", "blinking cursor blank page", "desk overhead flatlay"],
        graphicsOverlays: [
          "Split comparison bar: 'Winging It (14 Hrs)' vs 'Structured Pipeline (45 Mins)'",
          "Lower third badge with host name and title 'AI Content Director'"
        ],
        musicMood: "Warm lo-fi synth groove with subtle vinyl crackle (95 BPM)",
        tamilComedyMeme: {
          comedian: "Prabhu / Vadivelu",
          movieRef: "Chandramukhi",
          iconicDialogue: "Enna koduma Saravanan idhu!",
          memeContext: "Pop-up reaction meme when showing the mess of 20 unorganized tabs and blank scripts."
        }
      },
      {
        sectionId: "sec-3",
        sectionTitle: "The 3 Pillars of the Director's Pipeline",
        onScreenVisuals: "Host seated at studio console table with an iPad Pro / monitor sketching out the 3 pillars in real-time.",
        imageUrl: "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80",
        videoPreviewBadge: "Color Graded &bull; High Contrast",
        bRollIdeas: [
          "Top-down capture of hands sketching digital flowchart on glass tablet",
          "Fast-paced collage of B-roll reels: city streets, drone cityscapes, code screens",
          "Over-the-shoulder shot of video editing timeline playing back multi-track footage"
        ],
        stockKeywords: ["digital diagram tablet", "timeline video editor 4k", "cinematic city drone night", "creative workflow diagram"],
        graphicsOverlays: [
          "3D holographic badge: 'PILLAR 1: DECOUPLE IDEATION'",
          "Animated timer graphic showing '45-Second Visual Reset'",
          "Kinetic typography highlighting key takeaway statistics"
        ],
        musicMood: "Driving electronic pulse with energetic percussion, building momentum and excitement",
        tamilComedyMeme: {
          comedian: "Vadivelu",
          movieRef: "Thalainagaram (Naai Sekar)",
          iconicDialogue: "Building strong-u, basement weak-u!",
          memeContext: "Hilarious cutaway to Naai Sekar explaining why expensive camera gear fails if story structure is weak."
        }
      },
      {
        sectionId: "sec-4",
        sectionTitle: "The Direct Call to Action",
        onScreenVisuals: "Host returns to intimate medium close-up, warm engaging posture, smiling naturally.",
        imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80",
        videoPreviewBadge: "Studio Outro &bull; 4K Warm Key",
        bRollIdeas: [
          "Mockup preview of downloadable production PDF scrolling on a clean MacBook screen",
          "Community comments notification animation popping up dynamically",
          "Clean studio lights softly dimming as video ends"
        ],
        stockKeywords: ["laptop mockup display", "youtube subscribe button animation", "studio lights fade", "minimalist desk setup"],
        graphicsOverlays: [
          "Sleek animated Subscribe & Bell button lower third",
          "Arrow pointing downwards: 'FREE PRODUCTION TEMPLATES IN DESCRIPTION'",
          "End card placeholders for next recommended video"
        ],
        musicMood: "Uplifting, warm ambient outro fading out on acoustic chords",
        tamilComedyMeme: {
          comedian: "Santhanam / Vadivelu",
          movieRef: "Boss Engira Bhaskaran",
          iconicDialogue: "Aha... Oru mudivoda thaan vandhurukanga!",
          memeContext: "Playful cutaway acknowledging creators who watched till the end and are ready to execute."
        }
      }
    ]
  };
}

export function generateMockShotList(meta: ProjectMetadata, visuals?: VisualsData): ShotListData {
  const topic = meta.topic || "Food Review";
  const theme = detectTopicTheme(topic);
  const category = theme.category;
  const isTamil =
    (meta.language || "").toLowerCase().includes("tamil") ||
    (meta.language || "").toLowerCase().includes("tanglish");

  if (category === "food") {
    return {
      totalShots: 10,
      estimatedShootHours: "1.5 Hours",
      locationSummary: ["Outdoor Shop Entrance & Signboard", "Firewood Kitchen & Dum Area", "Dining Table / Taste Corner"],
      shots: [
        {
          id: "shot-1",
          shotNumber: 1,
          scene: "Scene 1: Sizzling Reveal Hook",
          shotType: "Medium Shot",
          cameraMovement: "Slow Push-in",
          locationSetup: "Dining Table, 35mm lens, warm natural window light catching rising steam",
          dialogueVo: isTamil
            ? "Makkale! Innaiku namma enga vandhirukkom theriyuma? 40-year old authentic Ambur Star Biryani spot!"
            : "Food lovers, today we found the most legendary secret culinary spot in the city!",
          duration: "5s",
          notes: "High energy, wide smile, leaning in over steaming claypot.",
          isCompleted: false
        },
        {
          id: "shot-2",
          shotNumber: 2,
          scene: "Scene 1: Macro Steam & Meat Scoop",
          shotType: "Extreme Close-Up",
          cameraMovement: "Slow Push-in",
          locationSetup: "Macro 100mm lens, 4K 60fps, gold rim light",
          dialogueVo: isTamil
            ? "Look at this steaming seeraga samba rice and tender mutton..."
            : "Look at this piping hot dum biryani—the aroma fills the entire street.",
          duration: "4s",
          notes: "Focus on ladle lifting steaming aromatic rice and tender mutton.",
          isCompleted: false
        },
        {
          id: "shot-3",
          shotNumber: 3,
          scene: "Scene 2: Kitchen Entrance",
          shotType: "Wide",
          cameraMovement: "Handheld",
          locationSetup: "Stepping inside kitchen, gimbal handheld 24mm",
          dialogueVo: isTamil
            ? "Kitchen kulla poi paatha... pure firewood dum cooking! 4 hours slow cook..."
            : "Stepping straight into the master kitchen—they've been slow-cooking over real firewood.",
          duration: "6s",
          notes: "Atmospheric kitchen smoke and amber charcoal glow.",
          isCompleted: false
        },
        {
          id: "shot-4",
          shotNumber: 4,
          scene: "Scene 2: Roaring Fire Wok Toss",
          shotType: "Close-Up",
          cameraMovement: "Pan",
          locationSetup: "Master wok station, 120fps high speed",
          dialogueVo: isTamil
            ? "Chef andha masala-va toss panna odane leapaana flame paatheengala? Appadiye shock aayitten!"
            : "The chef tosses the whole spices into the sizzling wok, and the flame flares up immediately!",
          duration: "5s",
          notes: "Slow-motion flame flare as fresh clarified ghee hits the wok.",
          isCompleted: false
        },
        {
          id: "shot-5",
          shotNumber: 5,
          scene: "Scene 3: First Hot Bite Reaction",
          shotType: "Medium Shot",
          cameraMovement: "Static",
          locationSetup: "Table setup, 50mm f/1.8, warm key light",
          dialogueVo: isTamil
            ? "First bite eduthom pa... Spoon vechaale tender-ah odaiyudhu!"
            : "Taking the very first piping hot bite. The meat shreds apart with a spoon.",
          duration: "7s",
          notes: "Genuine taste reaction, closed eyes enjoying the flavor.",
          isCompleted: false
        },
        {
          id: "shot-6",
          shotNumber: 6,
          scene: "Scene 3: Spoon Texture Test",
          shotType: "Extreme Close-Up",
          cameraMovement: "Static",
          locationSetup: "Over-the-plate 90 degree macro angle",
          dialogueVo: isTamil
            ? "Andha pepper, mild cloves, and cooling curd onion raita combo bayangaramaana blast!"
            : "That subtle kick of black pepper, caramelized onions, and cooling mint raita...",
          duration: "5s",
          notes: "Audio: Crisp spoon cutting meat cleanly with no tugging.",
          isCompleted: false
        },
        {
          id: "shot-7",
          shotNumber: 7,
          scene: "Scene 3: Comedic Reaction Cutaway",
          shotType: "Medium Shot",
          cameraMovement: "Handheld",
          locationSetup: "Host leaning back with satisfied expression",
          dialogueVo: isTamil
            ? "Building strong-u, basement-um strong-u nu solla vaikkura taste!"
            : "Absolute 10 out of 10 texture and flavor balance!",
          duration: "4s",
          notes: "Double thumbs up, playful laugh, fast edit cut.",
          isCompleted: false
        },
        {
          id: "shot-8",
          shotNumber: 8,
          scene: "Scene 4: Bill Receipt Audit",
          shotType: "Close-Up",
          cameraMovement: "Tilt",
          locationSetup: "Handheld camera tilting from receipt to host's face",
          dialogueVo: isTamil
            ? "Total bill just ₹240 thaan! Full unlimited feast, complete paisa vasool!"
            : "The entire royal feast came out to just under $8! 100% worth it.",
          duration: "5s",
          notes: "Displaying exact bill amount clearly on camera.",
          isCompleted: false
        },
        {
          id: "shot-9",
          shotNumber: 9,
          scene: "Scene 4: Friend Tag CTA",
          shotType: "Medium Shot",
          cameraMovement: "Slow Push-in",
          locationSetup: "Front facing dining table, key light boosted",
          dialogueVo: isTamil
            ? "Unga biryani addict friend-ah ippove comment-la tag pannunga who owes you a treat!"
            : "Tag your ultimate foodie partner in the comments who owes you a food hunt!",
          duration: "5s",
          notes: "Pointing directly into camera lens with friendly smile.",
          isCompleted: false
        },
        {
          id: "shot-10",
          shotNumber: 10,
          scene: "Scene 4: Clean Plate Outro",
          shotType: "Extreme Close-Up",
          cameraMovement: "Pull-out",
          locationSetup: "Top-down view of polished empty banana leaf / plate",
          dialogueVo: isTamil
            ? "மறக்காம Subscribe பண்ணி பெல் ஐகான் தட்டுங்க மக்களே! Next spot-la paakalam!"
            : "Hit that follow button for more food quests! See you on the next hunt!",
          duration: "4s",
          notes: "Clean visual punctuation with animated subscribe lower-third.",
          isCompleted: false
        }
      ]
    };
  }

  return {
    totalShots: 8,
    estimatedShootHours: "1.5 Hours",
    locationSummary: ["Main Host Setup", "Hands-On Demo Rig", "Dynamic B-Roll Cutaway"],
    shots: [
      {
        id: "shot-1",
        shotNumber: 1,
        scene: "Scene 1: Hook & Core Premise",
        shotType: "Medium Shot",
        cameraMovement: "Slow Push-in",
        locationSetup: "Main Desk Setup, 50mm f/1.8, Key Light 45 deg",
        dialogueVo: isTamil
          ? `Makkale! Innaiku namma paaka pora "${topic}" pathi unmai enna nu paakuvom!`
          : `If you're exploring "${topic}", here is what actually works in the real world!`,
        duration: "6s",
        notes: "Deadpan delivery, confident eye contact.",
        isCompleted: false
      },
      {
        id: "shot-2",
        shotNumber: 2,
        scene: "Scene 1: Proof B-Roll",
        shotType: "Close-Up",
        cameraMovement: "Handheld",
        locationSetup: "Hands-on demonstration or screen capture",
        dialogueVo: isTamil
          ? "Skip pannama full-ah paarunga, ungalukku semma clarity kedaikum!"
          : "We are cutting through the noise to reveal what matters.",
        duration: "5s",
        notes: "Sharp focus on live metrics or physical subject.",
        isCompleted: false
      },
      {
        id: "shot-3",
        shotNumber: 3,
        scene: "Scene 2: The Bottleneck",
        shotType: "Wide",
        cameraMovement: "Static",
        locationSetup: "Wide angle showing creator environment",
        dialogueVo: isTamil
          ? `Namma la pala per indha mistake-ah daily repeat pandrom...`
          : `Most people struggle with this because they focus on surface-level symptoms...`,
        duration: "7s",
        notes: "Natural body language, gesturing toward demonstration.",
        isCompleted: false
      },
      {
        id: "shot-4",
        shotNumber: 4,
        scene: "Scene 3: Live Breakthrough",
        shotType: "Over-the-Shoulder",
        cameraMovement: "Pan",
        locationSetup: "Over host's shoulder looking at key demonstration",
        dialogueVo: isTamil
          ? "Idho namma key solution! Building strong-u basement-um strong-u!"
          : "Here is the framework that changes everything. Watch the live comparison!",
        duration: "8s",
        notes: "Dynamic pan across the core demonstration.",
        isCompleted: false
      },
      {
        id: "shot-5",
        shotNumber: 5,
        scene: "Scene 4: Call to Action",
        shotType: "Medium Shot",
        cameraMovement: "Slow Push-in",
        locationSetup: "Centered framing, warm key light",
        dialogueVo: isTamil
          ? "மறக்காம Subscribe பண்ணி பெல் ஐகான் தட்டுங்க மக்களே!"
          : "Grab the complete resource guide linked below and hit subscribe!",
        duration: "6s",
        notes: "Warm authentic smile, direct gesture toward link.",
        isCompleted: false
      }
    ]
  };
}

export function generateMockPublishing(meta: ProjectMetadata, script?: ScriptData): PublishingData {
  const topic = meta.topic || "AI Video Production";
  const lowerTopic = topic.toLowerCase();
  const isTamil =
    (meta.language || "").toLowerCase().includes("tamil") ||
    (meta.language || "").toLowerCase().includes("tanglish");
  const theme = detectTopicTheme(topic);
  const category = theme.category;

  let referenceVideos: ReferenceVideoItem[] = [];

  if (
    lowerTopic.includes("food") ||
    lowerTopic.includes("biryani") ||
    lowerTopic.includes("restaurant") ||
    lowerTopic.includes("dosa") ||
    lowerTopic.includes("burger") ||
    lowerTopic.includes("pizza") ||
    lowerTopic.includes("cafe") ||
    lowerTopic.includes("cooking") ||
    lowerTopic.includes("street food") ||
    lowerTopic.includes("dining")
  ) {
    if (isTamil) {
      referenceVideos = [
        {
          id: "ref-food-tamil-1",
          title: "🔥 Midnight Unlimited Mutton Biryani Hunt in Chennai! 🍗 (Sensational Taste Review)",
          channel: "Irfan's View (5.4M Views)",
          url: "https://www.youtube.com/results?search_query=irfan+view+biryani+review+reel",
          views: "5.4M Views",
          whyItWorks: "Unmatched genuine energy, mouthwatering extreme close-ups, and instant price-to-taste breakdown within the first 5 seconds.",
          thumbnailUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
          tag: "Top Viral Tamil Food Vlogger"
        },
        {
          id: "ref-food-tamil-2",
          title: "🤤 Hidden 50-Year Old Crispy Ghee Roast Dosa Stall! (Sound On ASMR)",
          channel: "Peppa Foodie (3.8M Views)",
          url: "https://www.youtube.com/results?search_query=peppa+foodie+chennai+dosa+street+food",
          views: "3.8M Views",
          whyItWorks: "Sizzling butter audio (ASMR), snappy 30-second cutaways, and authentic conversational Tanglish slang.",
          thumbnailUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80",
          tag: "Viral Instagram Reel Style"
        },
        {
          id: "ref-food-tamil-3",
          title: "Traditional 100KG Mutton Sukka Feast in Village! 🌿",
          channel: "Village Cooking Channel (18.2M Views)",
          url: "https://www.youtube.com/results?search_query=village+cooking+channel+feast",
          views: "18.2M Views",
          whyItWorks: "Pure visual storytelling, natural outdoor cooking sounds, massive communal payoff, and heartfelt hospitality.",
          thumbnailUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
          tag: "Mega Viral Hit (18M+)"
        },
        {
          id: "ref-food-tamil-4",
          title: "Chettinad Spicy Crab Masala & Parotta Blast! 🦀",
          channel: "Ahaa Enna Rusi (2.4M Views)",
          url: "https://www.youtube.com/results?search_query=tamil+food+review+reels",
          views: "2.4M Views",
          whyItWorks: "Dramatic flavor score rating, slow-motion crab cracking, and hilarious reaction memes.",
          thumbnailUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
          tag: "High Retention Review"
        }
      ];
    } else {
      referenceVideos = [
        {
          id: "ref-food-eng-1",
          title: "EPIC Spicy Street Food Feast! 🌶️ (Extreme Flavor & Honest Taste Review)",
          channel: "Mark Wiens (8.9M Views)",
          url: "https://www.youtube.com/results?search_query=mark+wiens+street+food+review",
          views: "8.9M Views",
          whyItWorks: "Iconic head-nodding reaction, hyper-vivid macro camera work, and infectious culinary enthusiasm.",
          thumbnailUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
          tag: "Global Food Icon"
        },
        {
          id: "ref-food-eng-2",
          title: "Bangalore's Legendary Donne Biryani & Mutton Chops Secret Taste Test",
          channel: "Food Lovers TV (4.2M Views)",
          url: "https://www.youtube.com/results?search_query=food+lovers+tv+biryani",
          views: "4.2M Views",
          whyItWorks: "Deep culinary heritage context, articulate flavor descriptions, and cinematic macro visuals.",
          thumbnailUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80",
          tag: "Articulate Food Journalism"
        },
        {
          id: "ref-food-eng-3",
          title: "VIRAL Egg Fried Rice Review & Breakdown (Haiyaa vs Fuiyoh!)",
          channel: "Uncle Roger / Nigel Ng (16.5M Views)",
          url: "https://www.youtube.com/results?search_query=uncle+roger+food+review",
          views: "16.5M Views",
          whyItWorks: "Character comedy, high-speed comedic pacing, and sharp culinary critiques that keep retention above 85%.",
          thumbnailUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
          tag: "Comedy Food Mega Hit"
        }
      ];
    }
  } else if (
    lowerTopic.includes("study") ||
    lowerTopic.includes("exam") ||
    lowerTopic.includes("book") ||
    lowerTopic.includes("notebook") ||
    lowerTopic.includes("tips") ||
    lowerTopic.includes("student") ||
    lowerTopic.includes("learn")
  ) {
    if (isTamil) {
      referenceVideos = [
        {
          id: "ref-edu-tamil-1",
          title: "How to Memorize Anything 10X Faster (Gen-Z Tamil Study Hacks) 🧠",
          channel: "Madan Gowri (3.8M Views)",
          url: "https://www.youtube.com/results?search_query=madan+gowri+study+tips",
          views: "3.8M Views",
          whyItWorks: "Conversational Tanglish style, immediate pattern interrupts, and relatable exam student humor.",
          thumbnailUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
          tag: "High Engagement Tamil Storyteller"
        },
        {
          id: "ref-edu-tamil-2",
          title: "Science Explained in 5 Minutes: The Power of Spaced Repetition",
          channel: "Let's Make Engineering Simple - LMES (2.9M Views)",
          url: "https://www.youtube.com/results?search_query=lmes+tamil+science",
          views: "2.9M Views",
          whyItWorks: "Simple real-life analogies, lively animations, and zero complicated jargon.",
          thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80",
          tag: "Clear Visual Concept Teacher"
        }
      ];
    } else {
      referenceVideos = [
        {
          id: "ref-edu-eng-1",
          title: "How to Study for Exams Without Cramming (The Scientific Method)",
          channel: "Ali Abdaal (5.1M Views)",
          url: "https://www.youtube.com/results?search_query=ali+abdaal+how+to+study",
          views: "5.1M Views",
          whyItWorks: "Flawless kinetic graphics, evidence-backed breakdown, and calm soothing delivery.",
          thumbnailUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
          tag: "Productivity Masterclass"
        },
        {
          id: "ref-edu-eng-2",
          title: "How To Build Unbreakable Focus in a World of Distractions",
          channel: "Kurzgesagt – In a Nutshell (14.2M Views)",
          url: "https://www.youtube.com/results?search_query=kurzgesagt+deep+work",
          views: "14.2M Views",
          whyItWorks: "World-class motion design, suspenseful music pacing, and mind-bending cognitive insights.",
          thumbnailUrl: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=600&q=80",
          tag: "Motion Design Phenomenon"
        }
      ];
    }
  } else {
    // Default Creator / Tech Reference Videos
    if (isTamil) {
      referenceVideos = [
        {
          id: "ref-tech-tamil-1",
          title: "💥 Top 5 Secret AI Tools That Will Blow Your Mind! 🤖",
          channel: "Tamil Tech (3.6M Views)",
          url: "https://www.youtube.com/results?search_query=tamil+tech+ai+tools",
          views: "3.6M Views",
          whyItWorks: "Direct problem-first hook, fast-paced screencasts, and clear Tanglish commentary.",
          thumbnailUrl: "https://images.unsplash.com/photo-1534972195531-a756b1126f24?auto=format&fit=crop&w=600&q=80",
          tag: "Tamil Tech Pioneer"
        },
        {
          id: "ref-tech-tamil-2",
          title: "Best Flagship Killer Smartphone Under ₹25,000 (Honest Camera Test)",
          channel: "Tech Boss Tamil (2.8M Views)",
          url: "https://www.youtube.com/results?search_query=tech+boss+smartphone+review",
          views: "2.8M Views",
          whyItWorks: "Punchy edits, real-world camera shootout samples, and comedic meme cutaways.",
          thumbnailUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80",
          tag: "Tech Boss Viral Review"
        }
      ];
    } else {
      referenceVideos = [
        {
          id: "ref-creator-eng-1",
          title: "The Blind Smartphone Camera Test: Does Gear Actually Matter?",
          channel: "Marques Brownlee - MKBHD (9.4M Views)",
          url: "https://www.youtube.com/results?search_query=mkbhd+camera+test",
          views: "9.4M Views",
          whyItWorks: "Immaculate studio lighting, crisp Red 8K cinematography, and high-trust unbiased analysis.",
          thumbnailUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80",
          tag: "Gold Standard Tech Review"
        },
        {
          id: "ref-creator-eng-2",
          title: "I Tested the 10 Craziest AI Inventions on Earth!",
          channel: "Mrwhosetheboss (14.2M Views)",
          url: "https://www.youtube.com/results?search_query=mrwhosetheboss+tech",
          views: "14.2M Views",
          whyItWorks: "Hyper-energetic pacing, visual resets every 25 seconds, and colorful studio set design.",
          thumbnailUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80",
          tag: "Algorithm Pacing King"
        }
      ];
    }
  }

  const isFoodCategory =
    category === "food" ||
    lowerTopic.includes("food") ||
    lowerTopic.includes("biryani") ||
    lowerTopic.includes("dosa") ||
    lowerTopic.includes("restaurant") ||
    lowerTopic.includes("cooking");

  const isEduCategory =
    category === "education" ||
    lowerTopic.includes("study") ||
    lowerTopic.includes("exam") ||
    lowerTopic.includes("book") ||
    lowerTopic.includes("tips");

  let titleOptions: string[] = [];
  let seoDescription = "";
  let hashtags: string[] = [];
  let tags: string[] = [];
  let thumbnailIdeas: any[] = [];
  let captions: any = {};

  if (isFoodCategory) {
    if (isTamil) {
      titleOptions = [
        `🔥 ₹150-ku Mutton Biryani-a?! 🤯 Semma Worth Spot Found in Chennai!`,
        `Idha Saapta Apram Vera Edhum Pidikaathu! 🤤 Authentic Secret Spot Review`,
        `Worst or Best-u?! 💥 Honest Review of Chennai's Most Hyped Biryani`,
        `Makkale! Indha Spot-ah Miss Pannave Pannadheenga! 🍗 Midnight Food Hunt`,
        `Building Strong-u Basement-um Strong-u! ⭐️ 5/5 Foodie Verdict #shorts`,
        `Aahaa Enna Oru Taste-u! 🤤 Pure Ghee Roast Dosa Experience #reels`
      ];

      seoDescription = `Makkale! Innaiku namma Chennai-la 40 varushama secret-ah firewood dum potu biryani tharra spot visit panni honest review panni irukkom! Seeraga samba rice and tender mutton tenderness vera level!\n\n⏱️ TIMESTAMPS:\n0:00 - Sizzling Food Reveal\n0:20 - Kitchen Firewood Dum Secret\n0:50 - First Hot Bite & Texture Blast\n1:25 - Dalcha & Spice Meter Audit\n1:45 - Bill Breakdown & Final Verdict\n\n📍 LOCATION & PRICING:\n- Spot: Authentic Ambur Star Biryani Spot, Royapettah, Chennai\n- Price: ₹240 Unlimited Mutton Feast with Dalcha & Raita\n\nComment below unga favorite biryani spot in Tamil Nadu! மறக்காம Subscribe பண்ணி பெல் ஐகான் தட்டுங்க மக்களே!\n\n#chennaifoodie #tamilfoodreview #irfansview #peppafoodie #tamilfoodguide #biryanilovers #tanglishreels #chennaistreetfood #tamilvlogger`;

      hashtags = ["#chennaifoodie", "#tamilfoodreview", "#irfansview", "#peppafoodie", "#biryanilovers", "#tanglishreels", "#tamilvlog"];
      tags = ["chennaifoodie", "tamil food review", "irfans view", "peppa foodie", "ambur biryani", "chennai street food", "tanglish reels", "foodie verdict"];

      thumbnailIdeas = [
        {
          mainText: "₹150 MUTTON BIRYANI?!",
          visualConcept: "Host wide-eyed holding smoking hot claypot of Biryani with tender mutton piece dripping in slow-mo ghee",
          colorContrast: "High-voltage fiery yellow and red typography on dark restaurant backdrop"
        },
        {
          mainText: "WORST OR BEST-U?!",
          visualConcept: "Split screen: Viral Instagram post hype vs host's unfiltered first bite reaction with question mark banner",
          colorContrast: "Electric neon cyan text with golden food glow"
        },
        {
          mainText: "5/5 VERDICT ⭐️",
          visualConcept: "Extreme close-up spoon cutting tender meat with gold star badges floating",
          colorContrast: "Emerald green and gold on deep charcoal"
        }
      ];

      captions = {
        youtube: {
          title: `🔥 ₹150-ku Mutton Biryani-a?! 🤯 Semma Worth Spot Found in Chennai! (Honest Review)`,
          description: seoDescription,
          tags: tags
        },
        instagramReels: {
          caption: `Makkale! 40 varushama Chennai-la secret-ah firewood dum potu biryani tharra spot kedaichurukku! 🔥🤤\n\nSpoon vechaale mutton tender-ah butter maari melt aagudhu. Unlimited seeraga samba rice, brinjal dalcha, and curd pachadi combo vera level blast!\n\n💰 Price: ₹240 Unlimited Feast\n📍 Location: Triplicane / Royapettah, Chennai (Maps pin in bio)\n\nUnga Biryani partner-ah ippove comment-la tag pannunga who owes you a treat! 👇🍗\n\n#chennaifoodie #tamilfoodreview #irfansview #peppafoodie #tamilfoodguide #biryanilovers #tanglishreels #chennaistreetfood #tamilvlogger`,
          hashtags: hashtags
        },
        tiktok: {
          caption: `₹150-ku indha maari mutton biryani-a?! 🤯 Wait for the tender meat pull! #tamilfoodie #chennaifood #streetfood #biryani #fyp`,
          soundIdea: "Trending Sizzling Kitchen ASMR / Tamil Street Beats",
          hashtags: hashtags
        },
        linkedin: {
          hook: `How a 40-year old mom-and-pop food stall in Chennai sells out 300+ plates in 2 hours with ZERO marketing spend.`,
          postBody: `Product-Market Fit in the culinary world comes down to three non-negotiable fundamentals:\n\n1. Obsessive Craft: Firewood dum cooking for 4 hours with Seeraga Samba rice.\n2. Transparent Value: Unlimited portion at ₹240 with zero hidden add-ons.\n3. Word-of-Mouth Engine: Customers become organic brand ambassadors.\n\nGreat storytelling doesn't manufacture hype—it simply documents authentic excellence.`,
          callToDiscussion: `What is your favorite local eatery that relies 100% on product quality over marketing?`
        },
        x: {
          thread: [
            `1/ Chennai foodies! We just discovered a 40-year-old firewood dum biryani spot that sells out 300 plates in 2 hours. Here is the unfiltered review: 🧵👇`,
            `2/ The Aroma: Cooked over charcoal embers with stone-ground kalpasi and cow ghee. The fragrance hits before you even step inside.`,
            `3/ The Meat: Mutton separates from the bone with just a spoon. Zero chewy rubbery bits.`,
            `4/ The Accompaniments: Traditional brinjal dalcha cuts right through the richness of the ghee.`,
            `5/ Bill: ₹240 flat for unlimited feast. 10/10 must visit! Maps location in thread below 👇`
          ]
        }
      };
    } else {
      titleOptions = [
        `I Found The City's Most Hyped $3 Street Food Spot! 🔥 (Worth The Queue?)`,
        `Street Food vs 5-Star Luxury: The Blind Taste Test 🤤`,
        `The 40-Year Firewood Dum Secret They Never Tell You!`,
        `Midnight Food Hunting: The 2 AM Secret Feast You Must Try`,
        `Eating At The Most Viral Food Spot (Honest Unfiltered Review)`
      ];

      seoDescription = `Today we track down the city's most legendary heritage dum biryani stall! Slow cooked over real firewood for 4 hours, this hidden spot draws massive crowds. Here is our 100% unfiltered review on taste, texture, and pricing.\n\n⏱️ TIMESTAMPS:\n0:00 - Sizzling First Look\n0:20 - Inside the Firewood Kitchen\n0:50 - The Taste & Texture Test\n1:25 - The Secret Sauce & Dalcha\n1:45 - Final Bill & Verdict\n\n#StreetFood #FoodReview #Foodie #CulinaryQuest #Biryani`;
      hashtags = ["#StreetFood", "#FoodReview", "#Foodie", "#CulinaryQuest", "#Biryani"];
      tags = ["street food", "food review", "best food spot", "viral food", "food vlog"];
      thumbnailIdeas = [
        {
          mainText: "WORTH THE HYPE?!",
          visualConcept: "Host looking shocked holding steaming plate with melting tender meat close-up",
          colorContrast: "Vibrant yellow on deep restaurant black"
        }
      ];
      captions = {
        youtube: {
          title: titleOptions[0],
          description: seoDescription,
          tags
        },
        instagramReels: {
          caption: `Can a $3 street food stall beat an $80 luxury restaurant? 🤯\n\nWe tested this 40-year old firewood spot. The meat literally falls apart with a spoon! Drop a 🍗 in the comments if you'd try this!\n\n#foodreview #streetfood #foodvlog #reelsviral`,
          hashtags
        },
        tiktok: {
          caption: `The internet said this was the #1 street food. They were NOT lying! 🤤 #foodreview #foodtiktok #streetfood #fyp`,
          soundIdea: "Trending Sizzling Audio",
          hashtags
        },
        linkedin: {
          hook: `Why hyper-local authentic food operations crush commercial chains in customer loyalty.`,
          postBody: `Quality, consistency, and cultural heritage form an unbreakable moat.`,
          callToDiscussion: `What local spot in your city has the strongest customer loyalty?`
        },
        x: {
          thread: [
            `1/ We tested the city's most viral street food spot. Here's what we found: 🧵👇`
          ]
        }
      };
    }
  } else if (isEduCategory) {
    if (isTamil) {
      titleOptions = [
        `Exam-ku Munnaadi Idha Mattum Paarunga! 🧠 10X Memory Secret`,
        `Padichadhu Marakkaama Irukka Indha Simple Hack! 📚 Tanglish Study Tips`,
        `Top 3 Secret Study Tricks Toppers Hide From You! 🤫 #shorts`,
        `Stop Highlighting Everything Makkale! ❌ Aani Pudunga Venam Method`,
        `Exam Fear-ah Gaali Panna Indha Oru Technique Podhum! ⚡`
      ];

      seoDescription = `Makkale! Exam season-la 5 hours padichum exam hall-la blank aagura problem-ah solve panna indha Active Recall & Feynman technique use pannunga!\n\n#tamilstudy #studytips #madangowri #examprep #tamilgenz`;
      hashtags = ["#tamilstudy", "#studytips", "#madangowri", "#examprep", "#tamilgenz"];
      tags = ["tamil study tips", "active recall tamil", "exam hacks tanglish", "study motivation"];
      thumbnailIdeas = [
        {
          mainText: "STOP HIGHLIGHTING!",
          visualConcept: "Student throwing away highlighters, holding clean 1-page summary with 100% exam score badge",
          colorContrast: "Bright red warning text on clean minimalist desk"
        }
      ];
      captions = {
        youtube: { title: titleOptions[0], description: seoDescription, tags },
        instagramReels: {
          caption: `Stop highlighting your entire textbook makkale! ❌ It creates an illusion of learning. Try the 25-minute blank-sheet active recall hack instead. Save this reel for exam week! 📚⚡\n\n#tamilstudy #studytips #tamilvlog #tanglishreels`,
          hashtags
        },
        tiktok: {
          caption: `Toppers hide this study secret! 🤫 #tamilstudy #studytips #learnontiktok #fyp`,
          soundIdea: "Calming Lo-Fi Study Beats",
          hashtags
        },
        linkedin: {
          hook: `The science of learning: Why passive review fails in both academic exams and corporate upskilling.`,
          postBody: `Active recall and spaced intervals produce 3x better cognitive retention.`,
          callToDiscussion: `How does your team retain complex technical knowledge?`
        },
        x: { thread: [`1/ How to memorize complex subjects in half the time: 🧵👇`] }
      };
    } else {
      titleOptions = [
        `How to Memorize Anything 10X Faster (The Active Recall Hack) 🧠`,
        `Stop Highlighting Everything! Why 90% of Students Study Wrong`,
        `The 25-Minute Study System That Got Me Top Marks`,
        `How To Beat Exam Anxiety in 3 Simple Steps`,
        `The Science-Backed Study Routine for Maximum Focus`
      ];
      seoDescription = `Discover the evidence-backed active recall framework that eliminates exam anxiety.`;
      hashtags = ["#StudyTips", "#Productivity", "#ActiveRecall", "#StudentLife"];
      tags = ["study tips", "how to study", "active recall", "exam prep"];
      thumbnailIdeas = [
        {
          mainText: "10X FASTER MEMORY",
          visualConcept: "Split screen of messy cramming vs organized Notion notes and high exam score",
          colorContrast: "Electric yellow and white on scholar blue"
        }
      ];
      captions = {
        youtube: { title: titleOptions[0], description: seoDescription, tags },
        instagramReels: { caption: `Stop highlighting your books! Use active recall. Save this! ✨`, hashtags },
        tiktok: { caption: `The real study secret 🧠 #studytips #learnontiktok`, soundIdea: "Lo-Fi", hashtags },
        linkedin: { hook: `Cognitive retention benchmarks for modern learners.`, postBody: `Active recall outperforms passive review.`, callToDiscussion: `Your thoughts?` },
        x: { thread: [`1/ Master any subject with spaced repetition: 🧵👇`] }
      };
    }
  } else {
    // General / Other Topics
    titleOptions = isTamil
      ? [
          `🔥 ${topic} Pathi Ungalukku Idhellam Theriyuma?! Must Watch!`,
          `Makkale! ${topic} Secret Revealed! 🤯 Viral Truth`,
          `Worst or Best-u?! 💥 Honest Breakdown of ${topic}`,
          `Idha Mattum Follow Pannunga, Result Vera Level-la Irukkum! 🚀`,
          `Building Strong-u Basement-um Strong-u! ⭐️ ${topic} Breakdown`
        ]
      : [
          `The Unfiltered Truth About ${topic} (What They Won't Tell You)`,
          `I Tested ${topic} So You Don't Have To: Honest Breakdown`,
          `The 3 Things You Must Know About ${topic} in 2026`,
          `Is ${topic} Actually Worth It? Unbiased Analysis`,
          `The Complete Beginner to Pro Guide for ${topic}`
        ];

    seoDescription = `An in-depth, high-signal breakdown of "${topic}". We explore the core facts, real-world tests, and key takeaways.\n\n#${topic.replace(/[^a-zA-Z0-9]/g, '')} #Review #Guide`;
    hashtags = [`#${topic.replace(/[^a-zA-Z0-9]/g, '')}`, "#Trending", "#Guide", "#Analysis"];
    tags = [topic.toLowerCase(), "guide", "review", "unbiased review", "tips"];
    thumbnailIdeas = [
      {
        mainText: "THE REAL TRUTH",
        visualConcept: "Dramatic high contrast reaction shot with neon data graphics",
        colorContrast: "High-contrast neon yellow text on dark background"
      }
    ];
    captions = {
      youtube: { title: titleOptions[0], description: seoDescription, tags },
      instagramReels: { caption: `Everything you need to know about ${topic}! Watch till the end and share! 🔥`, hashtags },
      tiktok: { caption: `The truth about ${topic} 🤯 #fyp #trending`, soundIdea: "Trending Synth", hashtags },
      linkedin: { hook: `A deep dive into ${topic}.`, postBody: `Key insights and strategic takeaways.`, callToDiscussion: `What is your perspective?` },
      x: { thread: [`1/ Everything you need to know about ${topic}: 🧵👇`] }
    };
  }

  return {
    titleOptions,
    seoDescription,
    hashtags,
    tags,
    thumbnailIdeas,
    captions,
    referenceVideos,
    sampleVideoSummary: `A fast-paced review video featuring high-contrast visuals, kinetic typography, authentic reviewer commentary, and comedic Tamil movie cutaways.`
  };
}
