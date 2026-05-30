import { NextRequest, NextResponse } from 'next/server';
import { disconnectUser } from '@/lib/google-fit';

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (sessionId) {
    await disconnectUser(sessionId);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete('cadence_session');
  return res;
}
