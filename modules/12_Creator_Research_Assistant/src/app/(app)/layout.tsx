"use client";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row relative selection:bg-rose-100 selection:text-rose-900">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-3 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-6xl mx-auto w-full transition-all duration-300 ease-in-out">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
