import { NextRequest, NextResponse } from 'next/server';
import { getRefreshedGoogleHealthTokens, fetchTodaysGoogleHealthData } from '@/lib/google-health';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (!sessionId) {
    return NextResponse.json({ connected: false });
  }

  const result = await getRefreshedGoogleHealthTokens(sessionId);

  if (!result.ok) {
    return NextResponse.json({ connected: false, reconnectNeeded: result.reconnectNeeded });
  }

  try {
    const data = await fetchTodaysGoogleHealthData(result.token);
    return NextResponse.json({ connected: true, ...data });
  } catch {
    return NextResponse.json({
      connected: true,
      steps: null,
      restingHr: null,
      hrv: null,
      sleepHours: null,
      sourceDevices: [],
    });
  }
}
