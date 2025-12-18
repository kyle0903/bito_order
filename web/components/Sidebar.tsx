'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: '資產總覽', href: '/', icon: '◫' },
  { name: '交易', href: '/trading', icon: '⇄' },
  { name: '歷史訂單', href: '/history', icon: '⋮' },
  { name: '設定', href: '/settings', icon: '⚙' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* 手機版背景遮罩 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* 側邊欄 */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r border-neutral-200 bg-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-200">
          <div className="flex items-center">
            <Image
              src="/Logo.png"
              alt="A CUBE Logo"
              width={75}
              height={75}
              className="rounded-lg object-cover"
              priority
            />
            <span className="text-xl font-bold text-neutral-900 tracking-tight">
              A CUBE
            </span>
          </div>
          {/* 手機版關閉按鈕 */}
          <button 
            onClick={onClose}
            className="lg:hidden p-2 -mr-2 text-neutral-500 hover:text-neutral-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }
                `}
              >
                <span className="text-base">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-sm font-medium">
              K
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">Kyle</p>
              <p className="text-xs text-neutral-500 truncate">sdmd731@gmail.com</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
