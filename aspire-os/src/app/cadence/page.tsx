'use client';

import { useState, useRef, useEffect } from 'react';

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

type FitData = {
  sleepHours: number | null;
  restingHr: number | null;
  steps: number | null;
};

const INPUT_BASE =
  'w-full bg-midnight border border-midnight-edge text-silver-bright rounded-lg px-3 py-2.5 text-sm ' +
  'placeholder:text-silver-muted focus:outline-none focus:ring-2 focus:ring-cobalt focus:border-cobalt ' +
  'transition-colors';

const LABEL_BASE = 'block text-xs font-medium text-silver-muted uppercase tracking-wide mb-1.5';

function ProtocolLine({ line }: { line: string }) {
  const trimmed = line.trim();

  if (trimmed === '---') {
    return <div className="border-t border-midnight-edge my-3" />;
  }

  const isHeader =
    trimmed.length > 1 &&
    trimmed === trimmed.toUpperCase() &&
    /^[A-Z][A-Z\s''·\-–\/0-9()~:]+$/.test(trimmed);

  if (isHeader) {
    return (
      <p className="text-cobalt text-[13px] font-semibold tracking-wider uppercase mt-5 mb-1 first:mt-0">
        {line}
      </p>
    );
  }
  if (trimmed.startsWith('-')) {
    return <p className="text-silver-bright text-[14px] leading-relaxed pl-1">{line}</p>;
  }
  if (trimmed === '') {
    return <div className="h-1" />;
  }
  return <p className="text-silver text-[14px] leading-relaxed">{line}</p>;
}

