export interface ProjectItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: "Web Development" | "Embedded Systems" | "Arduino" | "Computer Vision" | "AI" | "Automation" | "Academic Projects" | "Personal Projects";
  year: string;
  role: string;
  featured: boolean;
  coverImage: string;
  technologies: string[];
  overview: string;
  problem: string;
  solution: string;
  architecture: string;
  features: string[];
  challenges: string;
  reflection: string;
  metrics: { label: string; value: string }[];
  gallery: { url: string; caption: string; alt: string }[];
  liveUrl?: string;
  githubUrl?: string;
}

export const projectCategories = [
  "All",
  "Web Development",
  "Embedded Systems",
  "Arduino",
  "Computer Vision",
  "AI",
  "Automation",
  "Academic Projects",
  "Personal Projects"
];

export const projectsData: ProjectItem[] = [
  {
    id: "proj-1",
    slug: "theeran-digital-platform",
    title: "Theeran Digital Identity Platform",
    subtitle: "Modern portfolio & Protosem Forge documentation platform with WebGL 3D kinetics.",
    category: "Web Development",
    year: "2025",
    role: "Full Stack Engineer & Designer",
    featured: true,
    coverImage: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1600&auto=format&fit=crop",
    technologies: ["Next.js 14", "React 19", "TypeScript", "Tailwind CSS", "Three.js", "Framer Motion"],
    overview: "Every project represents a step in my learning journey. This flagship platform documents my software engineering projects, cinematography works, and 20+ Protosem Forge weekly learning logs.",
    problem: "Static portfolio templates lack interactive depth and fail to showcase both technical code capabilities and creative filmmaking achievements in a single distraction-free interface.",
    solution: "Engineered a minimalist dark-mode web application using Next.js App Router, Three.js 3D ambient canvas, and Framer Motion spring physics with instant week filtering and fast static generation.",
    architecture: "Next.js App Router structure with TypeScript interfaces, Tailwind CSS token extension, Lenis smooth scrolling, and Three.js line mesh canvas rendering.",
    features: [
      "Minimalist Web Design layout with high visual hierarchy and clean micro-interactions",
      "Protosem Forge 20+ weekly interactive folder archive with instant search & category filters",
      "Responsive 3D ambient geometric mesh canvas rendered in React Three Fiber",
      "Comprehensive case study pages documenting problem, solution, architecture, and reflections"
    ],
    challenges: "Balancing smooth 60 FPS WebGL 3D rendering with fast static page generation while maintaining strict TypeScript typing across dynamic content structures.",
    reflection: "Building this platform proved that combining software engineering logic with visual aesthetics creates a memorable user experience.",
    metrics: [
      { label: "Target FPS", value: "60 FPS" },
      { label: "Lighthouse Score", value: "98/100" },
      { label: "Load Time", value: "< 1.0s" },
      { label: "Forge Weeks", value: "20+" }
    ],
    gallery: [
      {
        url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1600&auto=format&fit=crop",
        caption: "Main Minimalist Home Hero Viewport with 3D ambient canvas.",
        alt: "Theeran digital platform hero"
      },
      {
        url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop",
        caption: "Protosem Forge Archive 3D folder navigation UI.",
        alt: "Forge archive interface"
      }
    ],
    githubUrl: "https://github.com",
    liveUrl: "https://theeran.digital"
  },
  {
    id: "proj-2",
    slug: "smart-embedded-monitoring-node",
    title: "Smart Environmental Monitoring Node",
    subtitle: "Arduino & ESP32 powered IoT sensor node with real-time web telemetry.",
    category: "Embedded Systems",
    year: "2024",
    role: "Hardware & Firmware Developer",
    featured: true,
    coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop",
    technologies: ["Arduino IDE", "C++", "ESP32", "DHT22", "MQTT", "Node.js", "Firebase"],
    overview: "A custom embedded system designed to monitor temperature, humidity, gas levels, and ambient light in real-time, relaying telemetry over Wi-Fi to a web dashboard.",
    problem: "Traditional environmental loggers require manual memory card extraction or expensive proprietary gateway hardware.",
    solution: "Developed an affordable ESP32 microcontroller system using C++ in Arduino IDE with low-power sleep modes and MQTT payload transmission to a Firebase backend.",
    architecture: "ESP32 Microcontroller -> Sensor Interface (I2C/SPI) -> MQTT Gateway -> Firebase Realtime DB -> React Web Dashboard.",
    features: [
      "Real-time sensor telemetry for temperature, humidity, air quality, and light intensity",
      "Low-power deep sleep battery optimization cycles",
      "Automated alert notifications triggered on threshold breaches",
      "Interactive historical data plotting dashboard"
    ],
    challenges: "Calibrating analog gas sensor readings under varying power voltages and preventing Wi-Fi reconnect memory leaks on long running nodes.",
    reflection: "Bridging physical hardware with web software deepened my understanding of C++ memory control and IoT communication protocols.",
    metrics: [
      { label: "Uptime", value: "99.9%" },
      { label: "Power Savings", value: "70%" },
      { label: "Latency", value: "< 200ms" }
    ],
    gallery: [
      {
        url: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop",
        caption: "ESP32 hardware breadboard circuit prototype with DHT22 and OLED screen.",
        alt: "Embedded hardware prototype"
      }
    ],
    githubUrl: "https://github.com"
  },
  {
    id: "proj-3",
    slug: "computer-vision-gesture-automation",
    title: "Vision-Based Gesture Control System",
    subtitle: "OpenCV and Python computer vision pipeline for touchless system automation.",
    category: "Computer Vision",
    year: "2024",
    role: "Python & CV Developer",
    featured: true,
    coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1600&auto=format&fit=crop",
    technologies: ["Python", "OpenCV", "MediaPipe", "PyAutoGUI", "NumPy"],
    overview: "An artificial intelligence and computer vision automation tool that tracks hand landmarks in real time via webcam to control desktop media playback, volume, and presentation slides touchlessly.",
    problem: "Physical touch inputs during presentations or media playback can be inconvenient during live demonstrations or studio filming setups.",
    solution: "Implemented MediaPipe 21-point hand landmark detection in Python, mapping finger distances and gesture angles to operating system events using PyAutoGUI.",
    architecture: "Webcam Video Stream -> OpenCV Preprocessing -> MediaPipe Landmark Extractor -> Gesture Recognition Math -> PyAutoGUI OS Trigger.",
    features: [
      "Real-time hand tracking at 30+ FPS on standard webcam hardware",
      "Intuitive pinch gesture volume control and swipe slide navigation",
      "Visual bounding box and skeletal tracking overlay feed",
      "Customizable gesture binding configuration file"
    ],
    challenges: "Filtering out jittery hand movements and handling poor ambient lighting environments without false trigger activations.",
    reflection: "Working on computer vision highlighted how math algorithms turn raw camera pixel matrices into intelligent human-computer interactions.",
    metrics: [
      { label: "Processing FPS", value: "35 FPS" },
      { label: "Gesture Accuracy", value: "94%" }
    ],
    gallery: [
      {
        url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1600&auto=format&fit=crop",
        caption: "MediaPipe 21-point hand skeletal landmark tracking in action.",
        alt: "Computer vision landmark tracking"
      }
    ],
    githubUrl: "https://github.com"
  }
];
