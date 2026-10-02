import type { Metadata } from "next";
import { Archivo, Oi, Vollkorn } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/ui";
import "./globals.css";

const vollkorn = Vollkorn({
  variable: "--font-vollkorn",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

// The wordmark face. Used only for the logo and the closing wordmark.
const oi = Oi({
  variable: "--font-oi",
  subsets: ["latin"],
  weight: "400",
});

const ICONS = [
  "add", "arrow_back", "arrow_forward", "auto_awesome", "bolt", "bookmark", "chat", "check", "check_circle",
  "chevron_left", "chevron_right", "close", "content_copy", "dark_mode", "delete", "download", "error", "expand_more", "explore", "favorite",
  "format_quote", "forum", "group", "history", "info", "language", "light_mode", "link", "local_fire_department",
  "movie", "notes", "person_add", "photo", "record_voice_over", "refresh", "send", "shield", "shopping_bag",
  "short_text", "smartphone", "sticky_note_2", "subtitles", "text_fields", "title", "trending_up", "tune", "upload",
  "view_carousel", "warning", "web_stories",
].join(",");

export const metadata: Metadata = {
  title: "Cue — Instagram CTAs for Indian creators",
  description:
    "Fresh, format-ready Instagram calls-to-action in English or Hinglish, checked for reach risk and never repeating what you said last week.",
};

const themeBootstrap = `try{var t=localStorage.getItem('cue-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${vollkorn.variable} ${archivo.variable} ${oi.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..500,0..1,0&icon_names=${ICONS}&display=block`}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <div aria-hidden className="aurora" />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
