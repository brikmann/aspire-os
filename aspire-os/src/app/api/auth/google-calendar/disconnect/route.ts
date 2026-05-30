import { NextRequest, NextResponse } from 'next/server';
import { disconnectCalendar } from '@/lib/google-calendar';

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (sessionId) {
    await disconnectCalendar(sessionId);
  }

  return NextResponse.json({ success: true });
}
