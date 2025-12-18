'use client';

import { useCredentials } from '@/hooks/useCredentials';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const { isConfigured, isLoading } = useCredentials();

  return (
    <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* 手機版漢堡選單按鈕 */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-neutral-600 hover:text-neutral-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <span className={`flex items-center gap-2 text-sm ${isConfigured ? 'text-success-600' : 'text-neutral-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-success-500' : 'bg-neutral-300'}`}></span>
          <span className="hidden sm:inline">
            {isLoading ? '連線中...' : isConfigured ? '已連線' : '未連線'}
          </span>
        </span>
      </div>
    </header>
  );
}
