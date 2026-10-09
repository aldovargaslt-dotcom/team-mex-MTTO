import { NextRequest, NextResponse } from 'next/server';
import { legacyDevelopment, authConfig, sessionToken, identity, SESSION_COOKIE, cookieOptions, noStore } from '@/lib/server/auth';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  if (legacyDevelopment()) return NextResponse.json({ mode: 'DEVELOPMENT', authenticated: false }, { headers: noStore });
  try {
    authConfig();
    const token = await sessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    const actor = token ? await identity(token) : null;
    const response = NextResponse.json({ mode: 'OIDC', authenticated: Boolean(actor), actor }, { headers: noStore });
    if (!actor) response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ mode: 'OIDC', authenticated: false, message: 'No se pudo verificar la sesión. Intenta de nuevo más tarde.' }, { status: 503, headers: noStore });
  }
}
