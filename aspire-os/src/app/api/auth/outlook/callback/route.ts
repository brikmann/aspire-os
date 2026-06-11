import { NextRequest, NextResponse } from 'next/server';
import { exchangeOutlookCode } from '@/lib/outlook-calendar';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (error) {
    console.error('Outlook OAuth error:', error, searchParams.get('error_description'));
    return NextResponse.redirect(new URL('/dashboard?error=outlook_auth_failed', req.url));
  }

  if (!code || !state || !sessionId || state !== sessionId) {
    console.error('Outlook callback guard failed:', { has_code: !!code, has_state: !!state, has_session_cookie: !!sessionId, state_matches: state === sessionId });
    return NextResponse.redirect(new URL('/dashboard?error=outlook_auth_failed', req.url));
  }

  try {
    const baseUrl = new URL(req.url).origin.replace(/^https:\/\/www\./, 'https://');
    await exchangeOutlookCode(code, sessionId, baseUrl);
  } catch (err) {
    console.error('Outlook callback error:', err);
    return NextResponse.redirect(new URL('/dashboard?error=outlook_auth_failed', req.url));
  }

  return NextResponse.redirect(new URL('/dashboard?outlook_connected=true', req.url));
}
