import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAuthUrl } from '@/lib/google-fit';

export async function GET(req: NextRequest) {
  const sessionId = randomUUID();
  const authUrl = getAuthUrl(sessionId);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('cadence_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
