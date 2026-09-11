import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  // Docker/Compose uses standalone. Vercel builds its own output — do not set it there.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
