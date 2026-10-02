import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['400', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'PostToday — YouTube-First Daily Content Planner',
  description:
    'Never wonder what to upload again. Generate tailored YouTube video, Short, and Community post plans for your niche in seconds.',
  keywords: ['YouTube content planner', 'daily video ideas', 'content engine', 'YouTube creator tools'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${inter.variable}`}>
      <body className="font-sans bg-bg text-ink antialiased min-h-screen flex flex-col selection:bg-orange selection:text-white">
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
