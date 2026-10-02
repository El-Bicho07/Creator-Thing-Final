"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { skillsData, SkillItem } from "@/content/skills";
import { Code2, Terminal, Camera, Wrench, HeartHandshake, Layers } from "lucide-react";

const smoothEase = [0.16, 1, 0.3, 1];

export default function SkillsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const allSkills: SkillItem[] = skillsData.flatMap((group) => group.skills);

  const displayedSkills = activeCategory === "all"
    ? allSkills
    : allSkills.filter((s) => s.category === activeCategory);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 py-8">
      
      {/* HEADER SECTION */}
      <section className="space-y-4 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 text-xs text-white border border-white/10"
        >
          <Layers className="h-3.5 w-3.5 text-neutral-300" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-300">TECHNICAL & CREATIVE CAPABILITIES</span>
        </motion.div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white leading-tight">
          Skills & Proficiencies
        </h1>

        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
          A comprehensive view of my programming languages, web development frameworks, creative filmmaking skills, tools, and soft skills.
        </p>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-mono font-medium transition-all ${
              activeCategory === "all"
                ? "bg-white text-black font-bold"
                : "glass-panel text-neutral-400 hover:text-white border border-white/10"
            }`}
          >
            All ({allSkills.length})
          </button>
          <button
            onClick={() => setActiveCategory("programming")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-mono font-medium transition-all ${
              activeCategory === "programming"
                ? "bg-white text-black font-bold"
                : "glass-panel text-neutral-400 hover:text-white border border-white/10"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Programming</span>
          </button>
          <button
            onClick={() => setActiveCategory("webdev")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-mono font-medium transition-all ${
              activeCategory === "webdev"
                ? "bg-white text-black font-bold"
                : "glass-panel text-neutral-400 hover:text-white border border-white/10"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Web Development</span>
          </button>
          <button
            onClick={() => setActiveCategory("creative")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-mono font-medium transition-all ${
              activeCategory === "creative"
                ? "bg-white text-black font-bold"
                : "glass-panel text-neutral-400 hover:text-white border border-white/10"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Creative</span>
          </button>
          <button
            onClick={() => setActiveCategory("tools")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-mono font-medium transition-all ${
              activeCategory === "tools"
                ? "bg-white text-black font-bold"
                : "glass-panel text-neutral-400 hover:text-white border border-white/10"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Tools</span>
          </button>
          <button
            onClick={() => setActiveCategory("softskills")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-mono font-medium transition-all ${
              activeCategory === "softskills"
                ? "bg-white text-black font-bold"
                : "glass-panel text-neutral-400 hover:text-white border border-white/10"
            }`}
          >
            <HeartHandshake className="h-3.5 w-3.5" />
            <span>Soft Skills</span>
          </button>
        </div>
      </section>

      {/* CATEGORY GROUPS VIEW */}
      <section className="space-y-12">
        {skillsData
          .filter((group) => activeCategory === "all" || group.id === activeCategory)
          .map((group) => (
            <div key={group.id} className="space-y-6">
              <div className="border-b border-white/10 pb-3">
                <h2 className="font-serif text-2xl font-bold text-white">{group.title}</h2>
                <p className="text-xs text-neutral-400 font-sans mt-0.5">{group.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.skills.map((skill, idx) => (
                  <motion.div
                    key={skill.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.4, ease: smoothEase }}
                    className="group rounded-2xl glass-panel p-5 border border-white/10 hover:border-white/25 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-lg font-bold text-white group-hover:text-neutral-300 transition-colors">
                          {skill.name}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400 font-bold">{skill.level}%</span>
                      </div>

                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                        {skill.description}
                      </p>
                    </div>

                    {/* Progress Bar & Tags */}
                    <div className="space-y-3 pt-4 border-t border-white/10 mt-4">
                      <div className="h-1.5 w-full rounded-full bg-neutral-900 overflow-hidden p-0.5 border border-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.level}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-white"
                        />
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {skill.tags.map((t) => (
                          <span key={t} className="rounded bg-neutral-900/80 px-2 py-0.5 text-[9px] font-mono text-neutral-300 border border-white/10">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
      </section>

    </div>
  );
}
