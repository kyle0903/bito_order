import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "A CUBE",
  description: "個人資產管理及交易界面",
  icons: {
    icon: "/Logo.png"
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
