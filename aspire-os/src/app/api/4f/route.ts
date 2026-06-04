import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// ── Load static assets at module init (cached across requests) ─────────────

function loadSystemPrompt(): string {
  const path = join(process.cwd(), 'src/data/4f-system-prompt.md');
  if (existsSync(path)) return readFileSync(path, 'utf-8');
  return [
    'You are Cadence — the conversational coach within Aspire OS.',
    'You specialize in Sleep, Sun (circadian light), Satiate (nutrition/hydration), and Serenity (stress regulation).',
    "The user has just generated today's Cadence protocol — you have full context. Reference specific protocol items when relevant.",
    '3-4 sentences maximum per response. Hard cap at 70 words. Lead with the action, not the explanation.',
    'On follow-ups, anchor to what was said before — never treat a follow-up as a standalone question.',
    "If asked outside sleep/sun/satiate/serenity scope, redirect: \"That's outside my coaching scope.\"",
  ].join(' ');
}

function loadCorpus(): string {
  const corpusDir = join(process.cwd(), 'src/data/coach-corpus');
  if (!existsSync(corpusDir)) return '';
  try {
    const files = readdirSync(corpusDir).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
    if (files.length === 0) return '';
    return files
      .map(f => `## DOCUMENT: ${f}\n\n${readFileSync(join(corpusDir, f), 'utf-8')}`)
      .join('\n\n---\n\n');
  } catch (e) {
    console.warn('[4f] Corpus load failed:', e);
    return '';
  }
}

// Corpus is large and static — load once at module init.
// System prompt is read per-request so file edits hot-reload in dev.
const CORPUS = loadCorpus();

// ── Context formatter ──────────────────────────────────────────────────────

function formatCadenceContext(ctx: Record<string, unknown> | null | undefined): string {
  if (!ctx) return 'No Cadence context available yet.';
  try {
    const verdict  = ctx.verdict  as { headline?: string; summary?: string } | undefined;
    const windows  = ctx.windows  as {
      peak?:  { start?: string; end?: string; rationale?: string };
      crash?: { start?: string; end?: string; rationale?: string };
    } | undefined;
    const protocol = ctx.protocol as Array<{
      time?: string; action?: string; category?: string; rationale?: string;
    }> | undefined;
    const protect  = ctx.protect  as { today?: string; tomorrow?: string } | undefined;

    const lines: string[] = [];
    if (verdict?.headline) lines.push(`Verdict: ${verdict.headline}`);
    if (verdict?.summary)  lines.push(verdict.summary);

    if (windows?.peak) {
      lines.push('', `Peak Window: ${windows.peak.start ?? '?'} – ${windows.peak.end ?? '?'}`);
      if (windows.peak.rationale) lines.push(windows.peak.rationale);
    }
    if (windows?.crash) {
      lines.push('', `Crash Window: ${windows.crash.start ?? '?'} – ${windows.crash.end ?? '?'}`);
      if (windows.crash.rationale) lines.push(windows.crash.rationale);
    }
    if (protocol?.length) {
      lines.push('', 'Protocol:');
      for (const p of protocol) {
        lines.push(`- ${p.time ?? '?'}: ${p.action ?? '?'} (${p.category ?? '?'}) — ${p.rationale ?? ''}`);
      }
    }
    if (protect?.today)    lines.push('', `Protect Today: ${protect.today}`);
    if (protect?.tomorrow) lines.push(`Protect Tomorrow: ${protect.tomorrow}`);

    return lines.join('\n') || 'No Cadence context available yet.';
  } catch {
    return 'No Cadence context available yet.';
  }
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let messages: Array<{ role: string; content: string }> = [];
  let cadenceContext: Record<string, unknown> | null = null;

  try {
    const body = await req.json();
    messages       = Array.isArray(body.messages) ? body.messages : [];
    cadenceContext = body.cadenceContext ?? null;
  } catch (e) {
    console.error('[4f] Failed to parse request body:', e);
    return new Response('Bad request', { status: 400 });
  }

  console.log('[4F route] request:', {
    messageCount: messages.length,
    messages: messages.map(m => ({ role: m.role, contentLen: m.content?.length })),
    hasContext: !!cadenceContext,
  });

  const SYSTEM_PROMPT = loadSystemPrompt();
  const contextSummary = formatCadenceContext(cadenceContext);

  // Single concatenated string — avoids passing arrays to the SDK which
  // relies on provider-specific internal handling we can't guarantee.
  const system = [
    SYSTEM_PROMPT,
    '## TODAY\'S CADENCE CONTEXT',
    contextSummary,
    ...(CORPUS
      ? [
          '## KNOWLEDGE CORPUS',
          'Research corpus on Sleep, Sun, Satiate, Serenity.',
          'Reference specific documents by name when citing research.',
          'Do NOT make up findings outside this corpus.',
          CORPUS,
        ]
      : []),
  ].join('\n\n');

  try {
    const { textStream } = streamText({
      model: anthropic('claude-sonnet-4-5'),
      system,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
    });

    // Pipe textStream into a plain ReadableStream — guarantees raw UTF-8 text
    // chunks with no SSE framing or protocol envelope.
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err) {
          console.error('[4f] Stream error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.error('[4f] streamText error:', err);
    return new Response('Internal server error', { status: 500 });
  }
}
