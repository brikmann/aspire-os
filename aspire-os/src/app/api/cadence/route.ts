import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const inputSchema = z.object({
  wearable: z.string(),
  hrv: z.number().optional(),
  restingHr: z.number().optional(),
  sleepHours: z.number(),
  morningEnergy: z.number(),
  priorities: z.string(),
  calendar: z.string(),
});

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
- NEVER use: "journey", "wellness", "honor your body", "you deserve", "Great question", hedge words like "might/could/may help"`;

function buildUserMessage(data: z.infer<typeof inputSchema>): string {
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
  return lines.join('\n');
}

export async function POST(req: Request) {
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

  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: SYSTEM_PROMPT,
    prompt: buildUserMessage(data),
    maxTokens: 600,
  });

  return result.toTextStreamResponse();
}
