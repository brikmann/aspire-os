import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { getRefreshedTokens, fetchTodaysHealthData } from '@/lib/google-fit';
import { getRefreshedCalendarTokens, fetchTodaysCalendarEvents, type CalendarEvent } from '@/lib/google-calendar';
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

type FitData = { steps: number | null; sleepHours: number | null; restingHr: number | null; fetchedAt: string };

const SYSTEM_PROMPT = `You are Cadence — the synthesis engine inside Aspire OS. You translate biometric data + a founder's calendar into a structured operational protocol.

Generate a structured Cadence protocol matching the schema. Each field has constraints in its description — follow them exactly. The protocol array should contain time-ordered items from the current time through bedtime. Cap at 12 items max — prioritize density over coverage.

VOICE & REGISTER:
You write like a senior performance physician who is also a Bloomberg terminal. Directness comes from precision and physiological grounding, NEVER from melodrama or aggression.

REQUIRED:
- Cite physiology when relevant (adenosine, HRV, cortisol, glycogen, circadian phase)
- Use numbers and time-bound thresholds
- Frame consequences as opportunity cost, not catastrophe
- Treat the user as a capable adult making informed trade-offs

FORBIDDEN:
- Military or combat metaphors ("battle," "war," "die," "crush," "destroy," "execute," "deploy" used aggressively)
- Hustle-culture phrasing ("grind," "no excuses," "embrace the suck," "X or die," "earn it")
- Catastrophizing low-grade issues (a sedentary day is a circulation issue, not a life-or-death matter)
- Drill-sergeant imperatives ("MOVE.", "NOW.", "DO IT.")
- Macho compression ("Walk. Now.", "No excuses.", etc.)
- Exclamation points
- ALL CAPS for emphasis within action or rationale fields

CALIBRATION EXAMPLES:
BAD rationale: "1,648 steps at 4 PM means you're running a stationary marathon. Walk or die."
GOOD rationale: "1,648 steps at 4 PM is a circulation deficit — a 20-minute walk before 5 PM cuts tomorrow's cognitive drag."

BAD rationale: "Adenosine debt will spike hard. Move or die at your desk."
GOOD rationale: "Adenosine load is elevated from 13 hours of cognitive work — a 10-minute walk resets the curve."

RULES:
- Every protocol item must have a specific time — no vague ranges
- Don't fabricate metrics they didn't provide
- Good state (sleep > 7.5, energy > 7): permission to push in work blocks
- Bad state (sleep < 5, energy < 4): damage control — fewer work blocks, aggressive recovery items
- NEVER use: "journey", "wellness", "honor your body", "you deserve", hedge words like "might/could/may help"
- CRITICAL TIME-WINDOW INTERPRETATION: All wearable data (steps, heart rate, etc.) represents today's partial day-to-date readings — NOT yesterday's complete totals — unless explicitly labeled "last night" (e.g., sleep). A low step count means the user hasn't moved YET TODAY. Set is_from_calendar=false for protocol items you generate; set is_from_calendar=true only for items that directly correspond to a named calendar event in the input.
- When wearable-derived data is provided, reference at least one specific data point in a rationale field. If manual sleep hours AND wearable sleep data are both present, treat wearable as more accurate and call out the discrepancy in the verdict summary if material (>30 min).
- CALENDAR INTERPRETATION: When calendar data is provided, anchor protocol items around actual meetings (set is_from_calendar=true for those items). Treat back-to-back meeting density as a cognitive load signal — insert recovery items in gaps. If a high-stakes meeting is present (keywords: investor, board, demo, customer, interview, pitch), bias protect.today toward preserving readiness for that block. Never schedule conflicting protocol items over real meetings.`;

function buildUserMessage(
  data: z.infer<typeof inputSchema>,
  fitData: FitData | null,
  calEvents: CalendarEvent[] | null,
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
    lines.push('CALENDAR (Google Calendar, today):');
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

  if (fitData && (fitData.steps !== null || fitData.sleepHours !== null || fitData.restingHr !== null)) {
    const fetchedTime = new Date(fitData.fetchedAt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    lines.push('');
    lines.push(`WEARABLE DATA (Google Fit, today since midnight, fetched ${fetchedTime}):`);
    if (fitData.steps !== null) lines.push(`- Steps so far today: ${fitData.steps.toLocaleString()}`);
    if (fitData.sleepHours !== null) {
      const mins = Math.round(fitData.sleepHours * 60);
      lines.push(`- Sleep last night: ${fitData.sleepHours}h (${mins}min)`);
    }
    if (fitData.restingHr !== null) lines.push(`- Resting HR (today's reading): ${fitData.restingHr} bpm`);
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

  const [fitData, calEvents] = await Promise.all([
    (async (): Promise<FitData | null> => {
      if (!sessionId) return null;
      try {
        const t = await getRefreshedTokens(sessionId);
        if (!t.ok) return null;
        return await fetchTodaysHealthData(t.token);
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

  const result = streamObject({
    model: anthropic('claude-sonnet-4-5'),
    schema: cadenceSchema,
    system: SYSTEM_PROMPT,
    prompt: buildUserMessage(data, fitData, calEvents),
  });

  return result.toTextStreamResponse();
}
