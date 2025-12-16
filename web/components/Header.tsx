'use client';

export default function Header({ title }: { title: string }) {
  return (
    <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>

      <div className="flex items-center gap-3">
        <button className="px-3 py-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
          Refresh
        </button>
      </div>
    </header>
  );
}
