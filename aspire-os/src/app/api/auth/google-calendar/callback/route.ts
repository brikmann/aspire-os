import { NextRequest, NextResponse } from 'next/server';
import { exchangeCalendarCode } from '@/lib/google-calendar';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (!code || !state || !sessionId || state !== sessionId) {
    return NextResponse.redirect(new URL('/cadence?error=calendar_auth_failed', req.url));
  }

  try {
    await exchangeCalendarCode(code, sessionId);
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    return NextResponse.redirect(new URL('/cadence?error=calendar_auth_failed', req.url));
  }

  return NextResponse.redirect(new URL('/cadence?calendar_connected=true', req.url));
}
