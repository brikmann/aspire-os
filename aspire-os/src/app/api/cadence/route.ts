import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { getRefreshedCalendarTokens, fetchTodaysCalendarEvents, type CalendarEvent } from '@/lib/google-calendar';
import { getRefreshedGoogleHealthTokens, fetchTodaysGoogleHealthData, type HealthData } from '@/lib/google-health';
import { cadenceSchema } from '@/lib/cadence-schema';

export { cadenceSchema };

const inputSchema = z.object({
  wearable: z.string(),
  hrv: z.number().optional(),
  restingHr: z.number().optional(),
  sleepHours: z.number(),
  morningEnergy: z.number(),
  priorities: z.string(),
  calendar: z.string(),
});

const SYSTEM_PROMPT = `You are Cadence — the synthesis engine inside Aspire OS. You translate biometric data + a founder's calendar into a structured operational protocol.

Generate a structured Cadence protocol matching the schema. Each field has constraints in its description — follow them exactly. The protocol array should contain time-ordered items from the current time through bedtime. Cap at 12 items max — prioritize density over coverage.

VOICE & REGISTER:
You write operational directives. Not lectures. Precision means specificity of action, not depth of explanation.

REQUIRED:
- Action first: what to do and when. The rationale follows — briefly.
- Rationale fields: plain English, max 12 words, no jargon. State the consequence, not the mechanism.
- Use specific times and numbers throughout.
- Calibrate depth to state: good state (sleep > 7.5, energy > 7) → push harder in work blocks; bad state (sleep < 5, energy < 4) → damage control, protect recovery windows.

FORBIDDEN:
- Physiology jargon in rationale fields: no adenosine, cortisol, HRV mechanisms, circadian phase, glycogen — use plain-English equivalents if anything at all
- Multi-sentence rationale
- Military or combat metaphors ("battle," "war," "die," "crush," "destroy")
- Hustle-culture phrasing ("grind," "no excuses," "embrace the suck," "earn it")
- Exclamation points
- ALL CAPS for emphasis within action or rationale fields
- Hedge words: "might," "could," "may help," "journey," "wellness," "honor your body"

CALIBRATION EXAMPLES:
BAD rationale: "Adenosine load is elevated from 13 hours of cognitive work — a 10-minute walk resets the curve."
GOOD rationale: "You've been sitting 4 hours. Move before focus drops."

BAD rationale: "1,648 steps at 4 PM is a circulation deficit — walk cuts tomorrow's cognitive drag."
GOOD rationale: "Step count is low. 20-minute walk before dinner."

BAD verdict summary: "HRV suppression indicates elevated sympathetic load and suboptimal recovery."
GOOD verdict summary: "Recovery is partial. Push work blocks, protect the evening."

RULES:
- Every protocol item must have a specific time — no vague ranges
- Don't fabricate metrics they didn't provide
- If wearable sleep data and manual input differ by more than 30 minutes, note it once in verdict.summary only — not in protocol rationale
- NEVER use: "journey", "wellness", "honor your body", "you deserve"
- CRITICAL TIME-WINDOW INTERPRETATION: All wearable data (steps, heart rate, etc.) represents today's partial day-to-date readings — NOT yesterday's complete totals — unless explicitly labeled "last night" (e.g., sleep). A low step count means the user hasn't moved YET TODAY. Set is_from_calendar=false for protocol items you generate; set is_from_calendar=true only for items that directly correspond to a named calendar event in the input.
- CALENDAR INTERPRETATION: When calendar data is provided, anchor protocol items around actual meetings (set is_from_calendar=true for those items). Treat back-to-back meeting density as a cognitive load signal — insert recovery items in gaps. If a high-stakes meeting is present (keywords: investor, board, demo, customer, interview, pitch), bias protect.today toward preserving readiness for that block. Never schedule conflicting protocol items over real meetings.`;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function buildUserMessage(
  data: z.infer<typeof inputSchema>,
  healthData: HealthData | null,
  calEvents: CalendarEvent[] | null,
  calLabel: string,
): string {
  const lines: string[] = ['MORNING BIOMETRICS'];
  lines.push(`- Wearable: ${data.wearable}`);
  if (data.hrv != null) lines.push(`- HRV: ${data.hrv} ms`);
  if (data.restingHr != null) lines.push(`- Resting HR: ${data.restingHr} bpm`);
  lines.push(`- Sleep: ${data.sleepHours}h`);
  lines.push(`- Morning energy: ${data.morningEnergy}/10`);

  lines.push('');
  lines.push("TODAY'S PRIORITIES");
  lines.push(data.priorities);

  if (calEvents && calEvents.length > 0) {
    lines.push('');
    lines.push(`CALENDAR (${calLabel}, today):`);
    for (const ev of calEvents) {
      lines.push(`- ${ev.start} - ${ev.end}: ${ev.summary} (${ev.duration_min} min)`);
    }
    if (data.calendar.trim()) {
      lines.push('');
      lines.push('ADDITIONAL CONTEXT (user-provided):');
      lines.push(data.calendar);
    }
  } else {
    lines.push('');
    lines.push("TODAY'S CALENDAR");
    lines.push(data.calendar);
  }

  if (healthData && (healthData.steps !== null || healthData.sleepHours !== null || healthData.restingHr !== null || healthData.hrv !== null)) {
    const fetchedTime = formatTime(healthData.fetchedAt);
    lines.push('');
    lines.push(`WEARABLE DATA (Google Health, today as of ${fetchedTime}):`);
    if (healthData.steps !== null) lines.push(`- Steps so far today: ${healthData.steps.toLocaleString()}`);
    if (healthData.sleepHours !== null) {
      const mins = Math.round(healthData.sleepHours * 60);
      lines.push(`- Sleep last night: ${healthData.sleepHours}h (${mins}min)`);
    }
    if (healthData.restingHr !== null) lines.push(`- Resting HR: ${healthData.restingHr} bpm`);
    if (healthData.hrv !== null) lines.push(`- HRV (RMSSD): ${healthData.hrv} ms`);
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

  const sessionId = req.cookies.get('cadence_session')?.value;

  const [healthData, calEvents] = await Promise.all([
    (async (): Promise<HealthData | null> => {
      if (!sessionId) return null;
      try {
        const t = await getRefreshedGoogleHealthTokens(sessionId);
        if (!t.ok) return null;
        return await fetchTodaysGoogleHealthData(t.token);
      } catch {
        return null;
      }
    })(),
    (async (): Promise<CalendarEvent[] | null> => {
      if (!sessionId) return null;
      try {
        const t = await getRefreshedCalendarTokens(sessionId);
        if (!t.ok) return null;
        return await fetchTodaysCalendarEvents(t.token);
      } catch {
        return null;
      }
    })(),
  ]);

  const calLabel = 'Google Calendar';

  const result = streamObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: cadenceSchema,
    system: SYSTEM_PROMPT,
    prompt: buildUserMessage(data, healthData, calEvents.length ? calEvents : null, calLabel),
  });

  return result.toTextStreamResponse();
}