// Small sync badge shown on auto-filled fields
function FitBadge() {
  return (
    <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-medium text-cobalt-soft normal-case tracking-normal">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path
          d="M5 1.5A3.5 3.5 0 1 1 1.5 5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path d="M1.5 2.5V5H4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Google Fit
    </span>
  );
}

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
  // tracks which fields were auto-populated from Google Fit
  const [fitFilled, setFitFilled] = useState<Set<keyof FormState>>(new Set());

  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectError, setConnectError] = useState('');
  const responseRef = useRef<HTMLDivElement>(null);

  // On mount: handle ?connected / ?error params and fetch Fit data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('connected')) {
      window.history.replaceState({}, '', '/cadence');
    }
    if (params.get('error') === 'auth_failed') {
      window.history.replaceState({}, '', '/cadence');
      setConnectError('Google authorisation failed — please try again.');
      setFitStatus('disconnected');
      return;
    }
    fetchFitData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && response) {
      responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading]);

  async function fetchFitData() {
    setFitStatus('loading');
    try {
      const res = await fetch('/api/auth/google-fit/data');
      const json = await res.json();

      if (!json.connected) {
        setFitStatus(json.reconnectNeeded ? 'reconnect-needed' : 'disconnected');
        return;
      }

      setFitStatus('connected');
      const data: FitData = {
        sleepHours: json.sleepHours ?? null,
        restingHr: json.restingHr ?? null,
        steps: json.steps ?? null,
      };
      setFitData(data);

      // Auto-populate fields that have data
      const filled = new Set<keyof FormState>();
      setForm((prev) => {
        const next = { ...prev };
        if (data.sleepHours !== null) {
          next.sleepHours = String(data.sleepHours);
          filled.add('sleepHours');
        }
        if (data.restingHr !== null) {
          next.restingHr = String(data.restingHr);
          filled.add('restingHr');
        }
        return next;
      });
      setFitFilled(filled);
    } catch {
      setFitStatus('disconnected');
    }
  }

  async function handleDisconnect() {
    await fetch('/api/auth/google-fit/disconnect', { method: 'POST' });
    setFitStatus('disconnected');
    setFitData(null);
    setFitFilled(new Set());
    setForm((prev) => ({ ...prev, sleepHours: '', restingHr: '' }));
  }

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      // User edited a Fit-filled field — remove the badge
      if (fitFilled.has(field)) {
        setFitFilled((prev) => {
          const next = new Set(prev);
          next.delete(field);
          return next;
        });
      }
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.sleepHours || !form.morningEnergy) {
      setError('Sleep hours and morning energy are required.');
      return;
    }

    setLoading(true);
    setResponse('');
    setError('');

    try {
      const res = await fetch('/api/cadence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wearable: form.wearable || 'None',
          hrv: form.hrv ? parseFloat(form.hrv) : undefined,
          restingHr: form.restingHr ? parseFloat(form.restingHr) : undefined,
          sleepHours: parseFloat(form.sleepHours),
          morningEnergy: parseFloat(form.morningEnergy),
          priorities: form.priorities,
          calendar: form.calendar,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error((await res.text().catch(() => '')) || 'Request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setResponse(text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // ── Google Fit banner/CTA ──────────────────────────────────────────────
  function FitBanner() {
    if (fitStatus === 'loading') {
      return (
        <div className="flex items-center gap-2 text-xs text-silver-muted mb-5 animate-pulse">
          <span className="w-3 h-3 rounded-full bg-midnight-edge" />
          Checking Google Fit…
        </div>
      );
    }

    if (fitStatus === 'reconnect-needed') {
      return (
        <div className="flex items-center justify-between mb-5 bg-midnight-edge/40 rounded-xl px-4 py-3">
          <span className="text-sm text-silver-muted">Google Fit token expired</span>
          <a
            href="/api/auth/google-fit"
            className="text-xs font-semibold text-cobalt hover:text-cobalt-soft transition-colors"
          >
            Reconnect Google Fit →
          </a>
        </div>
      );
    }

    if (fitStatus === 'connected') {
      const parts = [];
      if (fitData?.steps != null) parts.push(`${fitData.steps.toLocaleString()} steps`);
      return (
        <div className="flex items-center justify-between mb-5 bg-cobalt/10 border border-cobalt/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="6" stroke="#2C6BE0" strokeWidth="1.5" />
              <path d="M4.5 7l2 2 3-3" stroke="#2C6BE0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-silver-bright font-medium">Google Fit connected</span>
            {parts.length > 0 && (
              <span className="text-silver-muted">· {parts.join(' · ')}</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-xs text-silver-muted hover:text-silver transition-colors"
          >
            Disconnect
          </button>
        </div>
      );
    }

    // disconnected
    return (
      <div className="mb-5">
        {connectError && (
          <p className="text-xs text-red-400 mb-3">{connectError}</p>
        )}
        <a
          href="/api/auth/google-fit"
          className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-5 bg-cobalt/15 border border-cobalt/30 text-cobalt text-[14px] font-semibold hover:bg-cobalt/20 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5A6.5 6.5 0 1 0 14.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M14.5 2.5V8H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Connect Google Fit for auto-fill
        </a>
        <p className="text-center text-xs text-silver-dim mt-2">
          or fill in manually below ↓
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-midnight">
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-16">

        {/* Header */}
        <header className="mb-10">
          <p className="font-sans font-medium text-[22px] text-silver-bright mb-6">
            ASPIRE OS
          </p>
          <p className="font-sans font-medium text-[12px] uppercase tracking-[1.5px] text-cobalt mb-3">
            CADENCE · alpha
          </p>
          <h1 className="font-sans font-semibold text-[28px] sm:text-[38px] text-silver-bright leading-[1.15] tracking-[-0.5px] sm:tracking-[-1px] mb-4">
            Today&apos;s protocol — from your biometrics and your calendar
          </h1>
          <p className="font-sans font-normal text-[17px] text-silver-muted">
            30 seconds in. Operational protocol out. No accounts, no storage.
          </p>
        </header>

        {/* Form card */}
        <div className="bg-midnight-light rounded-2xl p-6 sm:p-8">
          <FitBanner />

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Row 1: Wearable, HRV, Resting HR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="wearable" className={LABEL_BASE}>Wearable</label>
                <div className="relative">
                  <select
                    id="wearable"
                    value={form.wearable}
                    onChange={set('wearable')}
                    className={`${INPUT_BASE} appearance-none pr-8 cursor-pointer`}
                  >
                    <option value="Whoop">Whoop</option>
                    <option value="Oura">Oura</option>
                    <option value="Apple Watch">Apple Watch</option>
                    <option value="Garmin">Garmin</option>
                    <option value="Other">Other</option>
                    <option value="None">None</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-silver-muted"
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                  >
                    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <div>
                <label htmlFor="hrv" className={LABEL_BASE}>
                  HRV (ms){' '}
                  <span className="normal-case tracking-normal text-silver-dim">optional</span>
                </label>
                <input
                  id="hrv"
                  type="number"
                  min="0"
                  max="300"
                  placeholder="65"
                  value={form.hrv}
                  onChange={set('hrv')}
                  className={INPUT_BASE}
                />
              </div>

              <div>
                <label htmlFor="restingHr" className={LABEL_BASE}>
                  Resting HR
                  {fitFilled.has('restingHr') ? <FitBadge /> : (
                    <span className="normal-case tracking-normal text-silver-dim"> optional</span>
                  )}
                </label>
                <input
                  id="restingHr"
                  type="number"
                  min="30"
                  max="120"
                  placeholder="55"
                  value={form.restingHr}
                  onChange={set('restingHr')}
                  className={`${INPUT_BASE} ${fitFilled.has('restingHr') ? 'border-cobalt/40' : ''}`}
                />
              </div>
            </div>

            {/* Sleep + Energy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sleepHours" className={LABEL_BASE}>
                  Sleep hours
                  {fitFilled.has('sleepHours') && <FitBadge />}
                </label>
                <input
                  id="sleepHours"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  placeholder="7.5"
                  value={form.sleepHours}
                  onChange={set('sleepHours')}
                  required
                  className={`${INPUT_BASE} ${fitFilled.has('sleepHours') ? 'border-cobalt/40' : ''}`}
                />
              </div>
              <div>
                <label htmlFor="morningEnergy" className={LABEL_BASE}>
                  Morning energy (1–10)
                </label>
                <input
                  id="morningEnergy"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="7"
                  value={form.morningEnergy}
                  onChange={set('morningEnergy')}
                  required
                  className={INPUT_BASE}
                />
              </div>
            </div>

            {/* Priorities */}
            <div>
              <label htmlFor="priorities" className={LABEL_BASE}>Today&apos;s priorities</label>
              <textarea
                id="priorities"
                rows={3}
                placeholder={`1. Ship onboarding flow v2\n2. Prep Series A deck for Thursday call\n3. 1:1 with lead engineer at 3 PM`}
                value={form.priorities}
                onChange={set('priorities')}
                className={`${INPUT_BASE} resize-none`}
              />
            </div>

            {/* Calendar */}
            <div>
              <label htmlFor="calendar" className={LABEL_BASE}>Today&apos;s calendar</label>
              <textarea
                id="calendar"
                rows={6}
                placeholder={`9:00 AM — Team standup (30 min)\n11:00 AM — Investor call with Benchmark\n1:00 PM — Lunch / no meetings\n3:00 PM — 1:1 with lead engineer\n5:00 PM — Demo prep session\n7:00 PM — Free`}
                value={form.calendar}
                onChange={set('calendar')}
                className={`${INPUT_BASE} resize-none`}
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-lg py-3 px-6 text-[15px] font-semibold text-silver-bright transition-all
                ${loading
                  ? 'bg-cobalt-soft animate-pulse cursor-not-allowed'
                  : 'bg-cobalt hover:bg-cobalt-soft active:scale-[0.99] cursor-pointer'
                }`}
            >
              {loading ? 'Computing protocol…' : "Generate today's Cadence →"}
            </button>
          </form>
        </div>

        {/* Response card */}
        {response && (
          <div ref={responseRef} className="bg-midnight-light rounded-2xl p-6 sm:p-8 mt-6">
            <div className="space-y-0">
              {response.split('\n').map((line, i) => (
                <ProtocolLine key={i} line={line} />
              ))}
            </div>
          </div>
        )}

        <footer className="mt-12 text-center">
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
