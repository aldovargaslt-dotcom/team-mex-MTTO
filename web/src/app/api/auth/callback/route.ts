import { NextRequest, NextResponse } from 'next/server';
import { authConfig, metadata, open, seal, identity, verifyIdToken, FLOW_COOKIE, SESSION_COOKIE, cookieOptions, noStore } from '@/lib/server/auth';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  let origin: string;
  try { origin = authConfig().origin; } catch {
    return NextResponse.json({ message: 'El acceso aún no está disponible.' }, { status: 503, headers: noStore });
  }
  const response = NextResponse.redirect(`${origin}/?authError=login`);
  response.headers.set('Cache-Control', noStore['Cache-Control']);
  response.cookies.set(FLOW_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  try {
    const config = authConfig();
    const flow = await open(request.cookies.get(FLOW_COOKIE)?.value, 'login');
    const params = request.nextUrl.searchParams;
    if (!flow || typeof flow.state !== 'string' || typeof flow.nonce !== 'string' || typeof flow.verifier !== 'string' ||
        params.getAll('state').length !== 1 || params.get('state') !== flow.state ||
        params.getAll('code').length !== 1 || !params.get('code') || params.has('error')) throw new Error('Invalid callback');
    const info = await metadata();
    const tokenResponse = await fetch(info.token_endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: params.get('code')!,
        redirect_uri: `${config.origin}/api/auth/callback`, client_id: config.clientId,
        client_secret: config.clientSecret, code_verifier: flow.verifier }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) throw new Error('Token exchange failed');
    const tokens = await tokenResponse.json();
    if (tokens.token_type?.toLowerCase() !== 'bearer' || typeof tokens.access_token !== 'string' ||
        typeof tokens.id_token !== 'string' || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0)
      throw new Error('Invalid token response');
    const id = await verifyIdToken(tokens.id_token, flow.nonce, tokens.access_token);
    const actor = await identity(tokens.access_token);
    if (!actor || actor.subject !== id.sub) throw new Error('Identity not provisioned');
    // API verified access token. Read exp only to shorten the session, never to authenticate.
    const claims = JSON.parse(Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString());
    const seconds = Math.floor(Math.min(3600, tokens.expires_in, claims.exp - Date.now() / 1000));
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Expired access token');
    const cookie = await seal({ accessToken: tokens.access_token }, seconds, 'session');
    if (cookie.length > 3800) throw new Error('Token too large for cookie session');
    response.headers.set('Location', `${origin}/`);
    response.cookies.set(SESSION_COOKIE, cookie, { ...cookieOptions, maxAge: seconds });
  } catch { /* Generic failure; credentials/provider details never leave the server. */ }
  return response;
}
