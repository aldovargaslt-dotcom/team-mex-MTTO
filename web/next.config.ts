import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  // Docker/Compose uses standalone. Vercel builds its own output — do not set it there.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  async redirects() {
    return [
      {
        source: '/tipos',
        destination: '/unidades',
        permanent: false,
      },
      {
        source: '/tipos/',
        destination: '/unidades',
        permanent: false,
      },
      {
        source: '/unidades/configuracion',
        destination: '/unidades',
        permanent: false,
      },
      {
        source: '/unidades/configuracion/',
        destination: '/unidades',
        permanent: false,
      },
    ];
  },
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
