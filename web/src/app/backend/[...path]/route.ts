import { NextRequest, NextResponse } from 'next/server';
import { authConfig, legacyDevelopment, sameOrigin, sessionToken, SESSION_COOKIE, cookieOptions, noStore } from '@/lib/server/auth';
export const runtime = 'nodejs';
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const legacy = legacyDevelopment();
    const apiUrl = legacy ? (process.env.API_URL || 'http://localhost:3001') : authConfig().apiUrl;
    const headers = new Headers();
    for (const name of ['content-type', 'accept', 'idempotency-key']) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (legacy) {
      for (const name of ['x-role', 'x-user-id', 'authorization']) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
      }
    } else {
      if (!['GET', 'HEAD'].includes(request.method) && !sameOrigin(request))
        return NextResponse.json({ message: 'Solicitud no autorizada.' }, { status: 403, headers: noStore });
      const token = await sessionToken(request.cookies.get(SESSION_COOKIE)?.value);
      if (!token) return NextResponse.json({ message: 'Inicia sesión para continuar.' }, { status: 401, headers: noStore });
      headers.set('authorization', `Bearer ${token}`);
    }
    const { path } = await context.params;
    if (path.some(part => part === '.' || part === '..' || /[\\/]/.test(part)))
      return NextResponse.json({ message: 'Ruta inválida.' }, { status: 400, headers: noStore });
    const url = `${apiUrl.replace(/\/$/, '')}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
    const upstream = await fetch(url, {
      method: request.method, headers, cache: 'no-store', redirect: 'error',
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      signal: AbortSignal.timeout(30000),
    });
    const responseHeaders = new Headers(noStore);
    for (const name of ['content-type', 'content-disposition']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    const response = new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
    if (!legacy && upstream.status === 401) response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ message: 'No se pudo conectar con el servicio. Intenta de nuevo.' }, { status: 503, headers: noStore });
  }
}
export { proxy as GET, proxy as HEAD, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
