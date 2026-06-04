import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleHealthCode } from '@/lib/google-health';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (!code || !state || !sessionId || state !== sessionId) {
    return NextResponse.redirect(new URL('/dashboard?error=health_auth_failed', req.url));
  }

  try {
    await exchangeGoogleHealthCode(code, sessionId, new URL(req.url).origin);
  } catch (err) {
    console.error('Google Health callback error:', err);
    return NextResponse.redirect(new URL('/dashboard?error=health_auth_failed', req.url));
  }

  return NextResponse.redirect(new URL('/dashboard?health_connected=true', req.url));
}
