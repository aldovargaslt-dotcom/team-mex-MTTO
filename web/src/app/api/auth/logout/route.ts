import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin, SESSION_COOKIE, FLOW_COOKIE, cookieOptions, noStore } from '@/lib/server/auth';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ message: 'Solicitud no autorizada.' }, { status: 403, headers: noStore });
    const response = new NextResponse(null, { status: 204, headers: noStore });
    for (const name of [SESSION_COOKIE, FLOW_COOKIE]) response.cookies.set(name, '', { ...cookieOptions, maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ message: 'No se pudo cerrar sesión. Intenta de nuevo.' }, { status: 503, headers: noStore });
  }
}
