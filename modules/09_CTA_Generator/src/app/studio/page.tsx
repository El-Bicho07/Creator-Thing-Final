import type { Metadata } from "next";
import Studio from "@/components/Studio";

export const metadata: Metadata = { title: "Studio — Cue" };

export default function StudioPage() {
  return <Studio />;
}
