import { NextRequest, NextResponse } from 'next/server';
import { exchangeOutlookCode } from '@/lib/outlook-calendar';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const sessionId = req.cookies.get('cadence_session')?.value;

  console.log('Outlook callback received:', {
    has_code: !!code,
    has_state: !!state,
    has_session_cookie: !!sessionId,
    state_matches: state === sessionId,
    ms_error: error ?? null,
    client_id_present: !!process.env.MICROSOFT_CLIENT_ID,
    client_secret_present: !!process.env.MICROSOFT_CLIENT_SECRET,
  });

  if (error) {
    console.error('Microsoft returned OAuth error:', error, errorDescription);
    const dest = new URL('/dashboard', req.url);
    dest.searchParams.set('error', 'outlook_auth_failed');
    dest.searchParams.set('reason', error);
    return NextResponse.redirect(dest);
  }

  if (!code || !state || !sessionId || state !== sessionId) {
    const reason = !code ? 'no_code' : !state ? 'no_state' : !sessionId ? 'no_cookie' : 'state_mismatch';
    console.error('Outlook callback guard failed:', { reason, has_code: !!code, has_state: !!state, has_session_cookie: !!sessionId, state_matches: state === sessionId });
    const dest = new URL('/dashboard', req.url);
    dest.searchParams.set('error', 'outlook_auth_failed');
    dest.searchParams.set('reason', reason);
    return NextResponse.redirect(dest);
  }

  try {
    const baseUrl = new URL(req.url).origin.replace(/^https:\/\/www\./, 'https://');
    await exchangeOutlookCode(code, sessionId, baseUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Outlook token exchange error:', msg);
    const dest = new URL('/dashboard', req.url);
    dest.searchParams.set('error', 'outlook_auth_failed');
    dest.searchParams.set('reason', 'token_exchange');
    dest.searchParams.set('detail', msg.slice(0, 100));
    return NextResponse.redirect(dest);
  }

  return NextResponse.redirect(new URL('/dashboard?outlook_connected=true', req.url));
}
