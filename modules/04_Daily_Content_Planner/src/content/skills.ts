export interface SkillItem {
  id: string;
  name: string;
  category: "programming" | "webdev" | "creative" | "tools" | "softskills";
  level: number; // 0 to 100
  description: string;
  tags: string[];
}

export interface SkillCategoryGroup {
  id: string;
  title: string;
  subtitle: string;
  skills: SkillItem[];
}

export const skillsData: SkillCategoryGroup[] = [
  {
    id: "programming",
    title: "Programming Languages",
    subtitle: "Core languages for logic, data structures, algorithm design, and system development.",
    skills: [
      { id: "prog-1", name: "Python", category: "programming", level: 90, description: "Scripting, automation, data structures, and computer vision / AI experiments.", tags: ["Python 3", "Automation", "Data Structures"] },
      { id: "prog-2", name: "C", category: "programming", level: 85, description: "Low-level system programming, memory management, and hardware interfacing.", tags: ["Systems", "Memory Management", "Algorithms"] },
      { id: "prog-3", name: "C++", category: "programming", level: 88, description: "Object-oriented programming, competitive coding, and performance computing.", tags: ["OOP", "STL", "Data Structures"] },
      { id: "prog-4", name: "Java", category: "programming", level: 82, description: "Object-oriented software development and core CS academic coursework.", tags: ["Java 17", "OOP", "Classes & Interfaces"] },
      { id: "prog-5", name: "JavaScript", category: "programming", level: 92, description: "ES6+ syntax, asynchronous programming, DOM manipulation, and dynamic web apps.", tags: ["ES6+", "Async/Await", "DOM", "Web API"] },
      { id: "prog-6", name: "TypeScript", category: "programming", level: 88, description: "Static typing, interfaces, generics, and enterprise React / Next.js codebases.", tags: ["TypeScript 5", "Types & Interfaces", "Clean Code"] },
      { id: "prog-7", name: "HTML5", category: "programming", level: 95, description: "Semantic web structuring, accessibility standards, and SEO tags.", tags: ["Semantic HTML", "Accessibility", "SEO"] },
      { id: "prog-8", name: "CSS3", category: "programming", level: 92, description: "Responsive layouts, Flexbox, Grid, animations, and custom styling rules.", tags: ["Flexbox", "CSS Grid", "Animations", "Responsive Design"] }
    ]
  },
  {
    id: "webdev",
    title: "Web Development",
    subtitle: "Modern frontend and backend frameworks for building fast, scalable applications.",
    skills: [
      { id: "web-1", name: "React", category: "webdev", level: 90, description: "Component architecture, state hooks, custom hooks, and interactive UI states.", tags: ["React 18/19", "Hooks", "Context API", "JSX"] },
      { id: "web-2", name: "Next.js", category: "webdev", level: 88, description: "Full-stack React framework with App Router, SSR, SSG, and route handlers.", tags: ["Next.js 14", "App Router", "SSR", "Static Generation"] },
      { id: "web-3", name: "Tailwind CSS", category: "webdev", level: 95, description: "Utility-first styling, design tokens, responsive breakpoints, and dark mode.", tags: ["TailwindCSS", "Custom Tokens", "Glassmorphism"] },
      { id: "web-4", name: "Node.js", category: "webdev", level: 84, description: "Server-side JavaScript runtime for building REST APIs and microservices.", tags: ["Node.js", "Runtime", "NPM Modules", "Backend API"] },
      { id: "web-5", name: "Express.js", category: "webdev", level: 82, description: "Web framework for routing, middleware pipeline, and backend services.", tags: ["Express", "RESTful API", "Middleware"] },
      { id: "web-6", name: "MongoDB", category: "webdev", level: 80, description: "NoSQL document database, Mongoose schemas, and data persistence.", tags: ["NoSQL", "Mongoose", "Database Design"] },
      { id: "web-7", name: "Firebase", category: "webdev", level: 82, description: "Cloud Firestore, authentication, hosting, and real-time database integration.", tags: ["Auth", "Firestore", "Cloud Functions"] }
    ]
  },
  {
    id: "creative",
    title: "Creative & Filmmaking Skills",
    subtitle: "Visual storytelling, video editing, cinematography, and post-production artistry.",
    skills: [
      { id: "cr-1", name: "Cinematography", category: "creative", level: 92, description: "Camera movement, shot composition, lighting setups, and visual mood setting.", tags: ["Camera Control", "Lighting", "Framing", "Nigal Club"] },
      { id: "cr-2", name: "Video Editing", category: "creative", level: 94, description: "Multi-cam editing, narrative pacing, sound cuts, and promotional event reels.", tags: ["Timeline Editing", "Pacing", "Event Recaps", "Short Films"] },
      { id: "cr-3", name: "Photography", category: "creative", level: 88, description: "Event photography, portraiture, exposure control, and composition rules.", tags: ["Event Photography", "Framing", "Manual Controls"] },
      { id: "cr-4", name: "Storytelling", category: "creative", level: 90, description: "Concept development, scene structuring, scriptwriting, and visual emotion.", tags: ["Concept Narrative", "Scriptwriting", "Visual Emotion"] },
      { id: "cr-5", name: "Color Grading", category: "creative", level: 86, description: "Color correction, LUT application, tone curve adjustments, and cinematic looks.", tags: ["DaVinci Resolve", "Tone Curves", "Color Matching"] }
    ]
  },
  {
    id: "tools",
    title: "Tools & Technologies",
    subtitle: "Professional software suites, development tools, and hardware IDEs.",
    skills: [
      { id: "tool-1", name: "Adobe Premiere Pro", category: "tools", level: 94, description: "Primary video editing suite for cutting events, short films, and promos.", tags: ["Video Editing", "Timeline", "Audio Sync"] },
      { id: "tool-2", name: "DaVinci Resolve", category: "tools", level: 88, description: "Color grading, color space management, and high-end video finishing.", tags: ["Color Grading", "DaVinci", "Node Editor"] },
      { id: "tool-3", name: "Adobe Lightroom", category: "tools", level: 90, description: "Photo culling, RAW processing, color enhancement, and portfolio presets.", tags: ["RAW Edit", "Presets", "Photo Grading"] },
      { id: "tool-4", name: "Git & GitHub", category: "tools", level: 90, description: "Version control, branching, repository management, and project tracking.", tags: ["Version Control", "Git Flow", "Repositories"] },
      { id: "tool-5", name: "VS Code", category: "tools", level: 95, description: "Primary IDE with custom extensions, debugging, and terminal workflows.", tags: ["IDE", "Debugging", "Extensions"] },
      { id: "tool-6", name: "Arduino IDE", category: "tools", level: 85, description: "Microcontroller programming, sensor integration, and hardware prototyping.", tags: ["Embedded Systems", "Sensors", "Hardware Prototypes"] },
      { id: "tool-7", name: "Figma", category: "tools", level: 86, description: "UI/UX wireframing, component design, and interface prototyping.", tags: ["Wireframing", "UI Design", "Prototyping"] }
    ]
  },
  {
    id: "softskills",
    title: "Soft Skills & Leadership",
    subtitle: "Interpersonal qualities driving effective teamwork, creative projects, and execution.",
    skills: [
      { id: "ss-1", name: "Leadership", category: "softskills", level: 90, description: "Guiding film crews and team members during high-pressure campus events.", tags: ["Team Lead", "Project Execution", "Nigal Club"] },
      { id: "ss-2", name: "Communication", category: "softskills", level: 92, description: "Clear articulation of technical ideas, film concepts, and team goals.", tags: ["Verbal & Written", "Presentation", "Collaboration"] },
      { id: "ss-3", name: "Problem Solving", category: "softskills", level: 94, description: "Analytical approach to debugging code and troubleshooting shoot challenges.", tags: ["Debugging", "Root Cause Analysis", "Logic"] },
      { id: "ss-4", name: "Team Collaboration", category: "softskills", level: 95, description: "Seamless coordination across technical developers and creative crews.", tags: ["Cross-Functional", "Peer Collaboration"] },
      { id: "ss-5", name: "Adaptability", category: "softskills", level: 90, description: "Quickly learning new tech stacks, editing techniques, and hardware tools.", tags: ["Fast Learner", "Flexibility", "Continuous Growth"] },
      { id: "ss-6", name: "Time Management", category: "softskills", level: 88, description: "Balancing academic studies, filmmaking shoots, and Protosem Forge weeks.", tags: ["Prioritization", "Milestone Tracking"] },
      { id: "ss-7", name: "Creativity", category: "softskills", level: 96, description: "Synthesizing technology and visual arts into innovative outcomes.", tags: ["Innovation", "Visual Design", "Creative Problem Solving"] }
    ]
  }
];
