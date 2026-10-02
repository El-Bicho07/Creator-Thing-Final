"use client";

import { motion } from "framer-motion";
import { profileData } from "@/content/profile";
import { GraduationCap, Camera, Video, Code2, Users, Compass, Award, CheckCircle2, Sparkles, Building2, MapPin } from "lucide-react";
import Link from "next/link";

const smoothEase = [0.16, 1, 0.3, 1];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20 py-8">
      
      {/* HERO SECTION */}
      <section className="space-y-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 text-xs text-white border border-white/10"
        >
          <Sparkles className="h-3.5 w-3.5 text-neutral-300" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-300">WHO I AM • ABOUT ME</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: smoothEase }}
          className="font-serif text-4xl sm:text-6xl font-bold text-white leading-tight"
        >
          Technology & Visual Storytelling in Harmony.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: smoothEase }}
          className="text-base sm:text-lg text-neutral-300 leading-relaxed font-sans"
        >
          {profileData.headline}
        </motion.p>
      </section>

      {/* BIOGRAPHY & PHILOSOPHY NARRATIVE */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-8 space-y-6 glass-panel-elevated rounded-3xl p-8 md:p-12 border border-white/10 shadow-glass-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              About Me
            </h2>
            <span className="font-mono text-xs text-neutral-400">Coimbatore, India</span>
          </div>

          {profileData.bioParagraphs.map((paragraph, index) => (
            <p key={index} className="text-sm sm:text-base text-neutral-300 leading-relaxed font-sans">
              {paragraph}
            </p>
          ))}

          {/* Core Philosophy Box */}
          <div className="mt-8 rounded-2xl bg-neutral-900/90 p-6 border border-white/15 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-white uppercase tracking-wider font-bold">
              <Compass className="h-4 w-4 text-white" />
              <span>MY PHILOSOPHY</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {profileData.philosophy.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 glass-panel rounded-xl p-3 border border-white/10">
                  <CheckCircle2 className="h-4 w-4 text-white shrink-0 mt-0.5" />
                  <span className="text-xs font-mono text-neutral-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Education & Organizations Drawer */}
        <div className="lg:col-span-4 space-y-6">
          {/* Education Card */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <GraduationCap className="h-5 w-5 text-white" />
              <h3 className="font-serif text-xl font-bold text-white">Education</h3>
            </div>
            <div className="space-y-2 font-mono text-xs">
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] text-white border border-white/15 inline-block">
                2024–2028
              </span>
              <h4 className="text-sm font-bold text-white font-serif">Bachelor of Engineering</h4>
              <p className="text-neutral-300">Computer Science and Engineering</p>
              <p className="text-neutral-400">Kumaraguru College of Technology</p>
              <div className="flex items-center gap-1 text-[11px] text-neutral-500 pt-1">
                <MapPin className="h-3 w-3" />
                <span>Coimbatore, India</span>
              </div>
            </div>
          </div>

          {/* Organizations Card */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Users className="h-5 w-5 text-white" />
              <h3 className="font-serif text-xl font-bold text-white">Organizations</h3>
            </div>
            
            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Nigal Club</span>
                  <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded text-white">Member</span>
                </div>
                <p className="text-[11px] text-neutral-300">Filmmaking Club at Kumaraguru College of Technology</p>
              </div>

              <div className="space-y-1 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Elaris</span>
                  <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded text-white">Creative Team</span>
                </div>
                <p className="text-[11px] text-neutral-300">Creative Media Production Team Member</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED EXPERIENCE TIMELINE */}
      <section className="space-y-10">
        <div>
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">PRACTICAL JOURNEY</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-1">
            Experience & Key Roles
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profileData.experiences.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5, ease: smoothEase }}
              className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 hover:border-white/20 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-mono font-bold text-white border border-white/15">
                    {item.period}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">{item.location}</span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif text-xl font-bold text-white">{item.role}</h3>
                  <p className="text-xs font-semibold text-neutral-300 font-mono">{item.organization}</p>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  {item.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">KEY HIGHLIGHTS:</span>
                <ul className="space-y-1">
                  {item.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-neutral-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HONORS & RECOGNITION */}
      <section className="space-y-8">
        <div>
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">RECOGNITION</span>
          <h2 className="font-serif text-3xl font-bold text-white mt-1">
            Achievements & Milestones
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {profileData.achievements.map((ach) => (
            <div key={ach.id} className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between">
                <Award className="h-6 w-6 text-white" />
                <span className="font-mono text-xs font-bold text-neutral-400">{ach.year}</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-white">{ach.title}</h4>
              <p className="text-xs font-semibold text-neutral-300 font-mono">{ach.issuer}</p>
              <p className="text-xs text-neutral-400">{ach.description}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
