import { notFound } from "next/navigation";
import Link from "next/link";
import { projectsData } from "@/content/projects";
import { ArrowLeft, ExternalLink, Github, AlertTriangle, Lightbulb, Compass, Award, CheckCircle2, Layers } from "lucide-react";

export function generateStaticParams() {
  return projectsData.map((project) => ({
    slug: project.slug,
  }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const project = projectsData.find((p) => p.slug === params.slug);
  if (!project) return { title: "Project Not Found" };
  return {
    title: `${project.title} | Case Study by Theeran P.`,
    description: project.subtitle,
  };
}

export default function ProjectDetailPage({ params }: { params: { slug: string } }) {
  const project = projectsData.find((p) => p.slug === params.slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-16 py-8">
      
      {/* BACK NAVIGATION */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-xs font-mono text-white hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Case Studies</span>
        </Link>
      </div>

      {/* CASE STUDY HEADER */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-mono font-bold text-white border border-white/15">
            {project.category}
          </span>
          <span className="text-xs text-neutral-400 font-mono">{project.year}</span>
          <span className="text-xs text-neutral-400 font-mono">• {project.role}</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white leading-tight">
          {project.title}
        </h1>

        <p className="text-lg text-neutral-300 leading-relaxed font-sans max-w-3xl">
          {project.subtitle}
        </p>

        {/* Action Links */}
        <div className="flex flex-wrap gap-4 pt-2">
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-mono font-bold text-black hover:bg-neutral-200 transition-all"
            >
              <span>Live Demo</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full glass-panel px-5 py-2.5 text-xs font-mono font-semibold text-white hover:border-white/30 transition-all border border-white/10"
            >
              <Github className="h-3.5 w-3.5 text-white" />
              <span>GitHub Code</span>
            </a>
          )}
        </div>
      </section>

      {/* MAIN COVER IMAGE */}
      <div className="rounded-3xl overflow-hidden glass-panel border border-white/15 shadow-glass-md aspect-video">
        <img
          src={project.coverImage}
          alt={project.title}
          className="h-full w-full object-cover"
        />
      </div>

      {/* METRICS & TECH STACK MATRIX */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Key Metrics */}
        <div className="md:col-span-6 glass-panel-elevated rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-white font-bold">
            <Award className="h-4 w-4" />
            <span>VERIFIED PERFORMANCE METRICS</span>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            {project.metrics.map((m, i) => (
              <div key={i} className="glass-panel p-3 rounded-xl border border-white/10">
                <span className="font-serif text-2xl font-bold text-white block">{m.value}</span>
                <span className="text-[11px] font-mono text-neutral-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Technologies Used */}
        <div className="md:col-span-6 glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
          <span className="text-xs font-mono text-white font-bold uppercase block">TECHNOLOGY STACK</span>
          <div className="flex flex-wrap gap-2 pt-2">
            {project.technologies.map((tech) => (
              <span key={tech} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-300 border border-white/10">
                {tech}
              </span>
            ))}
          </div>
        </div>

      </section>

      {/* OVERVIEW & PROBLEM STATEMENT */}
      <section className="space-y-8 glass-panel-elevated rounded-3xl p-8 md:p-12 border border-white/10">
        <div className="space-y-3">
          <h2 className="font-serif text-2xl font-bold text-white">1. Overview</h2>
          <p className="text-base text-neutral-300 leading-relaxed font-sans">{project.overview}</p>
        </div>

        <div className="space-y-3 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-mono font-bold">
            <AlertTriangle className="h-4 w-4" />
            <span>2. Problem & Challenge</span>
          </div>
          <p className="text-base text-neutral-300 leading-relaxed font-sans">{project.problem || project.challenges}</p>
        </div>

        <div className="space-y-3 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-mono font-bold">
            <Lightbulb className="h-4 w-4" />
            <span>3. Architectural Solution</span>
          </div>
          <p className="text-base text-neutral-300 leading-relaxed font-sans">{project.solution}</p>
        </div>

        {project.architecture && (
          <div className="space-y-3 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-white text-sm font-mono font-bold">
              <Layers className="h-4 w-4" />
              <span>4. System Architecture</span>
            </div>
            <p className="text-base text-neutral-300 leading-relaxed font-sans">{project.architecture}</p>
          </div>
        )}

        {project.features && project.features.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-white/10">
            <span className="text-sm font-mono font-bold text-white uppercase block">5. Key Features</span>
            <ul className="space-y-2">
              {project.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs font-mono text-neutral-300">
                  <CheckCircle2 className="h-4 w-4 text-white shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 text-neutral-300 text-sm font-mono font-bold">
            <Compass className="h-4 w-4 text-white" />
            <span>6. Lessons & Reflections</span>
          </div>
          <p className="text-base text-neutral-300 leading-relaxed font-sans italic">"{project.reflection}"</p>
        </div>
      </section>

      {/* GALLERY SHOWCASE */}
      {project.gallery && project.gallery.length > 0 && (
        <section className="space-y-8">
          <h2 className="font-serif text-2xl font-bold text-white">Visual Artifacts & Gallery</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {project.gallery.map((g, idx) => (
              <div key={idx} className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
                <div className="aspect-video overflow-hidden rounded-xl bg-neutral-900">
                  <img src={g.url} alt={g.alt} className="h-full w-full object-cover" />
                </div>
                <p className="text-xs text-neutral-400 font-mono">{g.caption}</p>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
