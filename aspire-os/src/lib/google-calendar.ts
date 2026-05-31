import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from './supabase';
import { encryptToken, decryptToken } from './crypto';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

function getCallbackUrl(): string {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  return `${base}/api/auth/google-calendar/callback`;
}

function makeClient(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_FIT_CLIENT_ID!,
    process.env.GOOGLE_FIT_CLIENT_SECRET!,
    getCallbackUrl(),
  );
}

export function getCalendarAuthUrl(sessionId: string): string {
  return makeClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: sessionId,
  });
}

export async function exchangeCalendarCode(code: string, sessionId: string): Promise<void> {
  const client = makeClient();
  const { tokens } = await client.getToken(code);

  await supabase.from('user_oauth').upsert(
    {
      session_id: sessionId,
      provider: 'google_calendar',
      access_token: encryptToken(tokens.access_token!),
      refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    },
    { onConflict: 'session_id,provider' },
  );
}

export type CalendarTokenStatus =
  | { ok: true; token: string }
  | { ok: false; reconnectNeeded: boolean };

export async function getRefreshedCalendarTokens(sessionId: string): Promise<CalendarTokenStatus> {
  const { data, error } = await supabase
    .from('user_oauth')
    .select('access_token, refresh_token, expires_at')
    .eq('session_id', sessionId)
    .eq('provider', 'google_calendar')
    .single();

  if (error || !data) return { ok: false, reconnectNeeded: false };

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  const isExpired = Date.now() > expiresAt - 60_000;

  if (!isExpired) {
    return { ok: true, token: decryptToken(data.access_token) };
  }

  if (!data.refresh_token) return { ok: false, reconnectNeeded: true };

  try {
    const client = makeClient();
    client.setCredentials({ refresh_token: decryptToken(data.refresh_token) });
    const { credentials } = await client.refreshAccessToken();

    await supabase
      .from('user_oauth')
      .update({
        access_token: encryptToken(credentials.access_token!),
        expires_at: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : null,
      })
      .eq('session_id', sessionId)
      .eq('provider', 'google_calendar');

    return { ok: true, token: credentials.access_token! };
  } catch {
    return { ok: false, reconnectNeeded: true };
  }
}

export type CalendarEvent = {
  start: string;
  end: string;
  summary: string;
  location?: string;
  duration_min: number;
};

export async function fetchTodaysCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  const client = makeClient();
  client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth: client });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: todayStart.toISOString(),
    timeMax: todayEnd.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items ?? []).map((ev) => {
    const startStr = ev.start?.dateTime ?? ev.start?.date ?? '';
    const endStr = ev.end?.dateTime ?? ev.end?.date ?? '';
    const startMs = new Date(startStr).getTime();
    const endMs = new Date(endStr).getTime();
    const duration_min = Math.round((endMs - startMs) / 60_000);

    // Extract local time directly from the RFC 3339 string ("2026-05-31T14:00:00-04:00")
    // so the server's UTC timezone never corrupts the display time.
    const fmt = (iso: string): string => {
      const m = iso.match(/T(\d{2}):(\d{2})/);
      if (!m) return '';
      let h = parseInt(m[1]);
      const min = m[2];
      const period = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${min} ${period}`;
    };

    return {
      start: fmt(startStr),
      end: fmt(endStr),
      summary: ev.summary ?? '(No title)',
      ...(ev.location ? { location: ev.location } : {}),
      duration_min,
    };
  });
}

export async function disconnectCalendar(sessionId: string): Promise<void> {
  await supabase
    .from('user_oauth')
    .delete()
    .eq('session_id', sessionId)
    .eq('provider', 'google_calendar');
}
