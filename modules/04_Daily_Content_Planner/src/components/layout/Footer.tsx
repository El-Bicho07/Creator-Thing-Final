import Link from "next/link";
import { profileData } from "@/content/profile";
import { contactData } from "@/content/contact";
import { ArrowUpRight, Github, Linkedin, Instagram, Mail } from "lucide-react";

const getSocialIcon = (iconName: string) => {
  switch (iconName) {
    case "Github": return <Github className="h-4 w-4" />;
    case "Linkedin": return <Linkedin className="h-4 w-4" />;
    case "Instagram": return <Instagram className="h-4 w-4" />;
    case "Mail": return <Mail className="h-4 w-4" />;
    default: return <ArrowUpRight className="h-4 w-4" />;
  }
};

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/10 bg-brand-primary text-neutral-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-block font-serif text-2xl font-bold tracking-wider text-white">
              THEERAN P.
            </Link>
            <p className="text-xs text-neutral-400 max-w-md leading-relaxed font-sans">
              {profileData.headline}
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5">
              {contactData.socials.map((s) => (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full glass-panel px-3 py-1 text-xs font-mono text-neutral-300 transition-colors hover:text-white hover:border-white/30"
                >
                  {getSocialIcon(s.icon)}
                  <span>{s.platform}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold text-white uppercase tracking-widest">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs font-mono text-neutral-400">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About Me</Link></li>
              <li><Link href="/skills" className="hover:text-white transition-colors">Skills</Link></li>
              <li><Link href="/projects" className="hover:text-white transition-colors">Projects</Link></li>
              <li><Link href="/forge" className="hover:text-white transition-colors font-bold text-white">Protosem (Forge)</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold text-white uppercase tracking-widest">
              Contact Info
            </h4>
            <div className="space-y-2 text-xs font-mono text-neutral-400">
              <p className="text-white font-semibold">{profileData.name}</p>
              <p>{profileData.degree}</p>
              <p>{profileData.institution}</p>
              <p>{profileData.location}</p>
              <div className="pt-2">
                <a
                  href={`mailto:${contactData.email}`}
                  className="text-xs text-white hover:underline font-mono"
                >
                  {contactData.email}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-neutral-400 gap-4">
          <div>
            <p className="text-white font-bold">Designed & Developed by Theeran P.</p>
            <p className="text-neutral-500 mt-0.5">Built with Next.js, React, TypeScript, Tailwind CSS, Framer Motion</p>
          </div>
          <div className="text-right">
            <p>© {new Date().getFullYear()} Theeran P. All Rights Reserved.</p>
            <p className="text-neutral-400 font-semibold mt-0.5">Home - Theeran , B.E CSE</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
