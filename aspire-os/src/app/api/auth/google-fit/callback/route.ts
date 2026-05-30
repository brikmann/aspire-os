import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/google-fit';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (!code || !state || !sessionId || state !== sessionId) {
    return NextResponse.redirect(new URL('/cadence?error=auth_failed', req.url));
  }

  try {
    await exchangeCode(code, sessionId);
  } catch (err) {
    console.error('Google Fit callback error:', err);
    return NextResponse.redirect(new URL('/cadence?error=auth_failed', req.url));
  }

  return NextResponse.redirect(new URL('/cadence?connected=true', req.url));
}
