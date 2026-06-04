import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getGoogleHealthAuthUrl } from '@/lib/google-health';

export async function GET(req: NextRequest) {
  // Reuse existing session cookie so Fit + Calendar tokens remain accessible
  const baseUrl = new URL(req.url).origin.replace(/^https:\/\/www\./, 'https://');
  const existing = req.cookies.get('cadence_session')?.value;
  const sessionId = existing ?? randomUUID();
  const authUrl = getGoogleHealthAuthUrl(sessionId, baseUrl);

  const res = NextResponse.redirect(authUrl);
  if (!existing) {
    res.cookies.set('cadence_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
  }
  return res;
}
