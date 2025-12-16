'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = 'info',
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const styles = {
    success: 'bg-success-50 border-success-200 text-success-900',
    error: 'bg-danger-50 border-danger-200 text-danger-900',
    info: 'bg-primary-50 border-primary-200 text-primary-900',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        px-4 py-3 rounded-md border
        shadow-lg
        flex items-center gap-3
        min-w-[300px] max-w-[500px]
        animate-in slide-in-from-top-2 duration-300
        ${styles[type]}
      `}
    >
      <span className="text-lg font-semibold">{icons[type]}</span>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
