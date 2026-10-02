import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
  ],
};

export const metadata: Metadata = {
  title: "CINESENSEI | Anime AI Content Director (Food Reviews & Viral Pipeline)",
  description:
    "CineSensei turns ideas into viral production-ready packages with anime direction, food review scripts, Grok-style casual videos, shot lists, and Tanglish titles.",
  keywords: [
    "CineSensei",
    "Anime AI Content Director",
    "Food Review Script Generator",
    "Tanglish Reels",
    "video production pipeline",
    "shot list generator",
  ],
  authors: [{ name: "CineSensei Studio" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
