import { z } from 'zod';

export const cadenceSchema = z.object({
  verdict: z.object({
    headline: z.string().describe(
      'One-line state-of-day verdict, max 10 words. Examples: ' +
      '"Elite recovery, sedentary morning" / "Mixed signals, protect the afternoon" / ' +
      '"Damage control day, minimum viable execution"'
    ),
    summary: z.string().describe(
      'One sentence explaining the verdict using the actual numbers. Max 25 words. ' +
      'Reference HRV, sleep hours, steps, energy explicitly.'
    ),
  }),
  windows: z.object({
    peak: z.object({
      start: z.string().describe('Time in 12-hour format, e.g. "9:00 AM"'),
      end: z.string().describe('Time in 12-hour format, e.g. "1:00 PM"'),
      rationale: z.string().describe(
        'One sentence on why this is the peak window, grounded in physiology ' +
        '(cortisol, glycogen, circadian phase). Max 20 words.'
      ),
    }),
    crash: z.object({
      start: z.string(),
      end: z.string(),
      rationale: z.string().describe(
        'One sentence on why this is the crash window and one mitigation. Max 20 words.'
      ),
    }),
  }),
  protocol: z.array(z.object({
    time: z.string().describe('Time in 12-hour format, e.g. "9:00 AM"'),
    duration_min: z.number().nullable().describe('Duration in minutes if applicable, null otherwise'),
    category: z.enum(['work', 'recovery', 'meeting', 'meal', 'sleep']).describe(
      'work = focused execution block; recovery = walk, breath, rest; ' +
      'meeting = calendar event; meal = food/hydration; sleep = bedtime/wind-down'
    ),
    is_from_calendar: z.boolean().describe(
      "True if this item corresponds to an event in the user's Google Calendar data, false otherwise"
    ),
    action: z.string().describe(
      'The action in 3-8 words. No prose, just the action.'
    ),
    rationale: z.string().describe(
      'One sentence on the physiological "why" for this action. Max 18 words. ' +
      'Bloomberg terminal voice — no military or hustle framing.'
    ),
  })).describe(
    'Time-ordered protocol items from now through bedtime. Between 6 and 12 items typically.'
  ),
  protect: z.object({
    today: z.string().describe(
      'The single most important thing to protect TODAY given state + schedule. ' +
      'Max 30 words. Should be specific and time-bound.'
    ),
    tomorrow: z.string().describe(
      'What to do tonight to set up tomorrow well. Max 30 words. ' +
      'Reference specific bedtime and reasoning.'
    ),
  }),
});

export type CadenceOutput = z.infer<typeof cadenceSchema>;
