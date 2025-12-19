import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Input({
  label,
  error,
  helperText,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-300 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2 bg-neutral-800 border rounded-md text-sm text-neutral-100
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-neutral-900
          disabled:bg-neutral-900 disabled:text-neutral-500 disabled:cursor-not-allowed
          placeholder:text-neutral-500
          ${error
            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
            : 'border-neutral-700 focus:border-primary-500 focus:ring-primary-500/20'
          }
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-danger-400">{error}</p>}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-neutral-400">{helperText}</p>
      )}
    </div>
  );
}
