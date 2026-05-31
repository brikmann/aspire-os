'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { type CadenceOutput } from '@/lib/cadence-schema';

// ── Types ──────────────────────────────────────────────────────────────────

type FormState = {
  wearable: string;
  hrv: string;
  restingHr: string;
  sleepHours: string;
  morningEnergy: string;
  priorities: string;
  calendar: string;
};

type FitStatus = 'loading' | 'disconnected' | 'connected' | 'reconnect-needed';
type CalStatus = 'loading' | 'disconnected' | 'connected' | 'reconnect-needed';

type FitData = { sleepHours: number | null; restingHr: number | null; steps: number | null };

type CalendarEvent = {
  start: string;
  end: string;
  summary: string;
  location?: string;
  duration_min: number;
};

// ── Custom streaming hook ──────────────────────────────────────────────────

function useCadenceStream() {
  const [cadence, setCadence] = useState<CadenceOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const generate = useCallback(async (input: Record<string, unknown>) => {
    setIsGenerating(true);
    setCadence(null);
    setGenError(null);

    try {
      const res = await fetch('/api/cadence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => 'Request failed');
        throw new Error(msg || 'Request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        // Attempt parse at each chunk — succeeds once JSON is complete
        try {
          const parsed = JSON.parse(accumulated) as CadenceOutput;
          setCadence(parsed);
        } catch {
          // Partial JSON — keep reading
        }
      }

      // Final guaranteed parse
      try {
        setCadence(JSON.parse(accumulated) as CadenceOutput);
      } catch {
        throw new Error('Response was not valid JSON — please retry.');
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { cadence, isGenerating, genError, generate };
}

// ── UI constants ──────────────────────────────────────────────────────────

const INPUT_BASE =
  'w-full bg-midnight border border-midnight-edge text-silver-bright rounded-lg px-3 py-2.5 text-sm ' +
  'placeholder:text-silver-muted focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-cobalt ' +
  'transition-colors';

const LABEL_BASE = 'block text-xs font-medium text-silver-muted uppercase tracking-wide mb-1.5';

const CARD_BASE = 'bg-midnight-light/50 rounded-2xl p-6 border border-midnight-edge';

const EYEBROW = 'text-xs font-medium uppercase tracking-[1.5px] text-cobalt-soft mb-3';

// ── Skeleton ──────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-6 bg-midnight-edge/60 rounded-md animate-pulse w-3/4" />
      <div className="h-4 bg-midnight-edge/40 rounded-md animate-pulse w-full" />
      <div className="h-4 bg-midnight-edge/40 rounded-md animate-pulse w-5/6" />
    </div>
  );
}

// ── Small shared components ───────────────────────────────────────────────

function FitBadge() {
  return (
    <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-medium text-cobalt-soft normal-case tracking-normal">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="M5 1.5A3.5 3.5 0 1 1 1.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M1.5 2.5V5H4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Google Fit
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="#2C6BE0" strokeWidth="1.5" />
      <path d="M4.5 7l2 2 3-3" stroke="#2C6BE0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ConnectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5A6.5 6.5 0 1 0 14.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14.5 2.5V8H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function CadencePage() {
  const [form, setForm] = useState<FormState>({
    wearable: 'None',
    hrv: '',
    restingHr: '',
    sleepHours: '',
    morningEnergy: '',
    priorities: '',
    calendar: '',
  });

  const [fitStatus, setFitStatus] = useState<FitStatus>('loading');
  const [fitData, setFitData] = useState<FitData | null>(null);
  const [fitFilled, setFitFilled] = useState<Set<keyof FormState>>(new Set());
  const [connectError, setConnectError] = useState('');

  const [calStatus, setCalStatus] = useState<CalStatus>('loading');
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [calConnectError, setCalConnectError] = useState('');

  const [formError, setFormError] = useState('');

  const { cadence, isGenerating, genError, generate } = useCadenceStream();

  const heroRef = useRef<HTMLDivElement>(null);

  // Scroll to hero cards when generation completes
  useEffect(() => {
    if (!isGenerating && cadence) {
      heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isGenerating, cadence]);

  // On mount: handle URL params + fetch both integrations in parallel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasConnected = params.has('connected');
    const hasCalConnected = params.has('calendar_connected');
    const errParam = params.get('error');

    if (hasConnected || hasCalConnected || errParam) {
      window.history.replaceState({}, '', '/cadence');
    }
    if (errParam === 'auth_failed') {
      setConnectError('Google authorisation failed — please try again.');
      setFitStatus('disconnected');
    }
    if (errParam === 'calendar_auth_failed') {
      setCalConnectError('Google Calendar authorisation failed — please try again.');
      setCalStatus('disconnected');
    }

    fetchFitData();
    fetchCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchFitData() {
    setFitStatus('loading');
    try {
      const res = await fetch('/api/auth/google-fit/data');
      const json = await res.json();
      if (!json.connected) { setFitStatus(json.reconnectNeeded ? 'reconnect-needed' : 'disconnected'); return; }
      setFitStatus('connected');
      const data: FitData = { sleepHours: json.sleepHours ?? null, restingHr: json.restingHr ?? null, steps: json.steps ?? null };
      setFitData(data);
      const filled = new Set<keyof FormState>();
      setForm((prev) => {
        const next = { ...prev };
        if (data.sleepHours !== null) { next.sleepHours = String(data.sleepHours); filled.add('sleepHours'); }
        if (data.restingHr !== null) { next.restingHr = String(data.restingHr); filled.add('restingHr'); }
        return next;
      });
      setFitFilled(filled);
    } catch { setFitStatus('disconnected'); }
  }

  async function fetchCalendarData() {
    setCalStatus('loading');
    try {
      const res = await fetch('/api/auth/google-calendar/data');
      const json = await res.json();
      if (!json.connected) { setCalStatus(json.reconnectNeeded ? 'reconnect-needed' : 'disconnected'); return; }
      setCalStatus('connected');
      setCalEvents(json.events ?? []);
    } catch { setCalStatus('disconnected'); }
  }

  async function handleFitDisconnect() {
    await fetch('/api/auth/google-fit/disconnect', { method: 'POST' });
    setFitStatus('disconnected'); setFitData(null); setFitFilled(new Set());
    setForm((prev) => ({ ...prev, sleepHours: '', restingHr: '' }));
  }

  async function handleCalDisconnect() {
    await fetch('/api/auth/google-calendar/disconnect', { method: 'POST' });
    setCalStatus('disconnected'); setCalEvents([]);
  }

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (fitFilled.has(field)) setFitFilled((prev) => { const n = new Set(prev); n.delete(field); return n; });
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.sleepHours || !form.morningEnergy) {
      setFormError('Sleep hours and morning energy are required.');
      return;
    }
    setFormError('');
    generate({
      wearable: form.wearable || 'None',
      hrv: form.hrv ? parseFloat(form.hrv) : undefined,
      restingHr: form.restingHr ? parseFloat(form.restingHr) : undefined,
      sleepHours: parseFloat(form.sleepHours),
      morningEnergy: parseFloat(form.morningEnergy),
      priorities: form.priorities,
      calendar: form.calendar,
    });
  }

  // ── Banners ────────────────────────────────────────────────────────────

  function FitBanner() {
    if (fitStatus === 'loading') return (
      <div className="flex items-center gap-2 text-xs text-silver-muted animate-pulse">
        <span className="w-3 h-3 rounded-full bg-midnight-edge" />Checking Google Fit…
      </div>
    );
    if (fitStatus === 'reconnect-needed') return (
      <div className="flex items-center justify-between bg-midnight-edge/40 rounded-xl px-4 py-3">
        <span className="text-sm text-silver-muted">Google Fit token expired</span>
        <a href="/api/auth/google-fit" className="text-xs font-semibold text-cobalt hover:text-cobalt-soft transition-colors">Reconnect →</a>
      </div>
    );
    if (fitStatus === 'connected') {
      const parts: string[] = [];
      if (fitData?.steps != null) parts.push(`${fitData.steps.toLocaleString()} steps today`);
      return (
        <div className="flex items-center justify-between bg-cobalt/10 border border-cobalt/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckIcon />
            <span className="text-silver-bright font-medium">Google Fit connected</span>
            {parts.length > 0 && <span className="text-silver-muted">· {parts.join(' · ')}</span>}
          </div>
          <button type="button" onClick={handleFitDisconnect} className="text-xs text-silver-muted hover:text-silver transition-colors">Disconnect</button>
        </div>
      );
    }
    return (
      <div>
        {connectError && <p className="text-xs text-red-400 mb-2">{connectError}</p>}
        <a href="/api/auth/google-fit" className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-5 bg-cobalt/15 border border-cobalt/30 text-cobalt text-[13px] font-semibold hover:bg-cobalt/20 transition-colors">
          <ConnectIcon />Connect Google Fit for auto-fill
        </a>
      </div>
    );
  }

  function CalBanner() {
    if (calStatus === 'loading') return (
      <div className="flex items-center gap-2 text-xs text-silver-muted animate-pulse">
        <span className="w-3 h-3 rounded-full bg-midnight-edge" />Checking Google Calendar…
      </div>
    );
    if (calStatus === 'reconnect-needed') return (
      <div className="flex items-center justify-between bg-midnight-edge/40 rounded-xl px-4 py-3">
        <span className="text-sm text-silver-muted">Google Calendar token expired</span>
        <a href="/api/auth/google-calendar" className="text-xs font-semibold text-cobalt hover:text-cobalt-soft transition-colors">Reconnect →</a>
      </div>
    );
    if (calStatus === 'connected') return (
      <div className="flex items-center justify-between bg-cobalt/10 border border-cobalt/20 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <CheckIcon />
          <span className="text-silver-bright font-medium">Google Calendar connected</span>
          <span className="text-silver-muted">· {calEvents.length} event{calEvents.length !== 1 ? 's' : ''} today</span>
        </div>
        <button type="button" onClick={handleCalDisconnect} className="text-xs text-silver-muted hover:text-silver transition-colors">Disconnect</button>
      </div>
    );
    return (
      <div>
        {calConnectError && <p className="text-xs text-red-400 mb-2">{calConnectError}</p>}
        <a href="/api/auth/google-calendar" className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 px-5 bg-cobalt/15 border border-cobalt/30 text-cobalt text-[13px] font-semibold hover:bg-cobalt/20 transition-colors">
          <ConnectIcon />Connect Google Calendar for auto-fill
        </a>
      </div>
    );
  }

  const calConnected = calStatus === 'connected';
  const showHero = isGenerating || !!cadence;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-midnight">
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-16">

        {/* Header */}
        <header className="mb-10">
          <p className="font-sans font-medium text-[22px] text-silver-bright mb-6">ASPIRE OS</p>
          <p className="font-sans font-medium text-[12px] uppercase tracking-[1.5px] text-cobalt mb-3">CADENCE · alpha</p>
          <h1 className="font-sans font-semibold text-[28px] sm:text-[38px] text-silver-bright leading-[1.15] tracking-[-0.5px] sm:tracking-[-1px] mb-4">
            Today&apos;s protocol — from your biometrics and your calendar
          </h1>
          <p className="font-sans font-normal text-[17px] text-silver-muted">
            30 seconds in. Operational protocol out. No accounts, no storage.
          </p>
        </header>

        {/* Form card */}
        <div className="bg-midnight-light rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col gap-3 mb-6">
            <FitBanner />
            <CalBanner />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Wearable · HRV · Resting HR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="wearable" className={LABEL_BASE}>Wearable</label>
                <div className="relative">
                  <select id="wearable" value={form.wearable} onChange={set('wearable')} className={`${INPUT_BASE} appearance-none pr-8 cursor-pointer`}>
                    <option value="Whoop">Whoop</option>
                    <option value="Oura">Oura</option>
                    <option value="Apple Watch">Apple Watch</option>
                    <option value="Garmin">Garmin</option>
                    <option value="Other">Other</option>
                    <option value="None">None</option>
                  </select>
                  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-silver-muted" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div>
                <label htmlFor="hrv" className={LABEL_BASE}>HRV (ms) <span className="normal-case tracking-normal text-silver-dim">optional</span></label>
                <input id="hrv" type="number" min="0" max="300" placeholder="65" value={form.hrv} onChange={set('hrv')} className={INPUT_BASE} />
              </div>
              <div>
                <label htmlFor="restingHr" className={LABEL_BASE}>
                  Resting HR{fitFilled.has('restingHr') ? <FitBadge /> : <span className="normal-case tracking-normal text-silver-dim"> optional</span>}
                </label>
                <input id="restingHr" type="number" min="30" max="120" placeholder="55" value={form.restingHr} onChange={set('restingHr')} className={`${INPUT_BASE} ${fitFilled.has('restingHr') ? 'border-cobalt/40' : ''}`} />
              </div>
            </div>

            {/* Sleep · Energy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sleepHours" className={LABEL_BASE}>Sleep hours{fitFilled.has('sleepHours') && <FitBadge />}</label>
                <input id="sleepHours" type="number" min="0" max="24" step="0.5" placeholder="7.5" value={form.sleepHours} onChange={set('sleepHours')} required className={`${INPUT_BASE} ${fitFilled.has('sleepHours') ? 'border-cobalt/40' : ''}`} />
              </div>
              <div>
                <label htmlFor="morningEnergy" className={LABEL_BASE}>Morning energy (1–10)</label>
                <input id="morningEnergy" type="number" min="1" max="10" placeholder="7" value={form.morningEnergy} onChange={set('morningEnergy')} required className={INPUT_BASE} />
              </div>
            </div>

            {/* Priorities */}
            <div>
              <label htmlFor="priorities" className={LABEL_BASE}>Today&apos;s priorities</label>
              <textarea id="priorities" rows={3} placeholder={`1. Ship onboarding flow v2\n2. Prep Series A deck for Thursday call\n3. 1:1 with lead engineer at 3 PM`} value={form.priorities} onChange={set('priorities')} className={`${INPUT_BASE} resize-none`} />
            </div>

            {/* Calendar — auto-list when connected, textarea otherwise */}
            <div>
              {calConnected && calEvents.length > 0 ? (
                <>
                  <p className={LABEL_BASE}>Today&apos;s calendar (Google Calendar)</p>
                  <div className="bg-midnight border border-midnight-edge rounded-lg px-3 py-2.5 space-y-1.5 mb-4">
                    {calEvents.map((ev, i) => (
                      <p key={i} className="text-sm text-silver-bright leading-relaxed">
                        {ev.start} — {ev.summary}<span className="text-silver-muted"> ({ev.duration_min} min)</span>
                      </p>
                    ))}
                  </div>
                  <label htmlFor="calendar" className={LABEL_BASE}>Add anything else <span className="normal-case tracking-normal text-silver-dim">events not on calendar, prep blocks, notes</span></label>
                  <textarea id="calendar" rows={3} placeholder="e.g. prep block before investor call, gym at 6 PM, early dinner" value={form.calendar} onChange={set('calendar')} className={`${INPUT_BASE} resize-none`} />
                </>
              ) : (
                <>
                  <label htmlFor="calendar" className={LABEL_BASE}>Today&apos;s calendar</label>
                  <textarea id="calendar" rows={6} placeholder={`9:00 AM — Team standup (30 min)\n11:00 AM — Investor call with Benchmark\n1:00 PM — Lunch / no meetings\n3:00 PM — 1:1 with lead engineer\n5:00 PM — Demo prep session\n7:00 PM — Free`} value={form.calendar} onChange={set('calendar')} className={`${INPUT_BASE} resize-none`} />
                </>
              )}
            </div>

            {formError && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{formError}</p>}

            <button
              type="submit"
              disabled={isGenerating}
              className={`w-full rounded-lg py-3 px-6 text-[15px] font-semibold text-silver-bright transition-all
                ${isGenerating ? 'bg-cobalt-soft animate-pulse cursor-not-allowed' : 'bg-cobalt hover:bg-cobalt-soft active:scale-[0.99] cursor-pointer'}`}
            >
              {isGenerating ? 'Computing protocol…' : "Generate today's Cadence →"}
            </button>
          </form>
        </div>

        {/* ── Hero cards ─────────────────────────────────────────────────── */}
        {showHero && (
          <div ref={heroRef} className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

              {/* STATE */}
              <div className={CARD_BASE}>
                <p className={EYEBROW}>State</p>
                {isGenerating && !cadence?.verdict ? (
                  <CardSkeleton />
                ) : (
                  <>
                    <p className="font-serif italic text-xl text-silver-bright mb-2 leading-snug">
                      {cadence?.verdict?.headline}
                    </p>
                    <p className="text-sm text-silver leading-relaxed">
                      {cadence?.verdict?.summary}
                    </p>
                  </>
                )}
              </div>

              {/* PEAK WINDOW */}
              <div className={CARD_BASE}>
                <p className={EYEBROW}>Peak Window</p>
                {isGenerating && !cadence?.windows?.peak?.start ? (
                  <CardSkeleton />
                ) : (
                  <>
                    <p className="font-mono text-2xl font-semibold text-silver-bright mb-2 tracking-tight">
                      {cadence?.windows?.peak?.start} — {cadence?.windows?.peak?.end}
                    </p>
                    <p className="text-sm text-silver leading-relaxed">
                      {cadence?.windows?.peak?.rationale}
                    </p>
                  </>
                )}
              </div>

              {/* CRASH WINDOW */}
              <div className={CARD_BASE}>
                <p className={EYEBROW}>Crash Window</p>
                {isGenerating && !cadence?.windows?.crash?.start ? (
                  <CardSkeleton />
                ) : (
                  <>
                    <p className="font-mono text-2xl font-semibold text-silver-bright mb-2 tracking-tight">
                      {cadence?.windows?.crash?.start} — {cadence?.windows?.crash?.end}
                    </p>
                    <p className="text-sm text-silver leading-relaxed">
                      {cadence?.windows?.crash?.rationale}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Phase 3 — Protocol timeline placeholder */}
            {/* Phase 4 — Protect cards placeholder */}

            {genError && (
              <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mt-4">{genError}</p>
            )}
          </div>
        )}

        <footer className="mt-12 text-center">
          <a href="/privacy" className="font-sans text-[12px] text-silver-dim hover:text-silver-muted transition-colors">
            Privacy Policy
          </a>
        </footer>

      </div>
    </main>
  );
}
