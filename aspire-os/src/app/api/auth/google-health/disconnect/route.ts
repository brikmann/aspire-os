import { NextRequest, NextResponse } from 'next/server';
import { disconnectGoogleHealth } from '@/lib/google-health';

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (sessionId) {
    await disconnectGoogleHealth(sessionId);
  }

  // Do not delete the session cookie — other integrations (Fit, Calendar) may still be active
  return NextResponse.json({ ok: true });
}
