import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleHealthCode } from '@/lib/google-health';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const sessionId = req.cookies.get('cadence_session')?.value;

  console.log('Health OAuth callback:', {
    has_code: !!code,
    has_state: !!state,
    has_session_cookie: !!sessionId,
    state_matches_cookie: state === sessionId,
    google_error: error,
    url: req.url,
  });

  if (error) {
    console.error('Google returned OAuth error:', error, searchParams.get('error_description'));
    return NextResponse.redirect(new URL(`/dashboard?error=health_auth_failed&reason=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state || !sessionId || state !== sessionId) {
    console.error('Health callback guard failed:', { has_code: !!code, has_state: !!state, has_session_cookie: !!sessionId, state_matches: state === sessionId });
    return NextResponse.redirect(new URL('/dashboard?error=health_auth_failed', req.url));
  }

  try {
    const baseUrl = new URL(req.url).origin.replace(/^https:\/\/www\./, 'https://');
    console.log('Exchanging Health code, baseUrl:', baseUrl);
    await exchangeGoogleHealthCode(code, sessionId, baseUrl);
    console.log('Health token exchange succeeded for session:', sessionId.slice(0, 8));
  } catch (err) {
    console.error('Google Health callback error:', err);
    return NextResponse.redirect(new URL('/dashboard?error=health_auth_failed', req.url));
  }

  return NextResponse.redirect(new URL('/dashboard?health_connected=true', req.url));
}
