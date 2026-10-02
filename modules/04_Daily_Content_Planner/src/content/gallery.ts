export interface PhotoItem {
  id: string;
  title: string;
  category: "Architectural" | "Cinematic" | "Abstract Depth" | "Spatial Minimal";
  aspectRatio: "portrait" | "landscape" | "square";
  imageUrl: string;
  location: string;
  year: string;
  exif: {
    camera: string;
    lens: string;
    aperture: string;
    shutter: string;
    iso: string;
  };
  description: string;
}

export const galleryData: PhotoItem[] = [
  {
    id: "photo-1",
    title: "Monolith in Slate",
    category: "Architectural",
    aspectRatio: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1600&auto=format&fit=crop",
    location: "Tokyo, Japan",
    year: "2025",
    exif: { camera: "Leica SL2-S", lens: "Summicron-SL 35mm f/2", aperture: "f/2.8", shutter: "1/500s", iso: "100" },
    description: "Geometric architectural lines rising into midnight slate gradient shadows."
  },
  {
    id: "photo-2",
    title: "Refractions of Light Surface",
    category: "Abstract Depth",
    aspectRatio: "landscape",
    imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1600&auto=format&fit=crop",
    location: "Reykjavík, Iceland",
    year: "2025",
    exif: { camera: "Hasselblad X2D 100C", lens: "XCD 55mm f/2.5", aperture: "f/4.0", shutter: "1/250s", iso: "64" },
    description: "Glacial blue ice surfaces capturing soft highlights and cyan refractions."
  },
  {
    id: "photo-3",
    title: "Midnight Horizon No. 4",
    category: "Spatial Minimal",
    aspectRatio: "landscape",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
    location: "Big Sur, California",
    year: "2024",
    exif: { camera: "Sony A7R V", lens: "FE 24-70mm f/2.8 GM II", aperture: "f/8.0", shutter: "1/60s", iso: "100" },
    description: "Tranquil dark navy ocean horizon meeting soft dusk light."
  },
  {
    id: "photo-4",
    title: "Echoes of Modern Geometry",
    category: "Architectural",
    aspectRatio: "square",
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop",
    location: "Berlin, Germany",
    year: "2024",
    exif: { camera: "Fujifilm GFX 100 II", lens: "GF 45mm f/2.8", aperture: "f/5.6", shutter: "1/125s", iso: "160" },
    description: "Symmetrical steel and glass façade study in elevated surface tones."
  },
  {
    id: "photo-5",
    title: "Cinematic Silence",
    category: "Cinematic",
    aspectRatio: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1600&auto=format&fit=crop",
    location: "Kyoto, Japan",
    year: "2024",
    exif: { camera: "Leica M11", lens: "Noctilux-M 50mm f/0.95", aperture: "f/1.2", shutter: "1/1000s", iso: "64" },
    description: "Solitary figure bathed in ambient cyan street lantern highlights."
  },
  {
    id: "photo-6",
    title: "Spatial Vector Void",
    category: "Abstract Depth",
    aspectRatio: "landscape",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop",
    location: "San Francisco, CA",
    year: "2025",
    exif: { camera: "Canon EOS R3", lens: "RF 15-35mm f/2.8L", aperture: "f/11", shutter: "1/30s", iso: "100" },
    description: "Abstract fluid simulation rendered into physical dark navy photographic print."
  }
];
