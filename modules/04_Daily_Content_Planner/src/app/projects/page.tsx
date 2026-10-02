"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { projectsData, projectCategories } from "@/content/projects";
import { ArrowRight, Layers, ExternalLink, Github } from "lucide-react";

const smoothEase = [0.16, 1, 0.3, 1];

export default function ProjectsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredProjects = selectedCategory === "All" 
    ? projectsData 
    : projectsData.filter((p) => p.category === selectedCategory);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16 py-8">
      
      {/* HEADER */}
      <section className="space-y-6 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 text-xs text-white border border-white/10"
        >
          <Layers className="h-3.5 w-3.5 text-neutral-300" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-300 font-bold">PROJECTS & CASE STUDIES</span>
        </motion.div>

        <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white leading-tight">
          Learning Journey & Work
        </h1>

        <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-sans">
          Every project represents a step in my learning journey. I enjoy building practical solutions, experimenting with new technologies, and continuously improving my development skills.
        </p>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {projectCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-mono font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-white text-black font-bold"
                  : "glass-panel text-neutral-400 hover:text-white border border-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* PROJECTS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProjects.map((project, idx) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.5, ease: smoothEase }}
            className="group rounded-2xl glass-panel border border-white/10 overflow-hidden hover:border-white/25 transition-all flex flex-col justify-between"
          >
            <div className="relative aspect-video overflow-hidden bg-neutral-900">
              <img
                src={project.coverImage}
                alt={project.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 filter grayscale contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-primary via-transparent to-transparent opacity-85" />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-mono text-white border border-white/15 backdrop-blur-md">
                  {project.category}
                </span>
              </div>
              <span className="absolute top-3 right-3 font-mono text-xs text-neutral-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                {project.year}
              </span>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="font-serif text-xl font-bold text-white group-hover:text-neutral-300 transition-colors">
                  {project.title}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed font-sans">
                  {project.subtitle}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex flex-wrap gap-1.5">
                  {project.technologies.map((tech) => (
                    <span key={tech} className="rounded bg-neutral-900/80 px-2 py-0.5 text-[9px] font-mono text-neutral-300 border border-white/10">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Link
                    href={`/projects/${project.slug}`}
                    className="flex items-center gap-1.5 text-xs font-mono font-bold text-white hover:text-neutral-300 transition-colors"
                  >
                    <span>Read Case Study</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <div className="flex items-center gap-2">
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-400 hover:text-white transition-colors"
                        title="GitHub Repository"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    )}
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-400 hover:text-white transition-colors"
                        title="Live Demo"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

    </div>
  );
}
