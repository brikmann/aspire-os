import { NextRequest, NextResponse } from 'next/server';
import { disconnectOutlook } from '@/lib/outlook-calendar';

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (sessionId) {
    await disconnectOutlook(sessionId);
  }

  return NextResponse.json({ success: true });
}
