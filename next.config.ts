import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'gaip.mx', pathname: '/static/media/**' }],
  },
};

export default nextConfig;
