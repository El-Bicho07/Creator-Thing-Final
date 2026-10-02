export interface EventItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: "Institutional" | "Creator Works";
  date: string;
  location: string;
  role: string;
  coverImage: string;
  story: string;
  equipment: string[];
  contributors: { role: string; name: string }[];
  reflections: string;
  gallery: { url: string; caption: string }[];
}

export const eventsData: EventItem[] = [
  {
    id: "evt-1",
    slug: "keynote-future-spatial-web",
    title: "Keynote: The Future of Spatial Web Architecture",
    subtitle: "Institutional keynote delivered at the International Web Tech Summit.",
    category: "Institutional",
    date: "November 2025",
    location: "San Francisco Symphony Hall",
    role: "Keynote Speaker & Technical Presenter",
    coverImage: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=1600&auto=format&fit=crop",
    story: "Addressed an audience of 1,500+ software architects, engineers, and product leaders on integrating WebGL spatial rendering inside Next.js App Router applications without breaking web performance budgets.",
    equipment: ["4K Cinema Projector System", "Custom R3F Live Canvas Rig", "Spatial Audio Array"],
    contributors: [
      { role: "Event Lead", name: "Sarah Jenkins" },
      { role: "Technical Director", name: "Theeran" }
    ],
    reflections: "Sharing spatial web methodologies with the global engineering community highlighted how critical zero-CLS architecture is for modern web standards.",
    gallery: [
      { url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=1600&auto=format&fit=crop", caption: "Live Keynote presentation on stage." },
      { url: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1600&auto=format&fit=crop", caption: "Interactive R3F Spatial Canvas demo." }
    ]
  },
  {
    id: "evt-2",
    slug: "creator-exhibition-slate-echoes",
    title: "Creator Works: Echoes of Slate Digital Exhibition",
    subtitle: "Immersive physical & digital gallery exhibition showcasing dark navy visual compositions.",
    category: "Creator Works",
    date: "August 2025",
    location: "Modern Arts Warehouse, Los Angeles",
    role: "Exhibition Director & Visual Artist",
    coverImage: "https://images.unsplash.com/photo-1508997449629-303059a039c0?q=80&w=1600&auto=format&fit=crop",
    story: "Conceived and directed a 3-day immersive gallery exhibition pairing high-resolution printed photograph art with spatial ambient audio soundscapes and interactive projection mapping.",
    equipment: ["RED V-Raptor 8K Cinema Camera", "Custom Dark Slate Canvas Frames", "Logic Pro Spatial Mix Engine"],
    contributors: [
      { role: "Curator", name: "Amara Thorne" },
      { role: "Lead Artist", name: "Theeran" }
    ],
    reflections: "Bridging physical gallery prints with responsive digital identity spaces demonstrated how physical texture informs digital product aesthetics.",
    gallery: [
      { url: "https://images.unsplash.com/photo-1508997449629-303059a039c0?q=80&w=1600&auto=format&fit=crop", caption: "Gallery opening night with interactive projections." }
    ]
  }
];
