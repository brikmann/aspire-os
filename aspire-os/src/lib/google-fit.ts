import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from './supabase';
import { encryptToken, decryptToken } from './crypto';

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
];

function getCallbackUrl(): string {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  return `${base}/api/auth/google-fit/callback`;
}

function makeClient(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_FIT_CLIENT_ID!,
    process.env.GOOGLE_FIT_CLIENT_SECRET!,
    getCallbackUrl(),
  );
}

export function getAuthUrl(sessionId: string): string {
  return makeClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: sessionId,
  });
}

export async function exchangeCode(code: string, sessionId: string): Promise<void> {
  const client = makeClient();
  const { tokens } = await client.getToken(code);

  await supabase.from('user_oauth').upsert(
    {
      session_id: sessionId,
      provider: 'google_fit',
      access_token: encryptToken(tokens.access_token!),
      refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    },
    { onConflict: 'session_id' },
  );
}

export type TokenStatus =
  | { ok: true; token: string }
  | { ok: false; reconnectNeeded: boolean };

export async function getRefreshedTokens(sessionId: string): Promise<TokenStatus> {
  const { data, error } = await supabase
    .from('user_oauth')
    .select('access_token, refresh_token, expires_at')
    .eq('session_id', sessionId)
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
      .eq('session_id', sessionId);

    return { ok: true, token: credentials.access_token! };
  } catch {
    return { ok: false, reconnectNeeded: true };
  }
}

export async function fetchTodaysHealthData(accessToken: string): Promise<{
  steps: number | null;       // since midnight today
  sleepHours: number | null;  // last night's sleep session(s)
  restingHr: number | null;   // today's min BPM proxy for resting HR
  fetchedAt: string;          // ISO timestamp of when data was pulled
}> {
  const client = makeClient();
  client.setCredentials({ access_token: accessToken });
  const fitness = google.fitness({ version: 'v1', auth: client });

  const now = Date.now();
  const yesterday = now - 24 * 60 * 60 * 1000;
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const midnightMs = midnight.getTime();

  let sleepHours: number | null = null;
  let restingHr: number | null = null;
  let steps: number | null = null;

  // Steps: midnight → now so we only count today's movement, not yesterday afternoon
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
  } catch {
    // no step data — leave null
  }

  // HR: yesterday → now to capture overnight readings for resting HR proxy
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
  } catch {
    // no HR data — leave null
  }

  // Sleep via sessions (activityType 72 = sleeping), last 24h to catch last night
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
  } catch {
    // no sleep data — leave null
  }

  return {
    steps,
    sleepHours,
    restingHr: restingHr !== null ? Math.round(restingHr) : null,
    fetchedAt: new Date().toISOString(),
  };
}

export async function disconnectUser(sessionId: string): Promise<void> {
  await supabase.from('user_oauth').delete().eq('session_id', sessionId);
}
