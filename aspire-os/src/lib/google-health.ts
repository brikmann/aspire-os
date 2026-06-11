import { google } from 'googleapis';
import { makeGoogleClient } from './google-auth';
import { supabase } from './supabase';
import { encryptToken, decryptToken } from './crypto';

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
];

const CALLBACK = '/api/auth/google-health/callback';

// ── OAuth ─────────────────────────────────────────────────────────────────

export function getGoogleHealthAuthUrl(sessionId: string, baseUrl?: string): string {
  const effectiveBase = baseUrl ?? process.env.APP_URL ?? 'http://localhost:3000';
  console.log('OAuth URL components:', {
    client_id_present: !!process.env.GOOGLE_HEALTH_CLIENT_ID || !!process.env.GOOGLE_CLIENT_ID,
    app_url: process.env.APP_URL,
    effective_base: effectiveBase,
    expected_redirect: `${effectiveBase}${CALLBACK}`,
  });

  const authUrl = makeGoogleClient(CALLBACK, baseUrl).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: sessionId,
  });

  console.log('Final OAuth URL:', authUrl);
  return authUrl;
}

export async function exchangeGoogleHealthCode(code: string, sessionId: string, baseUrl?: string): Promise<void> {
  const client = makeGoogleClient(CALLBACK, baseUrl);
  const { tokens } = await client.getToken(code);

  await supabase.from('user_oauth').upsert(
    {
      session_id: sessionId,
      provider: 'google_health',
      access_token: encryptToken(tokens.access_token!),
      refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    },
    { onConflict: 'session_id,provider' },
  );
}

export type HealthTokenStatus =
  | { ok: true; token: string }
  | { ok: false; reconnectNeeded: boolean };

export async function getRefreshedGoogleHealthTokens(sessionId: string): Promise<HealthTokenStatus> {
  const { data, error } = await supabase
    .from('user_oauth')
    .select('access_token, refresh_token, expires_at')
    .eq('session_id', sessionId)
    .eq('provider', 'google_health')
    .single();

  if (error || !data) return { ok: false, reconnectNeeded: false };

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  const isExpired = Date.now() > expiresAt - 60_000;

  if (!isExpired) {
    return { ok: true, token: decryptToken(data.access_token) };
  }

  if (!data.refresh_token) return { ok: false, reconnectNeeded: true };

  try {
    const client = makeGoogleClient(CALLBACK);
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
      .eq('provider', 'google_health');

    return { ok: true, token: credentials.access_token! };
  } catch {
    return { ok: false, reconnectNeeded: true };
  }
}

// ── Data fetching (Google Fitness API v1) ─────────────────────────────────

export type HealthData = {
  steps: number | null;
  restingHr: number | null;
  hrv: number | null;
  sleepHours: number | null;
  sourceDevices: string[];
  fetchedAt: string;
};

export async function fetchTodaysGoogleHealthData(accessToken: string): Promise<HealthData> {
  const client = makeGoogleClient(CALLBACK);
  client.setCredentials({ access_token: accessToken });
  const fitness = google.fitness({ version: 'v1', auth: client });

  const now = Date.now();
  const yesterday = now - 24 * 60 * 60 * 1000;
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const midnightMs = midnight.getTime();

  let steps: number | null = null;
  let restingHr: number | null = null;
  let sleepHours: number | null = null;

  // Steps — midnight to now so we only count today's movement
  try {
    const stepsAgg = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
        bucketByTime: { durationMillis: String(now - midnightMs) },
        startTimeMillis: String(midnightMs),
        endTimeMillis: String(now),
      },
    });
    for (const bucket of stepsAgg.data.bucket ?? []) {
      for (const dataset of bucket.dataset ?? []) {
        for (const point of dataset.point ?? []) {
          const v = point.value ?? [];
          if (v[0]?.intVal != null) steps = (steps ?? 0) + v[0].intVal;
        }
      }
    }
  } catch { /* no step data */ }

  // HR — yesterday to now to capture overnight readings for resting HR proxy
  try {
    const hrAgg = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }],
        bucketByTime: { durationMillis: String(now - yesterday) },
        startTimeMillis: String(yesterday),
        endTimeMillis: String(now),
      },
    });
    for (const bucket of hrAgg.data.bucket ?? []) {
      for (const dataset of bucket.dataset ?? []) {
        for (const point of dataset.point ?? []) {
          const v = point.value ?? [];
          if (v[0]?.fpVal != null) {
            const bpm = v[0].fpVal;
            if (restingHr === null || bpm < restingHr) restingHr = bpm;
          }
        }
      }
    }
  } catch { /* no HR data */ }

  // Sleep — activityType 72 = sleeping, last 24h to catch last night
  try {
    const sessions = await fitness.users.sessions.list({
      userId: 'me',
      activityType: [72],
      startTime: new Date(yesterday).toISOString(),
      endTime: new Date(now).toISOString(),
    });
    let totalMs = 0;
    for (const s of sessions.data.session ?? []) {
      const start = parseInt(s.startTimeMillis ?? '0', 10);
      const end = parseInt(s.endTimeMillis ?? '0', 10);
      if (end > start) totalMs += end - start;
    }
    if (totalMs > 0) sleepHours = Math.round((totalMs / 3_600_000) * 10) / 10;
  } catch { /* no sleep data */ }

  return {
    steps,
    restingHr: restingHr !== null ? Math.round(restingHr) : null,
    hrv: null, // Fitness API does not expose HRV
    sleepHours,
    sourceDevices: [],
    fetchedAt: new Date().toISOString(),
  };
}

// ── Disconnect ────────────────────────────────────────────────────────────

export async function disconnectGoogleHealth(sessionId: string): Promise<void> {
  await supabase
    .from('user_oauth')
    .delete()
    .eq('session_id', sessionId)
    .eq('provider', 'google_health');
}
