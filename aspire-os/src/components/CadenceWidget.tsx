'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import { type CadenceOutput } from '@/lib/cadence-schema';

// ── Types ─────────────────────────────────────────────────────────────────

type FormState = {
  wearable: string;
  hrv: string;
  restingHr: string;
  sleepHours: string;
  morningEnergy: string;
  priorities: string;
  calendar: string;
};

export type HealthStatus = 'loading' | 'disconnected' | 'connected' | 'reconnect-needed';
export type CalStatus   = 'loading' | 'disconnected' | 'connected' | 'reconnect-needed';

export type HealthData = {
  steps: number | null;
  restingHr: number | null;
  hrv: number | null;
  sleepHours: number | null;
  sourceDevices: string[];
};

export type CalendarEvent = {
  start: string;
  end: string;
  summary: string;
  location?: string;
  duration_min: number;
};

type ProtocolItem = CadenceOutput['protocol'][number];

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  healthStatus: HealthStatus;
  healthData: HealthData | null;
  calStatus: CalStatus;
  calEvents: CalendarEvent[];
  onCadenceGenerated: (cadence: CadenceOutput) => void;
  autoTrigger: boolean;
  completedTasks?: Set<number>;
  onTaskToggle?: (index: number, done: boolean) => void;
};

// ── JSON streaming helpers ─────────────────────────────────────────────────

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

// ── Animation variants ─────────────────────────────────────────────────────

const cardGrid: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardEntry: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 380, damping: 28, mass: 0.8 },
  },
};

// ── "Now" helper — finds the index of the currently active protocol slot ────

function parseTimeMinutes(time: string): number {
  const m = time.match(/(\d+):?(\d*)\s*(AM|PM)/i);
  if (!m) return -1;
  let h = parseInt(m[1]);
  const min = parseInt(m[2] || '0');
  const p = m[3].toUpperCase();
  if (p === 'PM' && h !== 12) h += 12;
  if (p === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function getNowIndex(protocol: ProtocolItem[]): number {
  if (!protocol.length) return -1;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  let idx = -1;
  for (let i = 0; i < protocol.length; i++) {
    const t = parseTimeMinutes(protocol[i].time);
    if (t !== -1 && t <= cur) idx = i;
    else if (t > cur) break;
  }
  return idx;
}

// ── Cloud sync helpers ─────────────────────────────────────────────────────

function saveProtocolToCloud(cadence: CadenceOutput) {
  fetch('/api/cadence/today', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cadence }),
  }).catch(() => {});
}

// ── Cache helpers ──────────────────────────────────────────────────────────

function todayKey() {
  return `cadence-${new Date().toISOString().slice(0, 10)}`;
}

function loadCache(key: string): { cadence: CadenceOutput; time: string } | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { cadence: CadenceOutput; time: string }) : null;
  } catch { return null; }
}

function saveCache(key: string, cadence: CadenceOutput, time: string) {
  try { localStorage.setItem(key, JSON.stringify({ cadence, time })); } catch { /* quota */ }
}

// ── UI constants ───────────────────────────────────────────────────────────

const INPUT_BASE =
  'w-full bg-midnight border border-midnight-edge text-silver-bright rounded-lg px-3 py-2 text-sm ' +
  'placeholder:text-silver-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:border-cobalt ' +
  'transition-colors';
const LABEL_BASE = 'block text-xs font-medium text-silver-muted uppercase tracking-wide mb-2';
const CARD_BASE = 'bg-midnight-light/40 rounded-2xl p-6 border border-midnight-edge/70';
const EYEBROW = 'text-xs font-medium uppercase tracking-[1.5px] text-cobalt-soft mb-4';

const CATEGORY_EMOJI: Record<string, string> = {
  work: '💻', recovery: '🌱', meeting: '🗓', meal: '🍽', sleep: '😴',
};

// ── Sub-components ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-6 bg-midnight-edge/60 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-midnight-edge/40 rounded animate-pulse w-full" />
      <div className="h-4 bg-midnight-edge/40 rounded animate-pulse w-5/6" />
    </div>
  );
}

