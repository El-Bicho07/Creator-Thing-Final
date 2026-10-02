import { MemeTemplate, TopicCategory } from "./types";

export const MEME_TEMPLATES: MemeTemplate[] = [
  // --- TAMIL CINEMA MEME LEGENDS ---
  {
    id: "vadivelu-kaipulla-valikudhu",
    name: "Kaipulla - Venaam Valikidhu",
    character: "Vadivelu",
    category: "tamil",
    movieOrOrigin: "Winner (2003)",
    defaultTopText: "WHEN THE FOOD BILL ARRIVES",
    defaultBottomText: "VENAAM... VALIKIDHU... AZHUDHUDUVEN!",
    iconicDialogue: "Venaam... Valikidhu... Azhudhuduven!",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
    situations: [
      "bill",
      "expensive",
      "spicy",
      "pain",
      "crying",
      "burn",
      "hurt",
      "loss",
      "price",
      "fail",
      "overpriced"
    ],
    vibe: "Emotional Damage & Hilarious Despair 😭🎭"
  },
  {
    id: "vadivelu-naai-sekar-building-strong",
    name: "Naai Sekar - Building Strong-u",
    character: "Vadivelu",
    category: "tamil",
    movieOrOrigin: "Thalainagaram (2006)",
    defaultTopText: "BOUGHT $3000 CAMERA & RGB LIGHTS",
    defaultBottomText: "BUILDING STRONG-U... BASEMENT ROMBA WEAK-U!",
    iconicDialogue: "Building strong-u, basement romba weak-u!",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
    situations: [
      "gear",
      "camera",
      "fake",
      "show off",
      "weak",
      "foundation",
      "looks good but bad",
      "overrated",
      "superficial"
    ],
    vibe: "Sarcastic Reality Check 🏛️🔨"
  },
  {
    id: "vadivelu-chandramukhi-saravanan",
    name: "Murugesan - Enna Koduma Saravanan",
    character: "Vadivelu",
    category: "tamil",
    movieOrOrigin: "Chandramukhi (2005)",
    defaultTopText: "RESTAURANT CHARGES ₹500 FOR WATER BOTTLE",
    defaultBottomText: "ENNA KODUMA SARAVANAN IDHU!",
    iconicDialogue: "Enna koduma Saravanan idhu!",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    situations: [
      "shock",
      "scam",
      "disaster",
      "unexpected",
      "nightmare",
      "cheated",
      "terrible",
      "unfair",
      "crazy"
    ],
    vibe: "Pure Horror & Melodrama 😱⚡"
  },
  {
    id: "vadivelu-ekambaram-puthisalithanam",
    name: "Ekambaram - Aahaa Enna Oru Puthisalithanam",
    character: "Vadivelu",
    category: "tamil",
    movieOrOrigin: "Marudhamalai (2007)",
    defaultTopText: "TRIED VIRAL LIFE HACK",
    defaultBottomText: "AAHAA... ENNA ORU PUTHISALITHANAM!",
    iconicDialogue: "Aahaa.. Enna oru puthisalithanam!",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    situations: [
      "stupid hack",
      "fail",
      "overconfident",
      "sarcasm",
      "genius",
      "mistake",
      "silly",
      "funny idea"
    ],
    vibe: "Mocking Superiority & Irony 🧠😏"
  },
  {
    id: "vadivelu-friends-nesamani-aani",
    name: "Contractor Nesamani - Aani Pudunga Venam",
    character: "Vadivelu",
    category: "tamil",
    movieOrOrigin: "Friends (2001)",
    defaultTopText: "WHEN JUNIOR EDITOR SUGGESTS A TRANSITION",
    defaultBottomText: "NEEYUM VARAVENAM... AANIYUM PUDUNGA VENAM!",
    iconicDialogue: "Neeyum vara venam, andha aaniyum pudunga venam!",
    imageUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80",
    situations: [
      "mess up",
      "destroy",
      "stop helping",
      "ruined",
      "colleague",
      "helper",
      "accident",
      "cancel"
    ],
    vibe: "Peak Frustration with Helpers 🔨🤦‍♂️"
  },
  {
    id: "santhanam-boss-twist",
    name: "Nalla Neram - Oru Chinna Twist",
    character: "Santhanam",
    category: "tamil",
    movieOrOrigin: "Boss Engira Bhaskaran (2010)",
    defaultTopText: "FOOD WAS 10/10 BUT...",
    defaultBottomText: "WAIT... IDHULA ORU CHINNA TWIST IRUKKU!",
    iconicDialogue: "Nanba, idhula oru chinna twist irukku!",
    imageUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80",
    situations: [
      "twist",
      "catch",
      "hidden terms",
      "plot twist",
      "secret",
      "condition",
      "surprise",
      "gotcha"
    ],
    vibe: "Clever Comic Smirk & Sudden Plot Twist 🌀😉"
  },
  {
    id: "santhanam-siruthai-shock",
    name: "Kaattu Poochi - Appadiye Shock Aayitten",
    character: "Santhanam",
    category: "tamil",
    movieOrOrigin: "Siruthai (2011)",
    defaultTopText: "SAW THE FOOD PORTION SIZE",
    defaultBottomText: "APPADIYE SHOCK AAYITTEN!",
    iconicDialogue: "Appadiye shock aayitten!",
    imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
    situations: [
      "shock",
      "huge portion",
      "unexpected",
      "jaw drop",
      "disbelief",
      "amazing",
      "stunned"
    ],
    vibe: "Wide-Eyed Stunned Disbelief 😲💥"
  },
  {
    id: "vivek-run-kakka-biryani",
    name: "Mohan - Kakka Biryani Moment",
    character: "Vivek",
    category: "tamil",
    movieOrOrigin: "Run (2002)",
    defaultTopText: "CHEAP STREET FOOD VENDOR: 10 RUPEES BIRYANI",
    defaultBottomText: "IDHU KAKKA BIRYANI DAA!",
    iconicDialogue: "Idhu kakka biryani daa!",
    imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
    situations: [
      "cheap food",
      "street food",
      "food review",
      "scam",
      "suspicious",
      "stomach ache",
      "food fail",
      "mystery meat"
    ],
    vibe: "Suspicious Food Review Panic 🍗🦅"
  },
  {
    id: "goundamani-vaazhaipazham",
    name: "Goundamani - Rendula Onnu Engada",
    character: "Goundamani & Senthil",
    category: "tamil",
    movieOrOrigin: "Karagattakaran (1989)",
    defaultTopText: "PAID FOR 2 PLATES OF BIRIYANI",
    defaultBottomText: "ONNU INGA IRUKKU... INNONNU ENGADA?!",
    iconicDialogue: "Adhu thaan idhu na... idhu thaan adhuva?!",
    imageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80",
    situations: [
      "missing food",
      "confusing bill",
      "argument",
      "where is it",
      "scam",
      "portion dispute",
      "math fail"
    ],
    vibe: "Hilarious Classic Banter & Missing Items 🍌🥊"
  },
  {
    id: "yogi-babu-enna-paatha",
    name: "Yogi Babu - Enna Paatha Epdi Theriyudhu",
    character: "Yogi Babu",
    category: "tamil",
    movieOrOrigin: "Kolamavu Kokila (2018)",
    defaultTopText: "CLIENT: DO 5 MORE REVISIONS FOR FREE",
    defaultBottomText: "ENNA PAATHA EPDI THERIYUDHU UNGALUKKU?",
    iconicDialogue: "Enna paatha epdi theriyudhu ungalukku?",
    imageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80",
    situations: [
      "disrespect",
      "free work",
      "low ball",
      "rude waiter",
      "insult",
      "unfair demand",
      "client issue"
    ],
    vibe: "Unimpressed Deadpan Stare 😒💼"
  },

  // --- UNIVERSAL / INTERNATIONAL MEMES ---
  {
    id: "drake-hotline-bling",
    name: "Drake Dislike / Like (Comparison)",
    character: "Drake",
    category: "universal",
    movieOrOrigin: "Hotline Bling Music Video",
    defaultTopText: "SPENDING 15 HOURS IN BLANK GOOGLE DOC",
    defaultBottomText: "USING 7-STAGE AI CONTENT DIRECTOR IN 30 MINS",
    iconicDialogue: "Nah ❌ vs Oh Yes ✅",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    situations: [
      "comparison",
      "old way vs new way",
      "upgrade",
      "better choice",
      "smart move",
      "workflow",
      "taste test",
      "preference"
    ],
    vibe: "Definitive A/B Preference ❌ vs ✅"
  },
  {
    id: "distracted-boyfriend",
    name: "Distracted Boyfriend (The Temptation)",
    character: "Couple on Street",
    category: "universal",
    movieOrOrigin: "Stock Photo by Antonio Guillem",
    defaultTopText: "ME TRYING TO EAT A HEALTHY SALAD",
    defaultBottomText: "EXTRA SPICY CRISPY FRIED CHICKEN PASSING BY",
    iconicDialogue: "Looking away from responsibility...",
    imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
    situations: [
      "distraction",
      "temptation",
      "cheating diet",
      "new shiny object",
      "switching tools",
      "craving",
      "guilty pleasure"
    ],
    vibe: "Irresistible Temptation & Wandering Eye 👀🍕"
  },
  {
    id: "surprised-pikachu",
    name: "Surprised Pikachu (Obvious Consequence)",
    character: "Pikachu",
    category: "universal",
    movieOrOrigin: "Pokémon Anime",
    defaultTopText: "ORDERS THE LEVEL 10 SPICY GHOST PEPPER",
    defaultBottomText: "LIPS & STOMACH ON FIRE: *SHOCKED*",
    iconicDialogue: ":O",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    situations: [
      "spicy food",
      "obvious fail",
      "surprise",
      "regret",
      "warned before",
      "consequences",
      "shock"
    ],
    vibe: "Mock Surprise Over Predictable Disaster 😮⚡"
  },
  {
    id: "this-is-fine-dog",
    name: "This Is Fine (Everything Burning)",
    character: "Question Hound",
    category: "universal",
    movieOrOrigin: "KC Green Webcomic",
    defaultTopText: "FOOD IS BURNING & RESTAURANT CLOSES IN 5 MINS",
    defaultBottomText: "THIS IS COMPLETELY FINE.",
    iconicDialogue: "This is fine.",
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    situations: [
      "chaos",
      "disaster",
      "deadline",
      "spill",
      "burning",
      "calm in chaos",
      "denial",
      "crash"
    ],
    vibe: "Stoic Acceptance of Total Disaster ☕🔥"
  }
];

