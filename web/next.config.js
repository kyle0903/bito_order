/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 舊網址（頁面重整前）導向新頁面
  async redirects() {
    return [
      { source: '/history', destination: '/import', permanent: true },
      { source: '/market', destination: '/bitopro', permanent: true },
      { source: '/trading', destination: '/bitopro', permanent: true },
    ];
  },
}

module.exports = nextConfig
