'use client';

import Navbar from './Navbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-neutral-950">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
