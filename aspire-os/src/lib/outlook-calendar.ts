import { supabase } from './supabase';
import { encryptToken, decryptToken } from './crypto';
import { type CalendarEvent } from './google-calendar';

const CALLBACK = '/api/auth/outlook/callback';
const AUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const SCOPES = 'Calendars.Read offline_access';

function redirectUri(baseUrl?: string): string {
  const base = baseUrl ?? process.env.APP_URL ?? 'http://localhost:3000';
  return `${base}${CALLBACK}`;
}

// ── OAuth ─────────────────────────────────────────────────────────────────

export function getOutlookAuthUrl(sessionId: string, baseUrl?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: redirectUri(baseUrl),
    scope: SCOPES,
    state: sessionId,
    response_mode: 'query',
  });
  return `${AUTH_BASE}?${params}`;
}

export async function exchangeOutlookCode(code: string, sessionId: string, baseUrl?: string): Promise<void> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri(baseUrl),
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Outlook token exchange failed ${res.status}: ${body}`);
  }

  const tokens = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };

  await supabase.from('user_oauth').upsert(
    {
      session_id: sessionId,
      provider: 'outlook',
      access_token: encryptToken(tokens.access_token),
      refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
    },
    { onConflict: 'session_id,provider' },
  );
}

export type OutlookTokenStatus =
  | { ok: true; token: string }
  | { ok: false; reconnectNeeded: boolean };

export async function getRefreshedOutlookTokens(sessionId: string): Promise<OutlookTokenStatus> {
  const { data, error } = await supabase
    .from('user_oauth')
    .select('access_token, refresh_token, expires_at')
    .eq('session_id', sessionId)
    .eq('provider', 'outlook')
    .single();

  if (error || !data) return { ok: false, reconnectNeeded: false };

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  const isExpired = Date.now() > expiresAt - 60_000;

  if (!isExpired) {
    return { ok: true, token: decryptToken(data.access_token) };
  }

  if (!data.refresh_token) return { ok: false, reconnectNeeded: true };

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: decryptToken(data.refresh_token),
        grant_type: 'refresh_token',
        scope: SCOPES,
      }),
    });

    if (!res.ok) return { ok: false, reconnectNeeded: true };

    const tokens = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };

    await supabase
      .from('user_oauth')
      .update({
        access_token: encryptToken(tokens.access_token),
        expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        ...(tokens.refresh_token ? { refresh_token: encryptToken(tokens.refresh_token) } : {}),
      })
      .eq('session_id', sessionId)
      .eq('provider', 'outlook');

    return { ok: true, token: tokens.access_token };
  } catch {
    return { ok: false, reconnectNeeded: true };
  }
}

// ── Data fetching (Microsoft Graph) ───────────────────────────────────────

export async function fetchTodaysOutlookEvents(accessToken: string): Promise<CalendarEvent[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    startDateTime: todayStart.toISOString(),
    endDateTime: todayEnd.toISOString(),
    $orderby: 'start/dateTime',
    $top: '50',
    $select: 'subject,start,end,location',
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Return times in the user's mailbox timezone (no offset suffix) so
        // the same regex that parses Google Calendar times works here too.
        Prefer: 'outlook.timezone="UTC"',
      },
    },
  );

  if (!res.ok) throw new Error(`Outlook calendarView ${res.status}`);

  const json = await res.json() as {
    value?: Array<{
      subject?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
      location?: { displayName?: string };
    }>
  };

  const fmt = (iso: string): string => {
    const m = iso.match(/T(\d{2}):(\d{2})/);
    if (!m) return '';
    let h = parseInt(m[1]);
    const min = m[2];
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${min} ${period}`;
  };

  return (json.value ?? []).map((ev) => {
    const startStr = ev.start?.dateTime ?? '';
    const endStr = ev.end?.dateTime ?? '';
    const startMs = startStr ? new Date(startStr).getTime() : 0;
    const endMs = endStr ? new Date(endStr).getTime() : 0;
    const duration_min = startMs && endMs ? Math.round((endMs - startMs) / 60_000) : 0;

    return {
      start: fmt(startStr),
      end: fmt(endStr),
      summary: ev.subject ?? '(No title)',
      ...(ev.location?.displayName ? { location: ev.location.displayName } : {}),
      duration_min,
    };
  });
}

// ── Disconnect ────────────────────────────────────────────────────────────

export async function disconnectOutlook(sessionId: string): Promise<void> {
  await supabase
    .from('user_oauth')
    .delete()
    .eq('session_id', sessionId)
    .eq('provider', 'outlook');
}
