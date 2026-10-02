export interface FilmItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  year: string;
  runtime: string;
  genre: string;
  director: string;
  role: string;
  rating: string;
  posterImage: string;
  backdropImage: string;
  synopsis: string;
  trailerUrl?: string; // YouTube / Vimeo embed or sample video
  productionDetails: {
    camera: string;
    aspectRatio: string;
    soundFormat: string;
    colorGrading: string;
  };
  crew: { role: string; name: string }[];
  stills: string[];
}

export const filmographyData: FilmItem[] = [
  {
    id: "film-1",
    slug: "echoes-of-slate",
    title: "Echoes of Slate",
    tagline: "In the depth of memory, light carves the path forward.",
    year: "2024",
    runtime: "24 min",
    genre: "Sci-Fi / Drama",
    director: "Theeran",
    role: "Director, Writer & Editor",
    rating: "Official Selection 2024",
    posterImage: "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=1600&auto=format&fit=crop",
    backdropImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop",
    synopsis: "In a near-future metropolis governed by automated digital archives, a rogue memory curator uncovers a hidden frequency buried within the dark navy grid—a message left by the city's lost architect.",
    trailerUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Sample embed
    productionDetails: {
      camera: "ARRI Alexa Mini LF Anamorphic",
      aspectRatio: "2.39:1 CinemaScope",
      soundFormat: "Dolby Atmos 7.1.4",
      colorGrading: "DaVinci Resolve ACES Matrix"
    },
    crew: [
      { role: "Director & Writer", name: "Theeran" },
      { role: "Director of Photography", name: "Devon Reed" },
      { role: "Lead Actor", name: "Julian Sterling" },
      { role: "Original Score", name: "Kaiya Tanaka" }
    ],
    stills: [
      "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1508997449629-303059a039c0?q=80&w=1600&auto=format&fit=crop"
    ]
  },
  {
    id: "film-2",
    slug: "monolith-protocol",
    title: "Monolith Protocol",
    tagline: "Structure is non-negotiable.",
    year: "2023",
    runtime: "18 min",
    genre: "Architectural Documentary",
    director: "Theeran",
    role: "Director & Cinematographer",
    rating: "Festival Award Winner",
    posterImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop",
    backdropImage: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1600&auto=format&fit=crop",
    synopsis: "An intimate exploration of minimalist brutalist architecture across Northern Europe, examining how geometric concrete voids dictate human emotion and urban isolation.",
    productionDetails: {
      camera: "RED V-Raptor 8K VV",
      aspectRatio: "1.85:1 Academy Flat",
      soundFormat: "5.1 Surround",
      colorGrading: "Film Print Emulation"
    },
    crew: [
      { role: "Director & DP", name: "Theeran" },
      { role: "Executive Producer", name: "Elena Rostova" },
      { role: "Sound Design", name: "Marcus Vance" }
    ],
    stills: [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1600&auto=format&fit=crop"
    ]
  }
];
