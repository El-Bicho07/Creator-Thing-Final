'use client';

import React from 'react';
import { ThemeProvider } from './ThemeProvider';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
      <Toaster position="top-right" theme="dark" richColors />
    </ThemeProvider>
  );
}
