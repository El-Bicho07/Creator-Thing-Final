import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hook Generator | Turn Any Topic Into a Scroll-Stopping Hook',
  description:
    'Generate 10 high-converting hooks across 10 psychological frameworks for Instagram, YouTube, LinkedIn, X, and TikTok with Google Gemini.',
  keywords: [
    'hook generator',
    'social media hooks',
    'Gemini AI',
    'content creator tools',
    'viral copy',
    'Hook Generator',
  ],
  authors: [{ name: 'Hook Generator Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  );
}
