import { NextRequest, NextResponse } from 'next/server';
import { getRefreshedCalendarTokens, fetchTodaysCalendarEvents } from '@/lib/google-calendar';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (!sessionId) {
    return NextResponse.json({ connected: false });
  }

  const result = await getRefreshedCalendarTokens(sessionId);

  if (!result.ok) {
    return NextResponse.json({ connected: false, reconnectNeeded: result.reconnectNeeded });
  }

  try {
    const events = await fetchTodaysCalendarEvents(result.token);
    return NextResponse.json({ connected: true, events });
  } catch {
    return NextResponse.json({ connected: true, events: [] });
  }
}
