import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { getRefreshedTokens, fetchTodaysHealthData } from '@/lib/google-fit';

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

You speak like a senior performance analyst, NOT a wellness coach. Output is operational. Think Bloomberg Terminal for human physiology.

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
- When wearable-derived data is provided (steps, sleep, heart rate), reference at least one specific data point in the PROTOCOL section. Frame manual input and wearable input as complementary sources, not duplicates. If the user provided manual sleep hours AND wearable sleep data, treat the wearable data as more accurate and call out the discrepancy if material (>30 min difference).`;

function buildUserMessage(data: z.infer<typeof inputSchema>, fitData?: FitData | null): string {
  const lines: string[] = ['MORNING BIOMETRICS'];
  lines.push(`- Wearable: ${data.wearable}`);
  if (data.hrv != null) lines.push(`- HRV: ${data.hrv} ms`);
  if (data.restingHr != null) lines.push(`- Resting HR: ${data.restingHr} bpm`);
  lines.push(`- Sleep: ${data.sleepHours}h`);
  lines.push(`- Morning energy: ${data.morningEnergy}/10`);
  lines.push('');
  lines.push("TODAY'S PRIORITIES");
  lines.push(data.priorities);
  lines.push('');
  lines.push("TODAY'S CALENDAR");
  lines.push(data.calendar);

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

  // Opportunistically fetch Google Fit data — never blocks Cadence generation
  let fitData: FitData | null = null;
  try {
    const sessionId = req.cookies.get('cadence_session')?.value;
    if (sessionId) {
      const tokenResult = await getRefreshedTokens(sessionId);
      if (tokenResult.ok) {
        fitData = await fetchTodaysHealthData(tokenResult.token);
      }
    }
  } catch {
    // Google Fit unavailable — proceed with manual data only
  }

  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: SYSTEM_PROMPT,
    prompt: buildUserMessage(data, fitData),
    maxTokens: 600,
  });

  return result.toTextStreamResponse();
}
