"use client";

import {
  Brain,
  Clapperboard,
  GitCompareArrows,
  Handshake,
  ListVideo,
  MessageCircleQuestion,
  Network,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import JobProgress from "@/components/JobProgress";
import { Button, ErrorNote, Thumb, cn } from "@/components/ui";
import { api, type ChannelOverview, type Job } from "@/lib/api";
import { ChannelContext } from "@/lib/channel-context";

const TABS = [
  { href: "", label: "Ask", icon: MessageCircleQuestion },
  { href: "/reels", label: "Reels", icon: Clapperboard },
  { href: "/promises", label: "Promise Ledger", icon: Handshake },
  { href: "/drift", label: "Opinion Drift", icon: GitCompareArrows },
  { href: "/compose", label: "Ghost Clips", icon: Sparkles },
  { href: "/connections", label: "Connections", icon: Network },
  { href: "/videos", label: "Videos", icon: ListVideo },
];

export default function ChannelLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const base = `/channel/${id}`;
  const [overview, setOverview] = useState<ChannelOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api
      .get<ChannelOverview>(`/api/channels/${id}`)
      .then((o) => {
        setOverview(o);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(refresh, [refresh]);

  // keep refreshing while a job is running so counts and progress stay live
  const job = overview?.latest_job;
  const running = job && (job.status === "running" || job.status === "queued");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [running, refresh]);

  const reindex = async () => {
    try {
      await api.post<Job>(`/api/channels/${id}/reindex`);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <ChannelContext.Provider value={{ channelId: id, overview, refresh }}>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-3 sm:px-6">
          <Link href="/" className="text-muted hover:text-ink" aria-label="Home">
            <Brain className="size-5 text-accent" />
          </Link>
          <Thumb src={overview?.thumbnail ?? null} className="size-8 rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{overview?.title ?? "Loading…"}</p>
            {overview && (
              <p className="truncate text-xs text-muted">
                {overview.videos} videos · {overview.chunks} moments indexed · {overview.reels} reel ideas ·{" "}
                {overview.promises} promises · {overview.stances} opinions
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={reindex} disabled={!!running} title="Fetch new videos and retry failed ones">
            <RefreshCw className={cn("size-3.5", running && "animate-spin")} /> <span className="hidden sm:inline">Re-index</span>
          </Button>
        </div>
        <nav className="scroll-thin mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pt-2 sm:px-6">
          {TABS.map(({ href, label, icon: Icon }) => {
            const full = base + href;
            const active = href === "" ? pathname === base : pathname.startsWith(full);
            return (
              <Link
                key={href}
                href={full}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm transition-colors",
                  active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <ErrorNote error={error} />
        {job && (running || job.status === "failed") && (
          <div className="mb-5">
            <JobProgress job={job} />
          </div>
        )}
        {children}
      </main>
    </ChannelContext.Provider>
  );
}
