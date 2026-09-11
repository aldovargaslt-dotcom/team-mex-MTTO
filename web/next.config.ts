import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  // standalone = imagen Docker. Vercel inyecta VERCEL=1 y usa su output.
  ...(!process.env.VERCEL ? { output: 'standalone' as const } : {}),
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