export function findMemesForSituation(situationQuery: string, categoryFilter: "all" | "tamil" | "universal" = "all"): MemeTemplate[] {
  const queryWords = situationQuery
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  let filtered = MEME_TEMPLATES;
  if (categoryFilter !== "all") {
    filtered = filtered.filter((m) => m.category === categoryFilter);
  }

  if (queryWords.length === 0) {
    return filtered;
  }

  // Score each meme by keyword overlap
  const scored = filtered.map((meme) => {
    let score = 0;
    const textBlob = `${meme.name} ${meme.character} ${meme.movieOrOrigin} ${meme.iconicDialogue} ${meme.defaultTopText} ${meme.defaultBottomText} ${meme.situations.join(" ")}`.toLowerCase();

    for (const word of queryWords) {
      if (textBlob.includes(word)) score += 3;
      if (meme.situations.some((s) => s.includes(word) || word.includes(s))) score += 5;
      if (meme.character.toLowerCase().includes(word)) score += 4;
    }

    return { meme, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.meme);
}

export function getAutoSituationsForTopic(topic: string, isTamil: boolean): string[] {
  const lower = topic.toLowerCase();

  if (
    lower.includes("food") ||
    lower.includes("biryani") ||
    lower.includes("restaurant") ||
    lower.includes("dosa") ||
    lower.includes("cafe") ||
    lower.includes("street food") ||
    lower.includes("cooking")
  ) {
    return isTamil
      ? [
          "Food bill vandhadhum Kaipulla maari azhudha situation",
          "Biryani-la elaichi kedaikumbodhu reaction",
          "500 rupees water bottle bill-la paathappo Saravanan moment",
          "Kakka biryani range-la irukura street food review",
          "Unlimited biryani-la 2nd plate kekumbodhu waiter stare"
        ]
      : [
          "When the food bill is double what you calculated",
          "Biting directly into an elaichi in the biryani",
          "Pretending the ghost pepper wings aren't spicy on camera",
          "When the food looks 10x smaller than the menu photo",
          "Waiter judging you while you film your 4th dessert"
        ];
  }

  if (
    lower.includes("tech") ||
    lower.includes("code") ||
    lower.includes("ai") ||
    lower.includes("software") ||
    lower.includes("developer")
  ) {
    return isTamil
      ? [
          "Code local-la work aagi production-la crash aana moment",
          "Building strong-u but whole backend weak-u situation",
          "AI tool solludhu 1 click-la pannalam nu aana 5 hours aachu",
          "Junior dev push pannadhala server gaali aana Nesamani feeling"
        ]
      : [
          "Code works on my machine but gives 500 in production",
          "Spent $3000 on camera gear but video gets 12 views",
          "When the AI generates total gibberish at 2 AM",
          "Accidentally deleting the master branch on Friday evening"
        ];
  }

  if (
    lower.includes("study") ||
    lower.includes("exam") ||
    lower.includes("education") ||
    lower.includes("college")
  ) {
    return isTamil
      ? [
          "Exam hall-la question paper paathu shock aana moment",
          "Overnight padichadhu ellam blank aana Kaipulla situation",
          "Friends ellam easy exam nu sonnadhukku namma reaction"
        ]
      : [
          "Opening question 1 on the exam and realizing you studied wrong syllabus",
          "Saying 'I will study early tomorrow morning' at 3 AM",
          "Professor says the exam is open-book (meaning it is impossible)"
        ];
  }

  // Default general creator situations
  return isTamil
    ? [
        "15 hours video edit panni premiere pro crash aana feeling",
        "Camera-va paathu first 5 takes-la dialogue marandhu pochu",
        "Expensive camera vaangi building strong-u basement weak-u aachu",
        "Video release panni 30 seconds-laye viewers bounce aagura vali"
      ]
    : [
        "Premiere Pro crashes after 6 hours without saving",
        "Forgetting the script right after hitting record",
        "Spending 15 hours editing for 14 views (including your mom)",
        "When the audio had an echo the entire 45 minute shoot"
      ];
}
