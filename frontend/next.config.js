/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tcgplayer-cdn.tcgplayer.com',
        port: '',
        pathname: '/product/**',
      },
    ],
  },
}

module.exports = nextConfig
