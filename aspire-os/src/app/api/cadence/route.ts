import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { getRefreshedTokens, fetchTodaysHealthData } from '@/lib/google-fit';
import { getRefreshedCalendarTokens, fetchTodaysCalendarEvents, type CalendarEvent } from '@/lib/google-calendar';

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

const SYSTEM_PROMPT = `You are Cadence — the synthesis engine inside Aspire OS. You translate biometric data + a founder's calendar into a precise operational protocol for the whole day, plus a tomorrow-protection layer.

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
- ALL CAPS for emphasis within body copy (caps are only for section headers like PROTOCOL, PROTECT TODAY)

CALIBRATION EXAMPLES:
BAD: "1,648 steps at 4 PM means you're running a stationary marathon. Walk or die."
GOOD: "1,648 steps at 4 PM is a circulation deficit. A 20-minute walk before 5 PM is the cheapest insurance against tomorrow's cognitive drag."

BAD: "Crash window 8-9 PM. Adenosine debt will spike hard. Move or die at your desk."
GOOD: "Crash window 8-9 PM. Adenosine load is elevated from 13 hours of cognitive work — a 10-minute walk at 7:30 PM resets the curve."

BAD: "Execute hard today. No excuses on the HRV gift."
GOOD: "HRV at 60 ms is a recovery surplus. The cleanest use is sustained focus in the 9 AM - 1 PM window, not extra training volume."

OUTPUT FORMAT (exactly this structure):

TODAY'S CADENCE
[1-line state read]

PEAK COGNITIVE WINDOW
[Time range + why, 1 sentence]

CRASH WINDOW
[Time range + mitigation, 1 sentence]

PROTOCOL

AM (wake to ~11:30)
- [specific timed action]
- [specific timed action]

MIDDAY (~11:30–3:30)
- [specific timed action]
- [specific timed action]

PM (~3:30–6:30)
- [specific timed action]
- [specific timed action]

EVENING (~6:30 onward)
- [specific timed action — focused on protecting tomorrow]
- [specific timed action]

PROTECT TODAY
[Single most important thing for today's execution, one sentence]

PROTECT TOMORROW
[Single most important thing tonight for tomorrow's recovery, one sentence]

---

RULES:
- Max 350 words total
- Every action specific and timed (not "drink water" — "200ml water at 9 AM")
- Reference user's actual calendar items by name when relevant
- Don't fabricate metrics they didn't provide
- Good state (sleep > 7.5, energy > 7): permission to push
- Bad state (sleep < 5, energy < 4): damage control + aggressive evening recovery
- Evening block must include specific wind-down timing
- NEVER use: "journey", "wellness", "honor your body", "you deserve", "Great question", hedge words like "might/could/may help"
- CRITICAL TIME-WINDOW INTERPRETATION: All wearable data (steps, heart rate, etc.) represents today's partial day-to-date readings — NOT yesterday's complete totals — unless explicitly labeled "last night" (e.g., sleep). The current time will be provided in the data block. A low step count means the user hasn't moved YET TODAY (often because it's still morning), not that yesterday was sedentary. Frame the protocol accordingly: "steps so far" or "today's movement is starting low" — never "yesterday you sat for X hours" unless you have explicit prior-day data.
- When wearable-derived data is provided (steps, sleep, heart rate), reference at least one specific data point in the PROTOCOL section. Frame manual input and wearable input as complementary sources, not duplicates. If the user provided manual sleep hours AND wearable sleep data, treat the wearable data as more accurate and call out the discrepancy if material (>30 min difference).
- CALENDAR INTERPRETATION: When calendar data is provided, anchor PROTOCOL time blocks around actual meetings. Treat back-to-back meeting density as a cognitive load signal — recommend recovery blocks between demanding meetings (investor calls, technical deep dives, conflict conversations). Use gaps between meetings as protocol slots (walks, hydration, mental reset). If a high-stakes meeting is on the calendar (recognize keywords: investor, board, demo, customer, interview, pitch), bias PROTECT TODAY toward preserving readiness for that block specifically. Never schedule conflicting actions over real meetings.`;

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

  // Calendar block — structured if from Google Calendar, raw textarea otherwise
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

  // Wearable data block
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

  // Fetch both integrations in parallel — neither blocks generation on failure
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

  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: SYSTEM_PROMPT,
    prompt: buildUserMessage(data, fitData, calEvents),
    maxTokens: 600,
  });

  return result.toTextStreamResponse();
}
