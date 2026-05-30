import { NextRequest, NextResponse } from 'next/server';
import { getRefreshedTokens, fetchTodaysHealthData } from '@/lib/google-fit';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (!sessionId) {
    return NextResponse.json({ connected: false });
  }

  const result = await getRefreshedTokens(sessionId);

  if (!result.ok) {
    return NextResponse.json({ connected: false, reconnectNeeded: result.reconnectNeeded });
  }

  try {
    const data = await fetchTodaysHealthData(result.token);
    return NextResponse.json({ connected: true, ...data });
  } catch {
    return NextResponse.json({ connected: true, sleepHours: null, restingHr: null, steps: null });
  }
}
