import type { NextConfig } from 'next';

const PRODUCTION_API = 'https://team-mex-mtto-production.up.railway.app';

function resolveApiUrl(): string {
  const fromEnv = process.env.API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT) {
    return PRODUCTION_API;
  }
  return 'http://localhost:3001';
}

const API_URL = resolveApiUrl();

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
      {
        source: '/flota/alertas',
        destination: '/configuracion/alertas?code=FLOTA_SIN_REGRESO',
        permanent: false,
      },
      {
        source: '/flota/alertas/',
        destination: '/configuracion/alertas?code=FLOTA_SIN_REGRESO',
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