function SkeletonProtocolCard() {
  return (
    <div className="flex bg-midnight-light/30 rounded-2xl p-4 border border-midnight-edge/50 animate-pulse">
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

function WearableBadge() {
  return (
    <span className="inline-flex items-center gap-1 ml-2 text-xs font-medium text-cobalt-soft normal-case tracking-normal">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="M5 1.5A3.5 3.5 0 1 1 1.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M1.5 2.5V5H4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Google Health
    </span>
  );
}

function ProtocolCard({
  item, index, isNow, done, onToggle,
}: {
  item: ProtocolItem;
  index: number;
  isNow: boolean;
  done: boolean;
  onToggle: () => void;
}) {
  const [xpPop, setXpPop] = useState(false);
  const [timeNum, timePeriod] = item.time.split(' ');
  const emoji = CATEGORY_EMOJI[item.category] ?? '·';

  function handleToggle() {
    if (!done) { setXpPop(true); setTimeout(() => setXpPop(false), 1200); }
    onToggle();
  }

  return (
    <motion.div
      className={`relative flex rounded-2xl p-4 border transition-colors ${
        done
          ? 'bg-midnight-light/15 border-midnight-edge/30 opacity-60'
          : isNow
          ? 'bg-midnight-light/50 border-cobalt-soft/30'
          : 'bg-midnight-light/30 border-midnight-edge/50'
      }`}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.8, delay: index * 0.07 }}
      whileHover={{ scale: done ? 1 : 1.015, y: done ? 0 : -1, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
    >
      {/* +XP pop */}
      <AnimatePresence>
        {xpPop && (
          <motion.span
            key="xp-pop"
            className="absolute -top-2 left-6 text-xs font-bold text-cobalt pointer-events-none select-none"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -20 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            +10 XP
          </motion.span>
        )}
      </AnimatePresence>

      {/* Checkbox */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
        className="shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors mr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
        style={{ borderColor: done ? 'var(--color-cobalt)' : undefined }}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="#2C6BE0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="w-14 flex-shrink-0">
        <p className="font-mono text-base font-semibold text-cobalt-soft leading-none">{timeNum}</p>
        <p className="font-mono text-xs text-cobalt-soft/60 mt-0.5">{timePeriod}</p>
        {isNow && !done && (
          <div className="flex items-center gap-1 mt-2">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cobalt opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cobalt" />
            </span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-cobalt">Now</span>
          </div>
        )}
      </div>
      <div className="flex-1 pl-4 border-l border-midnight-edge">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-base font-medium leading-snug flex-1 ${done ? 'line-through text-silver-muted' : 'text-silver-bright'}`}>
            {item.action}
            {item.duration_min != null && (
              <span className="text-silver-muted font-normal"> ({item.duration_min} min)</span>
            )}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
            {item.is_from_calendar && (
              <span className="text-xs uppercase tracking-wider text-cobalt-soft">From Calendar</span>
            )}
            <span className="text-base leading-none">{emoji}</span>
          </div>
        </div>
        <p className="text-sm text-silver leading-relaxed mt-1 max-w-prose">{item.rationale}</p>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function CadenceWidget({
  healthStatus,
  healthData,
  calStatus,
  calEvents,
  onCadenceGenerated,
  autoTrigger,
  completedTasks = new Set(),
  onTaskToggle,
}: Props) {
  const [view, setView] = useState<'input' | 'output'>('input');

  const [form, setForm] = useState<FormState>({
    wearable: 'None', hrv: '', restingHr: '', sleepHours: '',
    morningEnergy: '', priorities: '', calendar: '',
  });

  // tracks which form fields were auto-filled by a wearable integration
  const [autoFilled, setAutoFilled] = useState<Set<keyof FormState>>(new Set());

  const [formError, setFormError] = useState('');

  const [cadence, setCadence] = useState<CadenceOutput | null>(null);
  const [streamingProtocol, setStreamingProtocol] = useState<ProtocolItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isAutoGenerated, setIsAutoGenerated] = useState(false);


  // stable ref so generate callback doesn't re-create on every onCadenceGenerated change
  const onGeneratedRef = useRef(onCadenceGenerated);
  useEffect(() => { onGeneratedRef.current = onCadenceGenerated; }, [onCadenceGenerated]);

  // prevents auto-trigger from firing more than once per mount
  const autoTriggeredRef = useRef(false);

  // Restore today's Cadence on mount — localStorage first, then cloud fallback.
  useEffect(() => {
    const key = todayKey();
    const cached = loadCache(key);
    if (cached) {
      setCadence(cached.cadence);
      setGeneratedAt(cached.time);
      setIsAutoGenerated(true);
      setView('output');
      onGeneratedRef.current(cached.cadence);
      autoTriggeredRef.current = true;
      saveProtocolToCloud(cached.cadence); // back-fill cloud if not saved yet
      return;
    }
    // No local cache — try the user's saved protocol in Supabase
    fetch('/api/cadence/today')
      .then(r => r.ok ? r.json() : null)
      .then((data: { cadence: CadenceOutput; generatedAt: string } | null) => {
        if (!data?.cadence) return;
        setCadence(data.cadence);
        setGeneratedAt(data.generatedAt);
        setIsAutoGenerated(true);
        setView('output');
        onGeneratedRef.current(data.cadence);
        saveCache(key, data.cadence, data.generatedAt); // warm local cache
        autoTriggeredRef.current = true;
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill from Google Health
  useEffect(() => {
    if (!healthData) return;
    setForm(prev => {
      const next = { ...prev };
      if (healthData.sleepHours !== null) next.sleepHours = String(healthData.sleepHours);
      if (healthData.restingHr !== null) next.restingHr = String(healthData.restingHr);
      if (healthData.hrv !== null) next.hrv = String(healthData.hrv);
      return next;
    });
    setAutoFilled(prev => {
      const n = new Set(prev);
      if (healthData.sleepHours !== null) n.add('sleepHours');
      if (healthData.restingHr !== null) n.add('restingHr');
      if (healthData.hrv !== null) n.add('hrv');
      return n;
    });
  }, [healthData]);

  // Scroll to top on output view
  useEffect(() => {
    if (view === 'output') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  // ── Streaming ─────────────────────────────────────────────────────────

  const stamp = () =>
    new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const generate = useCallback(async (input: Record<string, unknown>) => {
    setIsGenerating(true);
    setCadence(null);
    setStreamingProtocol([]);
    setGenError(null);
    setGeneratedAt(null);

    try {
      const res = await fetch('/api/cadence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
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
            setCadence(parsed);
            setStreamingProtocol([]);
            const ts = stamp();
            setGeneratedAt(ts);
            onGeneratedRef.current(parsed);
            saveCache(todayKey(), parsed, ts);
            saveProtocolToCloud(parsed);
            complete = true;
          } catch {
            const items = extractStreamingProtocol(accumulated);
            if (items.length > 0) setStreamingProtocol(items);
          }
        }
      }

      if (!complete) {
        try {
          const parsed = JSON.parse(accumulated) as CadenceOutput;
          setCadence(parsed);
          const ts = stamp();
          setGeneratedAt(ts);
          onGeneratedRef.current(parsed);
          saveCache(todayKey(), parsed, ts);
          saveProtocolToCloud(parsed);
        } catch {
          throw new Error('Response was not valid JSON — please retry.');
        }
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Auto-generate when wearable + calendar are both connected (fires once per mount)
  useEffect(() => {
    if (!autoTrigger || autoTriggeredRef.current) return;
    autoTriggeredRef.current = true;

    const key = todayKey();
    const cached = loadCache(key);
    if (cached) {
      setCadence(cached.cadence);
      setGeneratedAt(cached.time);
      setIsAutoGenerated(true);
      setView('output');
      onGeneratedRef.current(cached.cadence);
      return;
    }

    const sleep = healthData?.sleepHours ?? 7.5;
    const payload: Record<string, unknown> = {
      wearable: healthData?.sourceDevices?.[0] ?? 'Google Health',
      hrv: healthData?.hrv ?? undefined,
      restingHr: healthData?.restingHr ?? undefined,
      sleepHours: sleep,
      morningEnergy: 7,
      priorities: '',
      calendar: '',
      currentTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
    setForm(prev => ({ ...prev, sleepHours: String(sleep), morningEnergy: '7' }));
    setIsAutoGenerated(true);
    setView('output');
    generate(payload);
  }, [autoTrigger, healthData, generate]);

  // ── Handlers ──────────────────────────────────────────────────────────

  function setField(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (autoFilled.has(field)) {
        setAutoFilled(prev => { const n = new Set(prev); n.delete(field); return n; });
      }
      setForm(prev => ({ ...prev, [field]: e.target.value }));
    };
  }

  function buildPayload() {
    return {
      wearable: form.wearable || 'None',
      hrv: form.hrv ? parseFloat(form.hrv) : undefined,
      restingHr: form.restingHr ? parseFloat(form.restingHr) : undefined,
      sleepHours: parseFloat(form.sleepHours),
      morningEnergy: parseFloat(form.morningEnergy),
      priorities: form.priorities,
      calendar: form.calendar,
      currentTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.sleepHours || !form.morningEnergy) {
      setFormError('Sleep and energy are required to generate.');
      return;
    }
    setFormError('');
    setIsAutoGenerated(false);
    setView('output');
    generate(buildPayload());
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (form.sleepHours && form.morningEnergy) {
        setFormError('');
        setIsAutoGenerated(false);
        setView('output');
        generate(buildPayload());
      }
    }
  }

  function handleRetry() {
    generate(buildPayload());
  }

  function handleRegenerate() {
    try { localStorage.removeItem(todayKey()); } catch { /* ignore */ }
    const sleep = (healthData?.sleepHours ?? parseFloat(form.sleepHours) ?? null) || 7.5;
    generate({
      wearable: healthData?.sourceDevices?.[0] ?? (form.wearable || 'None'),
      hrv: healthData?.hrv ?? (form.hrv ? parseFloat(form.hrv) : undefined),
      restingHr: healthData?.restingHr ?? (form.restingHr ? parseFloat(form.restingHr) : undefined),
      sleepHours: sleep,
      morningEnergy: parseFloat(form.morningEnergy) || 7,
      priorities: form.priorities,
      calendar: form.calendar,
      currentTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    });
  }

  // ── Derived ───────────────────────────────────────────────────────────

  const calConnected = calStatus === 'connected';
  const displayProtocol: ProtocolItem[] = cadence?.protocol ?? streamingProtocol;
  const nowIndex = cadence?.protocol ? getNowIndex(cadence.protocol) : -1;
  const connectedServices = [
    healthStatus === 'connected' ? 'Google Health' : null,
    calStatus === 'connected' ? 'Google Calendar' : null,
  ].filter(Boolean).join(' · ');

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── INPUT VIEW ─────────────────────────────────────────────────── */}
      {view === 'input' && (
        <div className="bg-midnight-light/30 border border-midnight-edge rounded-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="wearable" className={LABEL_BASE}>Wearable</label>
                <div className="relative">
                  <select
                    id="wearable"
                    value={form.wearable}
                    onChange={setField('wearable')}
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
                  {autoFilled.has('hrv')
                    ? <WearableBadge />
                    : <span className="normal-case tracking-normal text-silver-dim"> optional</span>
                  }
                </label>
                <input
                  id="hrv"
                  type="number"
                  min="0"
                  max="300"
                  placeholder="65"
                  value={form.hrv}
                  onChange={setField('hrv')}
                  className={`${INPUT_BASE} ${autoFilled.has('hrv') ? 'border-cobalt/40' : ''}`}
                />
              </div>

              <div>
                <label htmlFor="restingHr" className={LABEL_BASE}>
                  Resting HR
                  {autoFilled.has('restingHr')
                    ? <WearableBadge />
                    : <span className="normal-case tracking-normal text-silver-dim"> optional</span>
                  }
                </label>
                <input
                  id="restingHr"
                  type="number"
                  min="30"
                  max="120"
                  placeholder="55"
                  value={form.restingHr}
                  onChange={setField('restingHr')}
                  className={`${INPUT_BASE} ${autoFilled.has('restingHr') ? 'border-cobalt/40' : ''}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sleepHours" className={LABEL_BASE}>
                  Sleep hours
                  {autoFilled.has('sleepHours') && <WearableBadge />}
                </label>
                <input
                  id="sleepHours"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  placeholder="7.5"
                  value={form.sleepHours}
                  onChange={setField('sleepHours')}
                  required
                  className={`${INPUT_BASE} ${autoFilled.has('sleepHours') ? 'border-cobalt/40' : ''}`}
                />
              </div>

              <div>
                <label htmlFor="morningEnergy" className={LABEL_BASE}>Morning energy (1–10)</label>
                <input
                  id="morningEnergy"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="7"
                  value={form.morningEnergy}
                  onChange={setField('morningEnergy')}
                  required
                  className={INPUT_BASE}
                />
              </div>
            </div>

            <div>
              <label htmlFor="priorities" className={LABEL_BASE}>Today&apos;s priorities</label>
              <textarea
                id="priorities"
                rows={3}
                placeholder={`1. Ship onboarding flow v2\n2. Prep Series A deck for Thursday call\n3. 1:1 with lead engineer at 3 PM`}
                value={form.priorities}
                onChange={setField('priorities')}
                className={`${INPUT_BASE} resize-none`}
              />
            </div>

            <div>
              {calConnected && calEvents.length > 0 ? (
                <>
                  <p className={LABEL_BASE}>Today&apos;s calendar <span className="text-cobalt-soft normal-case tracking-normal">(Google Calendar)</span></p>
                  <div className="bg-midnight border border-midnight-edge rounded-lg px-3 py-2 space-y-2 mb-4">
                    {calEvents.map((ev, i) => (
                      <p key={i} className="text-sm text-silver-bright leading-relaxed">
                        {ev.start} — {ev.summary}
                        <span className="text-silver-muted"> ({ev.duration_min} min)</span>
                      </p>
                    ))}
                  </div>
                  <label htmlFor="calendar" className={LABEL_BASE}>
                    Add anything else{' '}
                    <span className="normal-case tracking-normal text-silver-dim">events not on calendar, prep blocks, notes</span>
                  </label>
                  <textarea
                    id="calendar"
                    rows={3}
                    placeholder="e.g. prep block before investor call, gym at 6 PM, early dinner"
                    value={form.calendar}
                    onChange={setField('calendar')}
                    className={`${INPUT_BASE} resize-none`}
                  />
                </>
              ) : (
                <>
                  <label htmlFor="calendar" className={LABEL_BASE}>Today&apos;s calendar</label>
                  <textarea
                    id="calendar"
                    rows={6}
                    placeholder={`9:00 AM — Team standup (30 min)\n11:00 AM — Investor call with Benchmark\n1:00 PM — Lunch / no meetings\n3:00 PM — 1:1 with lead engineer\n5:00 PM — Demo prep session\n7:00 PM — Free`}
                    value={form.calendar}
                    onChange={setField('calendar')}
                    className={`${INPUT_BASE} resize-none`}
                  />
                </>
              )}
            </div>

            {formError && (
              <p className="text-sm text-error bg-error/8 rounded-lg px-3 py-2">{formError}</p>
            )}

            <motion.button
              type="submit"
              className="w-full rounded-lg py-3 px-6 text-base font-semibold text-silver-bright bg-cobalt cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-midnight transition-colors"
              whileHover={{ scale: 1.02, y: -2, backgroundColor: 'var(--color-cobalt-dark)', transition: { type: 'spring', stiffness: 500, damping: 20 } }}
              whileTap={{ scale: 0.97, y: 0 }}
            >
              Generate today&apos;s Cadence
              <kbd className="ml-3 hidden sm:inline text-[10px] text-silver-bright/50 font-mono font-normal tracking-normal">⌘↵</kbd>
            </motion.button>
          </form>
        </div>
      )}

      {/* ── OUTPUT VIEW ─────────────────────────────────────────────────── */}
      {view === 'output' && (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >

          {/* Nav bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setView('input')}
                aria-label="Edit inputs"
                className="flex items-center gap-1.5 text-sm text-cobalt-soft hover:text-cobalt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt rounded min-h-[44px] px-1"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Edit inputs
              </button>
              {isAutoGenerated && generatedAt && !isGenerating && (
                <span className="text-xs text-silver-muted">· Auto-generated at {generatedAt}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isAutoGenerated && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="text-xs font-medium text-silver-muted hover:text-silver transition-colors disabled:opacity-40 min-h-[44px] px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt rounded"
                >
                  {isGenerating ? 'Generating…' : 'Regenerate'}
                </button>
              )}
              {connectedServices && (
                <p className="text-xs text-silver-muted">{connectedServices}</p>
              )}
            </div>
          </div>

          {/* Hero cards — stagger on first render */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={cardGrid}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className={CARD_BASE}
              variants={cardEntry}
              whileHover={{ scale: 1.015, y: -2, transition: { type: 'spring', stiffness: 500, damping: 22 } }}
            >
              <p className={EYEBROW}>State</p>
              {isGenerating && !cadence?.verdict ? <CardSkeleton /> : (
                <>
                  <p className="font-serif italic text-2xl text-silver-bright mb-2 leading-snug">{cadence?.verdict?.headline}</p>
                  <p className="text-sm text-silver leading-relaxed max-w-prose">{cadence?.verdict?.summary}</p>
                </>
              )}
            </motion.div>
            <motion.div
              className={CARD_BASE}
              variants={cardEntry}
              whileHover={{ scale: 1.015, y: -2, transition: { type: 'spring', stiffness: 500, damping: 22 } }}
            >
              <p className={EYEBROW}>Peak Window</p>
              {isGenerating && !cadence?.windows?.peak?.start ? <CardSkeleton /> : (
                <>
                  <p className="font-serif italic text-2xl text-silver-bright mb-2 leading-snug">
                    {cadence?.windows?.peak?.start} — {cadence?.windows?.peak?.end}
                  </p>
                  <p className="text-sm text-silver leading-relaxed max-w-prose">{cadence?.windows?.peak?.rationale}</p>
                </>
              )}
            </motion.div>
            <motion.div
              className={CARD_BASE}
              variants={cardEntry}
              whileHover={{ scale: 1.015, y: -2, transition: { type: 'spring', stiffness: 500, damping: 22 } }}
            >
              <p className={EYEBROW}>Crash Window</p>
              {isGenerating && !cadence?.windows?.crash?.start ? <CardSkeleton /> : (
                <>
                  <p className="font-serif italic text-2xl text-silver-bright mb-2 leading-snug">
                    {cadence?.windows?.crash?.start} — {cadence?.windows?.crash?.end}
                  </p>
                  <p className="text-sm text-silver leading-relaxed max-w-prose">{cadence?.windows?.crash?.rationale}</p>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* Protocol timeline */}
          <div>
            <p className={EYEBROW}>Protocol</p>
            <div className="space-y-3" aria-live="polite" aria-label="Daily protocol">
              {displayProtocol.map((item, i) => (
                <ProtocolCard
                  key={`${item.time}-${i}`}
                  item={item}
                  index={i}
                  isNow={i === nowIndex}
                  done={completedTasks.has(i)}
                  onToggle={() => onTaskToggle?.(i, !completedTasks.has(i))}
                />
              ))}
              {isGenerating && displayProtocol.length === 0 && (
                <>{[0, 1, 2].map(i => <SkeletonProtocolCard key={i} />)}</>
              )}
              {isGenerating && displayProtocol.length > 0 && <SkeletonProtocolCard />}
            </div>
          </div>

          {/* Protect cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div className="bg-midnight-light/50 rounded-2xl p-6 border-l-4 border-cobalt" whileHover={{ scale: 1.015, y: -2, transition: { type: 'spring', stiffness: 500, damping: 22 } }}>
              <p className={`${EYEBROW} text-cobalt`}>Protect Today</p>
              {isGenerating && !cadence?.protect?.today ? <CardSkeleton /> : (
                <p className="font-serif text-base italic text-silver-bright leading-relaxed">
                  {cadence?.protect?.today}
                </p>
              )}
            </motion.div>
            <motion.div className="bg-midnight-light/50 rounded-2xl p-6 border-l-4 border-cobalt-soft" whileHover={{ scale: 1.015, y: -2, transition: { type: 'spring', stiffness: 500, damping: 22 } }}>
              <p className={`${EYEBROW} text-cobalt-soft`}>Protect Tomorrow</p>
              {isGenerating && !cadence?.protect?.tomorrow ? <CardSkeleton /> : (
                <p className="font-serif text-base italic text-silver-bright leading-relaxed">
                  {cadence?.protect?.tomorrow}
                </p>
              )}
            </motion.div>
          </div>


          {/* Timestamp (manual submits only) + error */}
          {generatedAt && !isGenerating && !isAutoGenerated && (
            <p className="text-xs text-silver-muted text-center pt-1">Generated at {generatedAt}</p>
          )}
          {genError && (
            <div className="bg-error/8 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-sm text-error">{genError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="text-xs font-semibold text-cobalt hover:text-cobalt-soft transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt rounded"
              >
                Try again →
              </button>
            </div>
          )}

        </motion.div>
      )}
    </>
  );
}
