"use client";

import { ExternalLink, Network } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Empty, ErrorNote, PageHeader, Spinner, Thumb, cn } from "@/components/ui";
import { api, fmtDate, fmtViews, type GraphData, type Related } from "@/lib/api";
import { useChannel } from "@/lib/channel-context";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type Node = GraphData["nodes"][number] & { x?: number; y?: number };

export default function ConnectionsPage() {
  const { channelId, overview } = useChannel();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Node | null>(null);
  const [related, setRelated] = useState<Related[] | null>(null);
  const [hover, setHover] = useState<Node | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    api
      .get<GraphData>(`/api/channels/${channelId}/graph`)
      .then(setGraph)
      .catch((e) => setError(e.message));
  }, [channelId, overview?.chunks]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [graph]);

  const select = (node: Node | null) => {
    setSelected(node);
    setRelated(null);
    if (node) api.get<Related[]>(`/api/videos/${node.id}/related`).then(setRelated).catch(() => setRelated([]));
  };

  // node size by views (log scale); neighbours of the selected node are highlighted
  const maxViews = useMemo(() => Math.max(1, ...(graph?.nodes.map((n) => n.views) ?? [1])), [graph]);
  const neighbours = useMemo(() => {
    const set = new Set<string>();
    if (!selected || !graph) return set;
    for (const l of graph.links) {
      const s = typeof l.source === "string" ? l.source : (l.source as Node).id;
      const t = typeof l.target === "string" ? l.target : (l.target as Node).id;
      if (s === selected.id) set.add(t);
      if (t === selected.id) set.add(s);
    }
    return set;
  }, [selected, graph]);

  const data = useMemo(() => (graph ? { nodes: graph.nodes.map((n) => ({ ...n })), links: graph.links.map((l) => ({ ...l })) } : null), [graph]);

  return (
    <>
      <PageHeader
        title="Connections"
        subtitle="Every video is a dot; lines join videos that talk about similar ideas. Clusters are your recurring themes — and natural series or playlists."
      />
      <ErrorNote error={error} />
      {!graph ? (
        <Spinner label="Mapping your ideas…" />
      ) : graph.nodes.length < 2 ? (
        <Empty icon={<Network className="size-8" />} title="Not enough indexed videos yet">
          Connections appear once at least two videos have transcripts.
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="relative overflow-hidden">
            <div ref={box} className="h-[560px] w-full">
              {data && (
                <ForceGraph2D
                  graphData={data}
                  width={width}
                  height={560}
                  backgroundColor="#ffffff"
                  nodeRelSize={4}
                  nodeVal={(n) => 1 + (Math.log10(1 + (n as Node).views) / Math.log10(1 + maxViews)) * 6}
                  nodeColor={(n) => {
                    const node = n as Node;
                    if (!selected) return "#7c3aed";
                    if (node.id === selected.id) return "#d97706";
                    return neighbours.has(node.id) ? "#a78bfa" : "#d6d6e0";
                  }}
                  linkColor={(l) => {
                    if (!selected) return "rgba(106,106,126,0.3)";
                    const s = (l.source as Node).id;
                    const t = (l.target as Node).id;
                    return s === selected.id || t === selected.id ? "rgba(217,119,6,0.75)" : "rgba(106,106,126,0.08)";
                  }}
                  linkWidth={(l) => 0.5 + ((l as { similarity: number }).similarity - 0.6) * 6}
                  onNodeClick={(n) => select(n as Node)}
                  onNodeHover={(n) => setHover((n as Node) ?? null)}
                  onBackgroundClick={() => select(null)}
                  cooldownTicks={120}
                />
              )}
            </div>
            {hover && (
              <div className="pointer-events-none absolute left-3 top-3 max-w-72 rounded-lg border border-line bg-surface-2 p-2 text-xs">
                <p className="font-medium">{hover.title}</p>
                <p className="text-muted">
                  {fmtDate(hover.published_at)} · {fmtViews(hover.views)} views
                </p>
              </div>
            )}
            <p className="absolute bottom-3 left-3 text-[11px] text-muted">Dot size = views · click a dot to see its neighbours</p>
          </Card>

          <div className="space-y-3">
            {selected ? (
              <>
                <Card className="p-4">
                  <Thumb src={selected.thumbnail} className="aspect-video w-full" />
                  <p className="mt-3 font-medium">{selected.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {fmtDate(selected.published_at)} · {fmtViews(selected.views)} views
                  </p>
                  <a
                    href={`https://www.youtube.com/watch?v=${selected.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                  >
                    Open on YouTube <ExternalLink className="size-3" />
                  </a>
                </Card>
                <p className="text-sm font-medium text-muted">Most related videos — link these in your description or end screen</p>
                {related === null ? (
                  <Spinner />
                ) : (
                  related.map((r) => (
                    <button
                      key={r.video_id}
                      onClick={() => select(graph.nodes.find((n) => n.id === r.video_id) ?? null)}
                      className={cn("flex w-full gap-3 rounded-xl border border-line bg-surface p-2.5 text-left hover:border-muted")}
                    >
                      <Thumb src={r.thumbnail} className="h-12 w-20 shrink-0" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs font-medium">{r.title}</p>
                        <p className="mt-1 text-[11px] text-muted">{Math.round(r.similarity * 100)}% similar</p>
                      </div>
                    </button>
                  ))
                )}
              </>
            ) : (
              <Empty title="Select a video">Click any dot to see which of your videos are most closely connected to it.</Empty>
            )}
          </div>
        </div>
      )}
    </>
  );
}
