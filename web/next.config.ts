import type { NextConfig } from 'next';

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
};

export default nextConfig;
