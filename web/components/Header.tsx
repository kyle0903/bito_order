'use client';

import { useCredentials } from '@/hooks/useCredentials';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { isConfigured, isLoading } = useCredentials();

  return (
    <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>

      <div className="flex items-center gap-3">
        <span className={`flex items-center gap-2 text-sm ${isConfigured ? 'text-success-600' : 'text-neutral-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-success-500' : 'bg-neutral-300'}`}></span>
          {isLoading ? '連線中...' : isConfigured ? '已連線' : '未連線'}
        </span>
      </div>
    </header>
  );
}


