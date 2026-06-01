import { makeGoogleHealthClient } from './google-auth';
import { supabase } from './supabase';
import { encryptToken, decryptToken } from './crypto';

// Scopes required for steps + activity, heart rate + HRV, and sleep.
// All googlehealth.* scopes are Restricted — production access requires Google's
// privacy and security review at developer.health.google.
const SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
];

const CALLBACK = '/api/auth/google-health/callback';
const HEALTH_BASE = 'https://health.googleapis.com/v4/users/me';

// ── OAuth ─────────────────────────────────────────────────────────────────

export function getGoogleHealthAuthUrl(sessionId: string): string {
  return makeGoogleHealthClient(CALLBACK).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: sessionId,
  });
}

export async function exchangeGoogleHealthCode(code: string, sessionId: string): Promise<void> {
  const client = makeGoogleHealthClient(CALLBACK);
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
    const client = makeGoogleHealthClient(CALLBACK);
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

// ── API helpers ───────────────────────────────────────────────────────────

async function healthGet(accessToken: string, path: string): Promise<unknown> {
  const res = await fetch(`${HEALTH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Health API GET ${path} → ${res.status}`);
  return res.json();
}

async function healthPost(accessToken: string, path: string, body: object): Promise<unknown> {
  const res = await fetch(`${HEALTH_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Health API POST ${path} → ${res.status}`);
  return res.json();
}

function todayRange() {
  const d = new Date();
  const date = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  return {
    start: { date, time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } },
    end:   { date, time: { hours: 23, minutes: 59, seconds: 59, nanos: 0 } },
  };
}

function todayDateStr(): string {
  return new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
}

// ── Data fetching ─────────────────────────────────────────────────────────

export type HealthData = {
  steps: number | null;
  restingHr: number | null;
  hrv: number | null;
  sleepHours: number | null;
  sourceDevices: string[];
  fetchedAt: string;
};

export async function fetchTodaysGoogleHealthData(accessToken: string): Promise<HealthData> {
  const range = todayRange();
  const today = todayDateStr();
  const sourceSet = new Set<string>();

  let steps: number | null = null;
  let restingHr: number | null = null;
  let hrv: number | null = null;
  let sleepHours: number | null = null;

  // Steps — dailyRollUp aggregates intraday step deltas into a single daily total
  try {
    const body = { range, windowSizeDays: 1 };
    const res = (await healthPost(accessToken, '/dataTypes/steps/dataPoints:dailyRollUp', body)) as {
      rollupDataPoints?: Array<{ steps?: { countSum?: string } }>;
    };
    const countSum = res.rollupDataPoints?.[0]?.steps?.countSum;
    if (countSum != null) steps = parseInt(countSum, 10);
  } catch { /* no step data */ }

  // Resting HR — daily-resting-heart-rate is a pre-computed daily value; use list with date filter
  try {
    const filter = encodeURIComponent(
      `dailyRestingHeartRate.date>="${today}" AND dailyRestingHeartRate.date<="${today}"`,
    );
    const res = (await healthGet(accessToken, `/dataTypes/daily-resting-heart-rate/dataPoints?filter=${filter}&pageSize=5`)) as {
      dataPoints?: Array<{
        dailyRestingHeartRate?: { beatsPerMinute?: number };
        dataSource?: { platform?: string; device?: { displayName?: string } };
      }>;
    };
    for (const dp of res.dataPoints ?? []) {
      const bpm = dp.dailyRestingHeartRate?.beatsPerMinute;
      if (bpm != null && (restingHr === null || bpm < restingHr)) restingHr = Math.round(bpm);
      const platform = dp.dataSource?.platform;
      const device = dp.dataSource?.device?.displayName;
      if (platform) sourceSet.add(platform);
      if (device) sourceSet.add(device);
    }
  } catch { /* no resting HR */ }

  // HRV — daily-heart-rate-variability (RMSSD in milliseconds)
  try {
    const filter = encodeURIComponent(
      `dailyHeartRateVariability.date>="${today}" AND dailyHeartRateVariability.date<="${today}"`,
    );
    const res = (await healthGet(accessToken, `/dataTypes/daily-heart-rate-variability/dataPoints?filter=${filter}&pageSize=5`)) as {
      dataPoints?: Array<{
        // Google Health API returns RMSSD milliseconds; field name inferred from API pattern
        dailyHeartRateVariability?: { averageMilliseconds?: number; milliseconds?: number };
        dataSource?: { platform?: string; device?: { displayName?: string } };
      }>;
    };
    for (const dp of res.dataPoints ?? []) {
      const ms =
        dp.dailyHeartRateVariability?.averageMilliseconds ??
        dp.dailyHeartRateVariability?.milliseconds;
      if (ms != null && (hrv === null || ms > hrv)) hrv = Math.round(ms);
      const platform = dp.dataSource?.platform;
      const device = dp.dataSource?.device?.displayName;
      if (platform) sourceSet.add(platform);
      if (device) sourceSet.add(device);
    }
  } catch { /* no HRV data */ }

  // Sleep — dailyRollUp over civil time gives total sleep for the night
  try {
    const body = { range, windowSizeDays: 1 };
    const res = (await healthPost(accessToken, '/dataTypes/sleep/dataPoints:dailyRollUp', body)) as {
      rollupDataPoints?: Array<{
        sleep?: { totalSleepSeconds?: number; durationSeconds?: number };
        dataSource?: { platform?: string; device?: { displayName?: string } };
      }>;
    };
    for (const rp of res.rollupDataPoints ?? []) {
      const secs =
        rp.sleep?.totalSleepSeconds ??
        rp.sleep?.durationSeconds;
      if (secs != null && secs > 0) {
        const h = Math.round((secs / 3600) * 10) / 10;
        if (sleepHours === null || h > sleepHours) sleepHours = h;
      }
      const platform = rp.dataSource?.platform;
      const device = rp.dataSource?.device?.displayName;
      if (platform) sourceSet.add(platform);
      if (device) sourceSet.add(device);
    }
  } catch { /* no sleep data */ }

  // Format source device labels for display (FITBIT → "Fitbit", WEAR_OS → "Wear OS")
  const formatSource = (s: string): string =>
    s === 'FITBIT' ? 'Fitbit'
    : s === 'WEAR_OS' ? 'Wear OS'
    : s;

  return {
    steps,
    restingHr,
    hrv,
    sleepHours,
    sourceDevices: [...sourceSet].map(formatSource),
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
