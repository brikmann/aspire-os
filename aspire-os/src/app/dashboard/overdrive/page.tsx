'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { CadenceOutput } from '@/lib/cadence-schema';

// ── Types ──────────────────────────────────────────────────────────────────

type ProtocolItem = CadenceOutput['protocol'][number];

type OverclockState =
  | { kind: 'idle' }
  | { kind: 'generating'; items: ProtocolItem[] }
  | { kind: 'complete'; cadence: CadenceOutput }
  | { kind: 'error'; message: string };

// ── Streaming helpers ──────────────────────────────────────────────────────

function extractCompleteObjects(text: string): unknown[] {
  const items: unknown[] = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && ' \n\r\t,'.includes(text[i])) i++;
    if (i >= text.length || text[i] !== '{') break;
    const start = i;
    let depth = 0, inStr = false, esc = false;
    while (i < text.length) {
      const ch = text[i];
      if (esc) { esc = false; }
      else if (ch === '\\' && inStr) { esc = true; }
      else if (ch === '"') { inStr = !inStr; }
      else if (!inStr) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            try { items.push(JSON.parse(text.slice(start, i + 1))); } catch { /* skip */ }
            i++; break;
          }
        }
      }
      i++;
    }
    if (depth > 0) break;
  }
  return items;
}

