window.SyndicateData = (function() {
  const fields = [
    "Technical writing", "Systems engineering", "Audio production", "Video essays",
    "3D concept art", "Illustration", "Game development tooling", "Architecture and design",
    "Ceramics or woodworking", "Data journalism", "Synth design", "Open-source maintainer",
    "Motion design", "Science communication", "Game composer", "Typography and lettering"
  ];

  const fieldAdjacency = {
    "Technical writing": { "Systems engineering": 0.95, "Open-source maintainer": 0.9, "Data journalism": 0.8 },
    "Systems engineering": { "Technical writing": 0.95, "Open-source maintainer": 0.95, "Game development tooling": 0.8 },
    "Audio production": { "Video essays": 0.9, "Game composer": 0.95, "Synth design": 0.9 },
    "Video essays": { "Audio production": 0.9, "Motion design": 0.85, "Science communication": 0.9 },
    "3D concept art": { "Illustration": 0.85, "Motion design": 0.9, "Architecture and design": 0.8 },
    "Illustration": { "3D concept art": 0.85, "Typography and lettering": 0.9, "Motion design": 0.8 },
    "Game development tooling": { "Systems engineering": 0.8, "Game composer": 0.8, "Open-source maintainer": 0.85 },
    "Architecture and design": { "3D concept art": 0.8, "Typography and lettering": 0.8, "Ceramics or woodworking": 0.7 },
    "Ceramics or woodworking": { "Architecture and design": 0.7, "Illustration": 0.6 },
    "Data journalism": { "Technical writing": 0.8, "Science communication": 0.9, "Video essays": 0.75 },
    "Synth design": { "Audio production": 0.9, "Game composer": 0.85, "Systems engineering": 0.7 },
    "Open-source maintainer": { "Systems engineering": 0.95, "Technical writing": 0.9, "Game development tooling": 0.85 },
    "Motion design": { "Video essays": 0.85, "3D concept art": 0.9, "Illustration": 0.8 },
    "Science communication": { "Data journalism": 0.9, "Video essays": 0.9, "Technical writing": 0.8 },
    "Game composer": { "Audio production": 0.95, "Game development tooling": 0.8, "Synth design": 0.85 },
    "Typography and lettering": { "Illustration": 0.9, "Architecture and design": 0.8, "Motion design": 0.75 }
  };

  const platformCompatibility = {
    "Substack": { "Podcast": 0.8, "YouTube": 0.6, "GitHub": 0.7, "Instagram": 0.4, "Twitter": 0.8 },
    "Podcast": { "Substack": 0.8, "YouTube": 0.85, "Instagram": 0.5, "GitHub": 0.4, "Twitter": 0.7 },
    "YouTube": { "Podcast": 0.85, "Instagram": 0.75, "Substack": 0.6, "GitHub": 0.6, "Twitter": 0.8 },
    "GitHub": { "Substack": 0.7, "YouTube": 0.6, "Twitter": 0.85, "Podcast": 0.4, "Instagram": 0.3 },
    "Instagram": { "YouTube": 0.75, "Twitter": 0.7, "Substack": 0.4, "Podcast": 0.5, "GitHub": 0.3 },
    "Twitter": { "Substack": 0.8, "GitHub": 0.85, "YouTube": 0.8, "Podcast": 0.7, "Instagram": 0.7 }
  };

  const synonyms = {
    "blender": ["3d", "modeling", "cgi"],
    "rust": ["systems", "c++", "performance"],
    "react": ["frontend", "javascript", "ui"],
    "writing": ["prose", "essay", "journalism"],
    "audio": ["sound", "music", "production"],
    "design": ["ui", "ux", "visual", "art"],
    "video": ["film", "editing", "youtube"]
  };

  const creators = [
    {
      id: "c01", name: "Alice Zhang", handle: "@alice_tech", initials: "AZ",
      platform: "Substack", verified: true, location: "London, UK", timezone: "UTC+1",
      field: "Technical writing", tags: ["documentation", "api design", "rust", "systems"],
      interests: ["documentation", "api design", "rust", "systems", "open source"],
      audience: 24500, engagementRate: 8.2, cadence: "Weekly posts",
      sharedAudience: 0.15,
      openGoals: ["Publish research or open-source work together", "Reach each other's audiences"],
      bio: "Demystifying complex backend systems through clear prose. I write deep-dives on Rust and distributed architecture.",
      pastCollab: "A joint whitepaper on API versioning with a systems engineer."
    },
    {
      id: "c02", name: "Marcus Thorne", handle: "@mthorne_sys", initials: "MT",
      platform: "GitHub", verified: false, location: "Austin, TX", timezone: "UTC-6",
      field: "Systems engineering", tags: ["performance", "c++", "networking", "compilers"],
      interests: ["performance", "c++", "networking", "compilers", "rust"],
      audience: 18200, engagementRate: 12.5, cadence: "Monthly posts",
      sharedAudience: 0.1,
      openGoals: ["Swap skills and make something together", "Publish research or open-source work together"],
      bio: "Optimising at the metal level. Building tools that shave milliseconds off server response times.",
      pastCollab: "Co-maintained a popular C++ networking library."
    },
    {
      id: "c03", name: "Elara Vance", handle: "@elara_sounds", initials: "EV",
      platform: "Podcast", verified: true, location: "Berlin, DE", timezone: "UTC+2",
      field: "Audio production", tags: ["sound design", "interviews", "mixing", "gear"],
      interests: ["sound design", "interviews", "mixing", "gear", "synthesis"],
      audience: 42100, engagementRate: 6.8, cadence: "Bi-weekly posts",
      sharedAudience: 0.25,
      openGoals: ["Appear as a guest on each other's channel", "Swap skills and make something together"],
      bio: "Exploring the texture of sound. I interview independent musicians and break down their production techniques.",
      pastCollab: "Produced a limited audio series breaking down film scores."
    },
    {
      id: "c04", name: "Julian Rossi", handle: "@jrossi_lens", initials: "JR",
      platform: "YouTube", verified: true, location: "Toronto, CA", timezone: "UTC-5",
      field: "Video essays", tags: ["film analysis", "storytelling", "directing", "editing"],
      interests: ["film analysis", "storytelling", "directing", "editing", "video"],
      audience: 315000, engagementRate: 5.1, cadence: "Monthly posts",
      sharedAudience: 0.08,
      openGoals: ["Reach each other's audiences", "Appear as a guest on each other's channel"],
      bio: "Long-form critiques of modern cinema. Analysing how visual choices drive emotional narratives.",
      pastCollab: "A crossover episode exploring sound design in horror films."
    },
    {
      id: "c05", name: "Sofia Mendes", handle: "@smendes_3d", initials: "SM",
      platform: "Instagram", verified: false, location: "Lisbon, PT", timezone: "UTC+1",
      field: "3D concept art", tags: ["blender", "hard surface", "sci-fi", "texturing"],
      interests: ["blender", "hard surface", "sci-fi", "texturing", "3d", "design"],
      audience: 89000, engagementRate: 4.5, cadence: "Weekly posts",
      sharedAudience: 0.12,
      openGoals: ["Swap skills and make something together"],
      bio: "Designing near-future industrial props. Focused on procedural materials and harsh lighting.",
      pastCollab: "Provided asset concepts for an indie game prototype."
    },
    {
      id: "c06", name: "Kenji Sato", handle: "@kenji_draws", initials: "KS",
      platform: "Twitter", verified: false, location: "Tokyo, JP", timezone: "UTC+9",
      field: "Illustration", tags: ["character design", "comics", "ink", "worldbuilding"],
      interests: ["character design", "comics", "ink", "worldbuilding", "art"],
      audience: 56400, engagementRate: 7.2, cadence: "Weekly posts",
      sharedAudience: 0.18,
      openGoals: ["Swap skills and make something together", "Reach each other's audiences"],
      bio: "Telling quiet stories through detailed line work. Exploring urban fantasy settings.",
      pastCollab: "Illustrated a short story collection for a sci-fi writer."
    },
    {
      id: "c07", name: "Priya Patel", handle: "@priya_tools", initials: "PP",
      platform: "GitHub", verified: true, location: "Bangalore, IN", timezone: "UTC+5.5",
      field: "Game development tooling", tags: ["unity", "editor scripts", "c#", "workflow"],
      interests: ["unity", "editor scripts", "c#", "workflow", "performance"],
      audience: 12300, engagementRate: 15.0, cadence: "Monthly posts",
      sharedAudience: 0.05,
      openGoals: ["Publish research or open-source work together", "Swap skills and make something together"],
      bio: "Building the tools that build the games. I create Unity editor extensions to speed up level design.",
      pastCollab: "Co-created an open-source node editor for dialogue trees."
    },
    {
      id: "c08", name: "David O'Brien", handle: "@dobrien_arch", initials: "DO",
      platform: "Instagram", verified: false, location: "Dublin, IE", timezone: "UTC+0",
      field: "Architecture and design", tags: ["brutalism", "spatial design", "materials", "urbanism"],
      interests: ["brutalism", "spatial design", "materials", "urbanism", "design"],
      audience: 41870, engagementRate: 5.9, cadence: "Bi-weekly posts",
      sharedAudience: 0.11,
      openGoals: ["Reach each other's audiences", "Appear as a guest on each other's channel"],
      bio: "Documenting concrete structures and spatial flow. Analysing the intersection of form and civic function.",
      pastCollab: "Hosted a photo essay series with a typography artist."
    },
    {
      id: "c09", name: "Hannah Lee", handle: "@hannah_wood", initials: "HL",
      platform: "YouTube", verified: true, location: "Portland, OR", timezone: "UTC-8",
      field: "Ceramics or woodworking", tags: ["joinery", "furniture", "hand tools", "process"],
      interests: ["joinery", "furniture", "hand tools", "process", "making"],
      audience: 125000, engagementRate: 6.4, cadence: "Monthly posts",
      sharedAudience: 0.14,
      openGoals: ["Swap skills and make something together", "Reach each other's audiences"],
      bio: "Crafting tactile objects that last. Sharing the quiet, slow process of traditional joinery.",
      pastCollab: "Built a custom studio desk for an audio producer."
    },
    {
      id: "c10", name: "Omar Farooq", handle: "@omar_data", initials: "OF",
      platform: "Substack", verified: true, location: "Chicago, IL", timezone: "UTC-6",
      field: "Data journalism", tags: ["visualisation", "d3.js", "civic tech", "statistics"],
      interests: ["visualisation", "d3.js", "civic tech", "statistics", "journalism", "writing"],
      audience: 34200, engagementRate: 9.1, cadence: "Weekly posts",
      sharedAudience: 0.17,
      openGoals: ["Publish research or open-source work together", "Reach each other's audiences"],
      bio: "Finding the story inside the numbers. I turn public datasets into interactive narratives.",
      pastCollab: "Co-published an interactive report on urban transit with a science communicator."
    },
    {
      id: "c11", name: "Lars Jensen", handle: "@lars_synths", initials: "LJ",
      platform: "YouTube", verified: false, location: "Stockholm, SE", timezone: "UTC+1",
      field: "Synth design", tags: ["modular", "dsp", "pcb design", "eurorack"],
      interests: ["modular", "dsp", "pcb design", "eurorack", "hardware", "audio"],
      audience: 28900, engagementRate: 11.2, cadence: "Bi-weekly posts",
      sharedAudience: 0.09,
      openGoals: ["Swap skills and make something together", "Publish research or open-source work together"],
      bio: "Designing analog circuits and digital signal processors. Building the instruments of tomorrow.",
      pastCollab: "Designed a custom oscillator module with a firmware engineer."
    },
    {
      id: "c12", name: "Nia Thomas", handle: "@nia_oss", initials: "NT",
      platform: "GitHub", verified: true, location: "Atlanta, GA", timezone: "UTC-5",
      field: "Open-source maintainer", tags: ["javascript", "build tools", "community", "funding"],
      interests: ["javascript", "build tools", "community", "funding", "react"],
      audience: 45000, engagementRate: 8.8, cadence: "Weekly posts",
      sharedAudience: 0.2,
      openGoals: ["Publish research or open-source work together", "Appear as a guest on each other's channel"],
      bio: "Sustaining the modern web. I maintain core build tools and write about open-source economics.",
      pastCollab: "Hosted a funding roundtable with other prominent maintainers."
    },
    {
      id: "c13", name: "Carlos Rivera", handle: "@carlos_motion", initials: "CR",
      platform: "Instagram", verified: false, location: "Mexico City, MX", timezone: "UTC-6",
      field: "Motion design", tags: ["after effects", "kinetic typography", "animation", "branding"],
      interests: ["after effects", "kinetic typography", "animation", "branding", "design", "video"],
      audience: 72100, engagementRate: 5.6, cadence: "Weekly posts",
      sharedAudience: 0.16,
      openGoals: ["Swap skills and make something together", "Reach each other's audiences"],
      bio: "Making typography dance. Focused on short, high-impact branding animations.",
      pastCollab: "Created the intro sequence for a popular video essay channel."
    },
    {
      id: "c14", name: "Dr. Maya Lin", handle: "@maya_sci", initials: "ML",
      platform: "YouTube", verified: true, location: "Sydney, AU", timezone: "UTC+10",
      field: "Science communication", tags: ["biology", "ecology", "education", "climate"],
      interests: ["biology", "ecology", "education", "climate", "science", "video"],
      audience: 412000, engagementRate: 6.2, cadence: "Bi-weekly posts",
      sharedAudience: 0.13,
      openGoals: ["Appear as a guest on each other's channel", "Reach each other's audiences"],
      bio: "Translating complex ecological papers into accessible video essays. Championing climate literacy.",
      pastCollab: "A joint deep-dive on climate data visualisation with a data journalist."
    },
    {
      id: "c15", name: "Samir Gupta", handle: "@samir_scores", initials: "SG",
      platform: "Twitter", verified: false, location: "Mumbai, IN", timezone: "UTC+5.5",
      field: "Game composer", initials: "SG", tags: ["orchestral", "chiptune", "fmod", "adaptive audio"],
      interests: ["orchestral", "chiptune", "fmod", "adaptive audio", "music", "audio"],
      audience: 19800, engagementRate: 10.4, cadence: "Monthly posts",
      sharedAudience: 0.07,
      openGoals: ["Swap skills and make something together", "Publish research or open-source work together"],
      bio: "Writing adaptive scores that react to player choice. Blending organic strings with retro synths.",
      pastCollab: "Scored an indie platformer while documenting the process."
    },
    {
      id: "c16", name: "Zoe Fischer", handle: "@zoe_type", initials: "ZF",
      platform: "Instagram", verified: true, location: "Vienna, AT", timezone: "UTC+1",
      field: "Typography and lettering", tags: ["type design", "calligraphy", "branding", "print"],
      interests: ["type design", "calligraphy", "branding", "print", "design", "art"],
      audience: 108000, engagementRate: 4.9, cadence: "Weekly posts",
      sharedAudience: 0.19,
      openGoals: ["Swap skills and make something together", "Reach each other's audiences"],
      bio: "Drawing letters by hand and turning them into working fonts. Passionate about historical revivals.",
      pastCollab: "Designed a bespoke typeface for an architecture publication."
    }
  ];

  return {
    fields,
    fieldAdjacency,
    platformCompatibility,
    synonyms,
    creators
  };
})();
