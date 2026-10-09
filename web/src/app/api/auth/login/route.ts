import { NextRequest, NextResponse } from 'next/server';
import { authConfig, metadata, random, challenge, seal, FLOW_COOKIE, cookieOptions, noStore } from '@/lib/server/auth';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try {
    const config = authConfig();
    const info = await metadata();
    const state = random(), nonce = random(), verifier = random();
    const url = new URL(info.authorization_endpoint);
    for (const [key, value] of Object.entries({
      response_type: 'code', client_id: config.clientId, redirect_uri: `${config.origin}/api/auth/callback`,
      scope: config.scope, state, nonce, code_challenge: challenge(verifier), code_challenge_method: 'S256',
    })) url.searchParams.set(key, value);
    if (config.audience) url.searchParams.set('audience', config.audience);
    const response = NextResponse.redirect(url);
    response.headers.set('Cache-Control', noStore['Cache-Control']);
    response.cookies.set(FLOW_COOKIE, await seal({ state, nonce, verifier }, 600, 'login'), { ...cookieOptions, maxAge: 600 });
    return response;
  } catch {
    return NextResponse.redirect(new URL('/?authError=login', request.url), { headers: noStore });
  }
}
