import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ComIdea — Comment-to-Content Engine for Creators',
  description: 'Convert Instagram audience comments into ranked, ready-to-shoot post and video ideas, backed by real evidence.',
  keywords: ['content creator', 'instagram comments', 'ai content ideas', 'social media strategy', 'reels ideas']
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
