export interface SocialLink {
  platform: string;
  url: string;
  username: string;
  icon: string;
  status?: string;
}

export interface ContactData {
  email: string;
  location: string;
  availability: string;
  responseWindow: string;
  resumeDownloadUrl: string;
  resumeStatus: string;
  headline: string;
  description: string;
  socials: SocialLink[];
  collaborationStatement: string;
}

export const contactData: ContactData = {
  email: "theeranpoobathi2007@gmail.com",
  location: "Coimbatore, India",
  availability: "Open for Software Collaborations, Cinematography Projects & Internships",
  responseWindow: "Within 24 hours",
  resumeDownloadUrl: "#",
  resumeStatus: "Coming Soon",
  headline: "Let's Build Something Together",
  description: "I'm always open to discussing new ideas, creative collaborations, software projects, filmmaking opportunities, and exciting challenges. If you'd like to work together or simply have a conversation, I'd love to hear from you.",
  collaborationStatement: "Whether you have a software project, a film project to shoot/edit, or an innovative idea to explore, feel free to reach out!",
  socials: [
    { platform: "Email", url: "mailto:theeranpoobathi2007@gmail.com", username: "theeranpoobathi2007@gmail.com", icon: "Mail" },
    { platform: "GitHub", url: "https://github.com", username: "Add Later", icon: "Github", status: "Coming Soon" },
    { platform: "LinkedIn", url: "https://linkedin.com", username: "Add Later", icon: "Linkedin", status: "Coming Soon" },
    { platform: "Instagram", url: "https://instagram.com", username: "@theeran_p", icon: "Instagram" }
  ]
};