function extractStreamingProtocol(accumulated: string): ProtocolItem[] {
  const match = accumulated.match(/"protocol"\s*:\s*\[/);
  if (!match || match.index === undefined) return [];
  return extractCompleteObjects(accumulated.slice(match.index + match[0].length)) as ProtocolItem[];
}

// ── Icons ──────────────────────────────────────────────────────────────────

function FlameIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.748A3 3 0 1 1 9.5 2z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.748A3 3 0 1 0 14.5 2z" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

// ── Design constants ───────────────────────────────────────────────────────

const INPUT_BASE =
  'w-full bg-midnight border border-midnight-edge text-silver-bright rounded-lg px-3 py-2.5 text-sm ' +
  'placeholder:text-silver-muted focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-cobalt ' +
  'transition-colors';

const CATEGORY_EMOJI: Record<string, string> = {
  work: '💻', recovery: '🌱', meeting: '🗓', meal: '🍽', sleep: '😴',
};

// ── Sub-components ─────────────────────────────────────────────────────────

function ProtocolCard({ item, index }: { item: ProtocolItem; index: number }) {
  const [timeNum, timePeriod] = item.time.split(' ');
  const emoji = CATEGORY_EMOJI[item.category] ?? '·';
  return (
    <div
      className="flex bg-midnight-light/30 rounded-xl p-4 border border-midnight-edge/50 animate-answer"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="w-16 flex-shrink-0 pt-0.5">
        <p className="font-mono text-lg font-semibold text-cobalt-soft leading-none">{timeNum}</p>
        <p className="font-mono text-xs text-cobalt-soft/60 mt-0.5">{timePeriod}</p>
      </div>
      <div className="flex-1 pl-4 border-l border-midnight-edge">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base text-silver-bright font-medium leading-snug flex-1">
            {item.action}
            {item.duration_min != null && (
              <span className="text-silver-muted font-normal"> ({item.duration_min} min)</span>
            )}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
            {item.is_from_calendar && (
              <span className="text-[10px] uppercase tracking-wider text-cobalt-soft">Cal</span>
            )}
            <span className="text-base leading-none">{emoji}</span>
          </div>
        </div>
        <p className="text-sm text-silver leading-relaxed mt-1">{item.rationale}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex bg-midnight-light/30 rounded-xl p-4 border border-midnight-edge/50 animate-pulse">
      <div className="w-16 flex-shrink-0">
        <div className="h-5 bg-midnight-edge/60 rounded w-10 mb-1" />
        <div className="h-3 bg-midnight-edge/40 rounded w-6" />
      </div>
      <div className="flex-1 pl-4 border-l border-midnight-edge space-y-2">
        <div className="h-4 bg-midnight-edge/60 rounded w-2/3" />
        <div className="h-3 bg-midnight-edge/40 rounded w-full" />
      </div>
    </div>
  );
}

function ComingSoonCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-midnight-light/20 rounded-2xl p-5 border border-midnight-edge/50 opacity-60 select-none">
      <div className="flex items-start gap-3">
        <div className="text-silver-dim mt-0.5 flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-medium text-silver">{title}</p>
            <span className="text-[10px] font-medium uppercase tracking-[1.2px] px-1.5 py-0.5 rounded bg-cobalt/10 text-cobalt-soft">
              Coming soon
            </span>
          </div>
          <p className="text-sm text-silver-muted leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function OverdrivePage() {

  // ── Overclock ────────────────────────────────────────────────────────
  const [overclock, setOverclock] = useState<OverclockState>({ kind: 'idle' });
  const resultRef = useRef<HTMLDivElement>(null);

  // ── Notify ───────────────────────────────────────────────────────────
  const [notifyEmail, setNotifyEmail]   = useState('');
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // ── Scroll result into view on generation start ───────────────────────
  useEffect(() => {
    if (overclock.kind !== 'idle') {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, [overclock.kind]);

  // ── Streaming ─────────────────────────────────────────────────────────
  const activateOverclock = useCallback(async () => {
    setOverclock({ kind: 'generating', items: [] });

    try {
      const res = await fetch('/api/cadence/overclock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ window: 'the full day' }),
      });
      if (!res.ok || !res.body) {
        throw new Error((await res.text().catch(() => '')) || 'Request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let complete = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        if (!complete) {
          try {
            const parsed = JSON.parse(accumulated) as CadenceOutput;
            setOverclock({ kind: 'complete', cadence: parsed });
            complete = true;
          } catch {
            const items = extractStreamingProtocol(accumulated);
            if (items.length > 0) {
              setOverclock(prev =>
                prev.kind === 'generating' ? { ...prev, items } : prev
              );
            }
          }
        }
      }

      if (!complete) {
        try {
          const parsed = JSON.parse(accumulated) as CadenceOutput;
          setOverclock({ kind: 'complete', cadence: parsed });
        } catch {
          throw new Error('Response was not valid JSON — please retry.');
        }
      }
    } catch (err) {
      setOverclock({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong.',
      });
    }
  }, []);

  // ── Notify submit ─────────────────────────────────────────────────────
  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!notifyEmail.includes('@')) return;
    setNotifyStatus('sending');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notifyEmail }),
      });
      setNotifyStatus(res.ok ? 'sent' : 'error');
    } catch {
      setNotifyStatus('error');
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────
  const displayProtocol: ProtocolItem[] =
    overclock.kind === 'complete'
      ? overclock.cadence.protocol
      : overclock.kind === 'generating'
        ? overclock.items
        : [];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-midnight">
      <div className="max-w-[680px] mx-auto px-4 sm:px-6">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="py-12 sm:py-16">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-silver-muted hover:text-silver transition-colors mb-8"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Dashboard
          </Link>

          <p className="text-xs font-medium uppercase tracking-[1.5px] text-cobalt mb-3">
            OVERDRIVE TIER PREVIEW
          </p>
          <h1 className="font-serif text-[32px] sm:text-[40px] font-normal text-silver-bright leading-tight mb-4">
            The full synthesis layer
          </h1>
          <p className="text-base text-silver leading-relaxed max-w-[520px]">
            Connect every wearable. Push to every task system. Cadence remembers your patterns. Plus Overclock Mode for high-stakes days.
          </p>
        </header>

        {/* ── Overclock Mode ───────────────────────────────────────────── */}
        <section className="border-t border-midnight-edge py-8 sm:py-10">
          <button
            type="button"
            onClick={activateOverclock}
            disabled={overclock.kind === 'generating'}
            className="w-full py-5 rounded-2xl bg-cobalt hover:bg-cobalt-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 group focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 focus:ring-offset-midnight"
          >
            {overclock.kind === 'generating' ? (
              <>
                <SpinnerIcon />
                <span className="text-[17px] font-medium text-white">Generating…</span>
              </>
            ) : (
              <>
                <FlameIcon size={22} className="text-white/80 group-hover:text-white transition-colors" />
                <span className="text-[17px] font-medium text-white">Overclock My Day</span>
              </>
            )}
          </button>
          <p className="text-xs text-silver-dim text-center mt-3">
            5 activations per month on Overdrive · 10 on Quantum
          </p>

          {/* ── Result ───────────────────────────────────────────────── */}
          {overclock.kind !== 'idle' && (
            <div ref={resultRef} className="mt-10">
              <div className="flex items-center gap-2 mb-5">
                <FlameIcon size={15} className="text-cobalt-soft" />
                <p className="text-[11px] font-medium uppercase tracking-[1.5px] text-cobalt-soft">
                  OVERCLOCKED CADENCE
                </p>
              </div>

              {overclock.kind === 'complete' && (
                <div className="bg-midnight-light/40 rounded-xl p-4 border border-cobalt/20 mb-5 animate-answer">
                  <p className="text-sm font-medium text-silver-bright">
                    {overclock.cadence.verdict.headline}
                  </p>
                  <p className="text-xs text-silver-muted mt-1">
                    {overclock.cadence.verdict.summary}
                  </p>
                </div>
              )}

              {overclock.kind === 'generating' && overclock.items.length === 0 && (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>
              )}

              {displayProtocol.length > 0 && (
                <div className="space-y-3">
                  {displayProtocol.map((item, i) => (
                    <ProtocolCard key={i} item={item} index={i} />
                  ))}
                </div>
              )}

              {overclock.kind === 'complete' && overclock.cadence.protect && (
                <div className="mt-5 bg-midnight-light/40 rounded-xl p-4 border border-midnight-edge/50 animate-answer">
                  <p className="text-[10px] uppercase tracking-wider text-cobalt-soft font-medium mb-2">
                    Protect tomorrow
                  </p>
                  <p className="text-sm text-silver leading-relaxed">
                    {overclock.cadence.protect.tomorrow}
                  </p>
                </div>
              )}

              {overclock.kind === 'error' && (
                <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4">
                  <p className="text-sm text-red-300">{overclock.message}</p>
                  <button
                    type="button"
                    onClick={() => setOverclock({ kind: 'idle' })}
                    className="mt-2 text-xs text-silver-muted hover:text-silver transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Coming Soon cards ─────────────────────────────────────────── */}
        <section className="border-t border-midnight-edge py-8 sm:py-12">
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-cobalt mb-6">
            OVERDRIVE TIER
          </p>
          <div className="space-y-3">
            <ComingSoonCard
              icon={<LayersIcon />}
              title="Multi-wearable synthesis"
              description="Connect Apple Health, Whoop, Oura, and CGM simultaneously — one unified signal."
            />
            <ComingSoonCard
              icon={<BrainIcon />}
              title="Cadence with multi-session memory"
              description="Cadence remembers your patterns across days and adjusts protocols accordingly."
            />
            <ComingSoonCard
              icon={<TrendingIcon />}
              title="30-day longitudinal trends"
              description="See HRV, sleep, and energy patterns over time — not just today."
            />
          </div>
        </section>

        {/* ── Notification CTA ──────────────────────────────────────────── */}
        <section className="border-t border-midnight-edge py-8 sm:py-12">
          <h2 className="font-serif text-2xl font-normal text-silver-bright mb-2">
            Be notified when Overdrive launches
          </h2>
          <p className="text-sm text-silver-muted mb-6">First access goes to the waitlist.</p>

          {notifyStatus === 'sent' ? (
            <p className="text-sm text-silver animate-answer">
              Got you — we&apos;ll reach out when Overdrive opens.
            </p>
          ) : (
            <>
              <form onSubmit={handleNotify} className="flex gap-3 flex-col sm:flex-row">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={notifyEmail}
                  onChange={e => setNotifyEmail(e.target.value)}
                  disabled={notifyStatus === 'sending'}
                  className={`${INPUT_BASE} sm:flex-1`}
                />
                <button
                  type="submit"
                  disabled={notifyStatus === 'sending'}
                  className="px-5 py-2.5 bg-cobalt text-white text-sm font-medium rounded-lg hover:bg-cobalt-dark transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {notifyStatus === 'sending' ? 'Sending…' : 'Get notified'}
                </button>
              </form>
              {notifyStatus === 'error' && (
                <p className="text-xs text-red-400 mt-2">Something went wrong — please try again.</p>
              )}
            </>
          )}
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="border-t border-midnight-edge py-8 text-center">
          <a
            href="/privacy"
            className="font-sans text-[12px] text-silver-dim hover:text-silver-muted transition-colors"
          >
            Privacy Policy
          </a>
        </footer>

      </div>
    </main>
  );
}
