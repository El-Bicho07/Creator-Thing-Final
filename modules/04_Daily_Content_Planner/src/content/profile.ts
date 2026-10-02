export interface ExperienceItem {
  id: string;
  role: string;
  organization: string;
  period: string;
  location: string;
  description: string;
  highlights: string[];
  type: "work" | "education" | "leadership" | "creative";
}

export interface AchievementItem {
  id: string;
  title: string;
  issuer: string;
  year: string;
  description: string;
}

export interface QuickInfoItem {
  icon: string;
  label: string;
}

export interface ProfileData {
  name: string;
  title: string;
  headline: string;
  tagline: string;
  bioParagraphs: string[];
  vision: string;
  philosophy: string[];
  contactEmail: string;
  location: string;
  institution: string;
  degree: string;
  degreePeriod: string;
  quickInfo: QuickInfoItem[];
  experiences: ExperienceItem[];
  achievements: AchievementItem[];
  stats: { label: string; value: string; suffix?: string }[];
}

export const profileData: ProfileData = {
  name: "Theeran P.",
  title: "Computer Science Engineering Student, Cinematographer & Video Editor",
  headline: "I'm Theeran P., a Computer Science Engineering student, Cinematographer, and Video Editor who loves building digital experiences while capturing stories through visuals.",
  tagline: "I Build. I Create. I Capture.",
  bioParagraphs: [
    "I'm currently pursuing my Bachelor's degree in Computer Science and Engineering at Kumaraguru College of Technology (2024–2028).",
    "Technology and storytelling have always inspired me in different ways. While software development allows me to solve problems through logic and innovation, cinematography gives me the opportunity to tell stories through visuals and emotions.",
    "I constantly challenge myself by exploring new technologies, improving my creative skills, and documenting my learning journey through Forge Experience (Protosem Internship).",
    "I believe that consistency, curiosity, and continuous learning are the foundation of long-term growth."
  ],
  vision: "To create seamless digital experiences and powerful visual stories that inspire, innovate, and leave a lasting impression.",
  philosophy: [
    "I enjoy learning by building.",
    "Every project teaches me something new.",
    "Every event improves my confidence.",
    "Every challenge helps me grow."
  ],
  contactEmail: "theeranpoobathi2007@gmail.com",
  location: "Coimbatore, India",
  institution: "Kumaraguru College of Technology",
  degree: "B.E. Computer Science & Engineering",
  degreePeriod: "2024–2028",
  quickInfo: [
    { icon: "MapPin", label: "Coimbatore, India" },
    { icon: "GraduationCap", label: "B.E. Computer Science & Engineering" },
    { icon: "Building2", label: "Kumaraguru College of Technology" },
    { icon: "Camera", label: "Cinematographer" },
    { icon: "Video", label: "Video Editor" },
    { icon: "Code2", label: "Software Developer" }
  ],
  stats: [
    { label: "Experience", value: "3", suffix: "+ Yrs" },
    { label: "Events Covered", value: "50", suffix: "+" },
    { label: "Editing Experience", value: "2", suffix: "+ Yrs" },
    { label: "Forge Weeks", value: "20", suffix: "+" },
    { label: "Organizations", value: "2", suffix: "" },
    { label: "Short Films", value: "1", suffix: "" }
  ],
  experiences: [
    {
      id: "exp-edu-1",
      role: "B.E. Computer Science & Engineering",
      organization: "Kumaraguru College of Technology",
      period: "2024 — 2028",
      location: "Coimbatore, India",
      description: "Pursuing Bachelor of Engineering in CSE with focus on software development, algorithms, web architecture, and embedded systems.",
      highlights: [
        "Core coursework in Data Structures, Algorithms, OOP, Database Management, and Web Technologies.",
        "Active member of campus filmmaking and creative organizations.",
        "Documenting weekly tech progress in Protosem Forge Internship."
      ],
      type: "education"
    },
    {
      id: "exp-org-1",
      role: "Member",
      organization: "Nigal Club (Filmmaking Club at KCT)",
      period: "2024 — Present",
      location: "KCT, Coimbatore",
      description: "Active member of Nigal Club, leading camera work, shot planning, and post-production for college events and creative short films.",
      highlights: [
        "Covered major institutional events, keynotes, and cultural fests.",
        "Directed cinematography for campus showcase films and short story concepts.",
        "Collaborated with cast and crew across pre-production, filming, and final color grading."
      ],
      type: "creative"
    },
    {
      id: "exp-org-2",
      role: "Creative Team Member",
      organization: "Elaris",
      period: "2024 — Present",
      location: "Coimbatore, India",
      description: "Contributing creative media production, video editing, motion design, and visual asset generation for community projects.",
      highlights: [
        "Crafted engaging video reels, event recaps, and promotional visual media.",
        "Managed post-production timelines and multi-camera audio/video synchronization."
      ],
      type: "creative"
    },
    {
      id: "exp-work-1",
      role: "Cinematographer & Video Editor",
      organization: "Freelance",
      period: "2022 — Present",
      location: "Coimbatore & Remote",
      description: "Providing professional cinematography, video editing, photography, and color grading services for client events and brand projects.",
      highlights: [
        "Covered 50+ live events with multi-camera setups and dynamic framing.",
        "2+ years of dedicated video editing in Adobe Premiere Pro and DaVinci Resolve.",
        "Color graded short films and promo videos with custom cinematic tone curves."
      ],
      type: "work"
    },
    {
      id: "exp-work-2",
      role: "Software Developer & Computer Science Student",
      organization: "Personal & Academic Projects",
      period: "2023 — Present",
      location: "Coimbatore, India",
      description: "Building responsive web applications, interactive WebGL interfaces, microservices, and hardware prototype projects.",
      highlights: [
        "Developed full-stack web applications using React, Next.js, and Node.js.",
        "Created embedded systems and Arduino prototypes for real-world monitoring.",
        "Built custom portfolio and Protosem Forge documentation engines."
      ],
      type: "work"
    }
  ],
  achievements: [
    {
      id: "ach-1",
      title: "Short Film Production",
      issuer: "Nigal Club / KCT Cinema",
      year: "2025",
      description: "Successfully directed cinematography and post-production for an independent short film."
    },
    {
      id: "ach-2",
      title: "50+ Events Media Coverage",
      issuer: "Kumaraguru College of Technology",
      year: "2024",
      description: "Recognized for capturing high-quality cinematic video and photography across 50+ flagship campus events."
    },
    {
      id: "ach-3",
      title: "Protosem Forge Internship Milestone",
      issuer: "Forge Innovation Ventures",
      year: "2025",
      description: "Completed 20+ continuous weeks of technical documentation, prototyping, and weekly skill progression."
    }
  ]
};
