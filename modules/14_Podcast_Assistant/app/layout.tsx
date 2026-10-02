import "./globals.css";import type { Metadata } from "next";import Logo from "@/components/Logo";import { ToastProvider } from "@/components/Toast";
export const metadata:Metadata={title:"PodCraft – Podcast transcript to publish-ready content",description:"Generate titles, descriptions, chapters and highlights from your podcast transcript."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>
<ToastProvider><header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur"><div className="mx-auto flex h-14 max-w-5xl items-center px-4"><Logo/></div></header>
<main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">{children}</main></ToastProvider></body></html>}
