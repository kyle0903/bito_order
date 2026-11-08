import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 中性色 - Apple 深色模式灰階（950 為頁面底色，900 為卡片）
        neutral: {
          50: '#fbfbfd',
          100: '#f5f5f7',
          200: '#d1d1d6',
          300: '#aeaeb2',
          400: '#8e8e93',
          500: '#636366',
          600: '#48484a',
          700: '#3a3a3c',
          800: '#2c2c2e',
          900: '#1c1c1e',
          950: '#000000',
        },
        // 強調色 - Apple 藍（600 = #0071e3，400 為深色背景上的連結色）
        primary: {
          50: '#e8f2ff',
          100: '#cce4ff',
          200: '#99c9ff',
          300: '#66b0ff',
          400: '#2997ff',
          500: '#0a84ff',
          600: '#0071e3',
          700: '#0062c4',
          800: '#004b96',
          900: '#003166',
        },
        // 漲 - Apple 系統綠（深色模式）
        success: {
          50: '#eafbef',
          100: '#cdf5d8',
          200: '#9debb2',
          300: '#6be08b',
          400: '#30d158',
          500: '#28cd41',
          600: '#24a845',
          700: '#1c8236',
          800: '#145c27',
          900: '#0d3b19',
        },
        // 跌 - Apple 系統紅（深色模式）
        danger: {
          50: '#fff0ef',
          100: '#ffdad7',
          200: '#ffb4ae',
          300: '#ff8a82',
          400: '#ff6961',
          500: '#ff453a',
          600: '#e0352b',
          700: '#b52a22',
          800: '#861f19',
          900: '#5a1511',
        },
        // 警示 - Apple 系統橘
        warning: {
          50: '#fff6e6',
          100: '#ffe8bf',
          200: '#ffd380',
          300: '#ffbf40',
          400: '#ffb340',
          500: '#ff9f0a',
          600: '#e08a00',
          700: '#b36e00',
          800: '#805000',
          900: '#4d3000',
        },
      },
      fontFamily: {
        // 優先使用 Apple 系統字體（SF Pro / 蘋方），其他平台退回 Inter
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'var(--font-inter)', '"PingFang TC"', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        'sm': '0.25rem',
        DEFAULT: '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
