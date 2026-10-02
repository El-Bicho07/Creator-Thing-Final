import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instagram Voice Replicator — Full-Stack AI Content Style Replication System",
  description: "Analyze creator content style, extract NLP/visual features, retrieve topically relevant examples, and generate style-consistent Instagram posts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#0E2327] text-[#E9EFEA]">{children}</body>
    </html>
  );
}
