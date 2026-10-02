"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/research');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin mb-3" />
      <p className="text-xs text-secondary-text font-semibold">Opening Research Studio...</p>
    </div>
  );
}
