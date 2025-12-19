import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
}

export default function Select({
  label,
  options,
  error,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-300 mb-1.5">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-3 py-2 bg-neutral-800 border rounded-md text-sm text-neutral-100
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-neutral-900
          disabled:bg-neutral-900 disabled:text-neutral-500 disabled:cursor-not-allowed
          ${error
            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
            : 'border-neutral-700 focus:border-primary-500 focus:ring-primary-500/20'
          }
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-neutral-800">
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-danger-400">{error}</p>}
    </div>
  );
}
