'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCredentials } from '@/hooks/useCredentials';

const navigation = [
    { name: '資產總覽', href: '/', icon: '◫' },
    { name: '市場', href: '/market', icon: '⊞' },
    { name: '交易', href: '/trading', icon: '⇄' },
    { name: '歷史訂單', href: '/history', icon: '⋮' },
    { name: '設定', href: '/settings', icon: '⚙' },
];

export default function Navbar() {
    const pathname = usePathname();
    const { isConfigured, isLoading } = useCredentials();

    return (
        <header className="h-14 border-b border-neutral-800 bg-neutral-900 flex items-center justify-between px-4 md:px-6">
            {/* Logo & Navigation */}
            <div className="flex items-center gap-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/Logo.png"
                        alt="A CUBE Logo"
                        width={32}
                        height={32}
                        className="rounded object-cover"
                        priority
                    />
                    <span className="text-lg font-bold text-white tracking-tight hidden sm:inline">
                        A CUBE
                    </span>
                </Link>

                {/* Navigation Links */}
                <nav className="flex items-center gap-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${isActive
                                        ? 'bg-neutral-700 text-white'
                                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                                    }
                `}
                            >
                                <span className="text-sm">{item.icon}</span>
                                <span className="hidden md:inline">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Right side - Connection Status & User */}
            <div className="flex items-center gap-4">
                {/* Connection Status */}
                <span className={`flex items-center gap-2 text-sm ${isConfigured ? 'text-success-500' : 'text-neutral-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-success-500' : 'bg-neutral-600'}`}></span>
                    <span className="hidden sm:inline">
                        {isLoading ? '連線中...' : isConfigured ? '已連線' : '未連線'}
                    </span>
                </span>

                {/* User Avatar */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-300 text-sm font-medium">
                        K
                    </div>
                </div>
            </div>
        </header>
    );
}
