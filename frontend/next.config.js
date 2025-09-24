/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  ...(process.env.NODE_ENV === 'production' && { output: 'export' }),
  trailingSlash: false,
  reactStrictMode: false, // Disable React Strict Mode to prevent double rendering in development
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tcgplayer-cdn.tcgplayer.com',
        port: '',
        pathname: '/product/**',
      },
    ],
    // localPatterns removed - not supported in this Next.js version
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    config.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
}

module.exports = nextConfig
