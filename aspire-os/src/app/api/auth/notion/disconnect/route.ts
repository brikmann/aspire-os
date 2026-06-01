import { NextRequest, NextResponse } from 'next/server';
import { disconnectNotion } from '@/lib/notion';

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (sessionId) {
    await disconnectNotion(sessionId);
  }

  return NextResponse.json({ ok: true });
}
