import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { cadenceSchema, type CadenceOutput } from '@/lib/cadence-schema';
import { getRefreshedCalendarTokens, fetchTodaysCalendarEvents, type CalendarEvent } from '@/lib/google-calendar';
import { getRefreshedOutlookTokens, fetchTodaysOutlookEvents } from '@/lib/outlook-calendar';
import { getRefreshedGoogleHealthTokens, fetchTodaysGoogleHealthData, type HealthData } from '@/lib/google-health';

const inputSchema = z.object({
  window: z.string().min(1),
  existingCadence: z.unknown().optional(),
});

const BASE_SYSTEM = `You are Cadence — the synthesis engine inside Aspire OS. You translate biometric data + a founder's calendar into a structured operational protocol.

Generate a structured Cadence protocol matching the schema. The protocol array should contain time-ordered items from the current time through bedtime. Cap at 12 items max — prioritize density over coverage.

VOICE & REGISTER:
You write operational directives. Not lectures. Precision means specificity of action, not depth of explanation.

REQUIRED:
- Action first: what to do and when. The rationale follows — briefly.
- Rationale fields: plain English, max 12 words, no jargon. State the consequence, not the mechanism.
- Use specific times and numbers throughout.

FORBIDDEN:
- Physiology jargon in rationale fields: no adenosine, cortisol, HRV mechanisms, circadian phase, glycogen
- Multi-sentence rationale
- Military or combat metaphors ("battle," "war," "die," "crush," "destroy")
- Hustle-culture phrasing ("grind," "no excuses," "embrace the suck," "earn it")
- Exclamation points
- Hedge words: "might," "could," "may help," "journey," "wellness," "honor your body"

RULES:
- Every protocol item must have a specific time — no vague ranges
- Don't fabricate metrics they didn't provide
- Set is_from_calendar=false for protocol items you generate; set is_from_calendar=true only for items that correspond to a named calendar event in the input.
- NEVER use: "journey", "wellness", "honor your body", "you deserve"`;

function buildSystemPrompt(win: string): string {
  return `${BASE_SYSTEM}

USER HAS ACTIVATED OVERCLOCK MODE for "${win}". Restructure the day around this single high-stakes window.
PRE-WINDOW (2-4 hours before): aggressive readiness prep — caffeine timing locked, glucose loading, mobility primer, no context switching.
DURING WINDOW: protected. No recovery interruptions, no eating, no transitions.
POST-WINDOW: mandatory recovery cascade — light cap, early dinner, hard bedtime, no caffeine.
TOMORROW: auto-tagged recovery day, intensity capped, training volume zero.
PROTECT TOMORROW emphasis: this Overclock has cost. Tomorrow non-negotiable recovery.`;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function buildPrompt(
  win: string,
  existing: CadenceOutput | null | undefined,
  health: HealthData | null,
  cal: CalendarEvent[] | null,
): string {
  const lines: string[] = [`OVERCLOCK MODE ACTIVATED`, `High-stakes window: "${win}"`, ''];

  if (existing) {
    lines.push('BASE CADENCE (restructure around the overclock window):');
    lines.push(`Verdict: ${existing.verdict.headline} — ${existing.verdict.summary}`);
    lines.push('');
    lines.push(`Peak: ${existing.windows.peak.start} – ${existing.windows.peak.end}`);
    lines.push(`Crash: ${existing.windows.crash.start} – ${existing.windows.crash.end}`);
    lines.push('');
    lines.push('Current protocol:');
    for (const item of existing.protocol) {
      const dur = item.duration_min != null ? ` (${item.duration_min} min)` : '';
      lines.push(`- ${item.time}: ${item.action}${dur} [${item.category}]`);
    }
    lines.push('');
    lines.push(`Protect today: ${existing.protect.today}`);
    lines.push(`Protect tomorrow: ${existing.protect.tomorrow}`);
  } else {
    lines.push('No existing cadence. Generate a fresh Overclock protocol structured entirely around the high-stakes window.');
  }

  if (cal && cal.length > 0) {
    lines.push('');
    lines.push('CALENDAR (Google Calendar, today):');
    for (const ev of cal) {
      lines.push(`- ${ev.start} - ${ev.end}: ${ev.summary} (${ev.duration_min} min)`);
    }
  }

  if (health && (health.steps !== null || health.sleepHours !== null || health.restingHr !== null || health.hrv !== null)) {
    lines.push('');
    lines.push(`WEARABLE DATA (Google Health, as of ${fmt(health.fetchedAt)}):`);
    if (health.steps !== null) lines.push(`- Steps today: ${health.steps.toLocaleString()}`);
    if (health.sleepHours !== null) lines.push(`- Sleep last night: ${health.sleepHours}h`);
    if (health.restingHr !== null) lines.push(`- Resting HR: ${health.restingHr} bpm`);
    if (health.hrv !== null) lines.push(`- HRV (RMSSD): ${health.hrv} ms`);
  }

  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  let data: z.infer<typeof inputSchema>;
  try {
    const body = await req.json();
    data = inputSchema.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid input.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = (data.existingCadence ?? null) as CadenceOutput | null;
  const sessionId = req.cookies.get('cadence_session')?.value;

  const [health, googleCal, outlookCal] = await Promise.all([
    (async (): Promise<HealthData | null> => {
      if (!sessionId) return null;
      try {
        const t = await getRefreshedGoogleHealthTokens(sessionId);
        if (!t.ok) return null;
        return await fetchTodaysGoogleHealthData(t.token);
      } catch { return null; }
    })(),
    (async (): Promise<CalendarEvent[] | null> => {
      if (!sessionId) return null;
      try {
        const t = await getRefreshedCalendarTokens(sessionId);
        if (!t.ok) return null;
        return await fetchTodaysCalendarEvents(t.token);
      } catch { return null; }
    })(),
    (async (): Promise<CalendarEvent[] | null> => {
      if (!sessionId) return null;
      try {
        const t = await getRefreshedOutlookTokens(sessionId);
        if (!t.ok) return null;
        return await fetchTodaysOutlookEvents(t.token);
      } catch { return null; }
    })(),
  ]);

  const cal = [...(googleCal ?? []), ...(outlookCal ?? [])];

  const result = streamObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: cadenceSchema,
    system: buildSystemPrompt(data.window),
    prompt: buildPrompt(data.window, existing, health, cal.length ? cal : null),
  });

  return result.toTextStreamResponse();
}
