import { NextRequest, NextResponse } from 'next/server';
import { getOutlookAuthUrl } from '@/lib/outlook-calendar';

export async function GET(req: NextRequest) {
  const baseUrl = new URL(req.url).origin.replace(/^https:\/\/www\./, 'https://');
  const existing = req.cookies.get('cadence_session')?.value;
  const sessionId = existing ?? crypto.randomUUID();
  const authUrl = getOutlookAuthUrl(sessionId, baseUrl);

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
