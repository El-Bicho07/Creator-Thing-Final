"use client";

import { useEffect, useRef } from "react";

/* Minimal typing for the YouTube IFrame Player API */
type YTPlayer = {
  loadVideoById(opts: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
  cueVideoById(opts: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
  getCurrentTime(): number;
  getVideoData(): { video_id: string };
  pauseVideo(): void;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      width?: string;
      height?: string;
      playerVars?: Record<string, number>;
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytPromise) {
    ytPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT!);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    });
  }
  return ytPromise;
}

export type Clip = { videoId: string; start: number; end?: number };

type Props = {
  clips: Clip[];
  index: number;
  onIndexChange?: (i: number) => void; // called when a clip finishes and the next one starts
  onFinished?: () => void;
  autoPlay?: boolean;
  playSignal?: number; // bump to (re)start the current clip
  className?: string;
};

/** Plays one clip, or a sequence of clips back to back (Ghost Clip preview). */
export default function ClipPlayer({ clips, index, onIndexChange, onFinished, autoPlay = true, playSignal = 0, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const ready = useRef(false);
  const state = useRef({ clips, index, onIndexChange, onFinished });
  useEffect(() => {
    state.current = { clips, index, onIndexChange, onFinished };
  });

  const lastAdvance = useRef(0);
  const advance = () => {
    // ENDED and the polling safety net can both fire for the same clip
    if (Date.now() - lastAdvance.current < 1000) return;
    lastAdvance.current = Date.now();
    const { clips, index, onIndexChange, onFinished } = state.current;
    if (index + 1 < clips.length) onIndexChange?.(index + 1);
    else {
      player.current?.pauseVideo();
      onFinished?.();
    }
  };

  // create the player once
  useEffect(() => {
    let cancelled = false;
    const mount = document.createElement("div");
    host.current?.appendChild(mount);
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      player.current = new YT.Player(mount, {
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            ready.current = true;
            const c = state.current.clips[state.current.index];
            if (c) {
              const opts = { videoId: c.videoId, startSeconds: c.start, endSeconds: c.end };
              if (autoPlay) player.current?.loadVideoById(opts);
              else player.current?.cueVideoById(opts);
            }
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED && state.current.clips.length > 1) advance();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load a new clip whenever the selection changes
  const clip = clips[index];
  useEffect(() => {
    if (!ready.current || !player.current || !clip) return;
    player.current.loadVideoById({ videoId: clip.videoId, startSeconds: clip.start, endSeconds: clip.end });
  }, [clip?.videoId, clip?.start, clip?.end, playSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // safety net: YouTube sometimes ignores endSeconds after a seek
  useEffect(() => {
    if (clips.length < 2) return;
    const t = setInterval(() => {
      const c = state.current.clips[state.current.index];
      const p = player.current;
      if (!p || !c?.end || !ready.current) return;
      try {
        if (p.getVideoData().video_id === c.videoId && p.getCurrentTime() >= c.end + 0.3) advance();
      } catch {}
    }, 300);
    return () => clearInterval(t);
  }, [clips.length]);

  return <div ref={host} className={className ?? "aspect-video w-full overflow-hidden rounded-xl bg-black [&>div]:size-full [&_iframe]:size-full"} />;
}
