import { NextRequest, NextResponse } from 'next/server';
import { getRefreshedOutlookTokens, fetchTodaysOutlookEvents } from '@/lib/outlook-calendar';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('cadence_session')?.value;

  if (!sessionId) {
    return NextResponse.json({ connected: false });
  }

  const result = await getRefreshedOutlookTokens(sessionId);

  if (!result.ok) {
    return NextResponse.json({ connected: false, reconnectNeeded: result.reconnectNeeded });
  }

  try {
    const events = await fetchTodaysOutlookEvents(result.token);
    return NextResponse.json({ connected: true, events });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[outlook/data] fetchTodaysOutlookEvents failed:', msg);
    return NextResponse.json({ connected: true, events: [], _debug: msg });
  }
}
