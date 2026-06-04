'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Phase = 'idle' | 'connecting' | 'connected';

const METRICS = [
  { label: 'Steps',      value: '8,240',   bar: 0.72 },
  { label: 'Sleep',      value: '7.4 hrs', bar: 0.65 },
  { label: 'HRV',        value: '62 ms',   bar: 0.58 },
  { label: 'Resting HR', value: '58 bpm',  bar: 0.52 },
];

export default function WearableConnectWidget() {
  const [phase,       setPhase]       = useState<Phase>('idle');
  const [metricCount, setMetricCount] = useState(0);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clr = () => { if (t.current) clearTimeout(t.current); };

  useEffect(() => {
    clr();
    if (phase === 'idle') {
      t.current = setTimeout(() => setPhase('connecting'), 2200);
    }
    if (phase === 'connecting') {
      t.current = setTimeout(() => { setMetricCount(0); setPhase('connected'); }, 1500);
    }
    if (phase === 'connected') {
      if (metricCount < METRICS.length) {
        t.current = setTimeout(() => setMetricCount(c => c + 1), 390);
      } else {
        t.current = setTimeout(() => { setMetricCount(0); setPhase('idle'); }, 4200);
      }
    }
    return clr;
  }, [phase, metricCount]);

  return (
    <div className="rounded-3xl border border-midnight-edge bg-midnight overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.55)] flex flex-col h-full">

      {/* Chrome */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-midnight-edge bg-midnight-deep shrink-0">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        <span className="flex-1 mx-2 h-6 rounded-md bg-midnight-edge/60 text-[11px] font-mono text-silver-dim flex items-center px-3">
          aspireos.co/dashboard/connect
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-6 flex flex-col justify-center min-h-[200px]">
        <AnimatePresence mode="wait">

          {/* ── Idle: connect prompt ── */}
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-midnight-light border border-midnight-edge flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M9 1.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z" stroke="#C7CCD3" strokeWidth="1.2" />
                    <path d="M6 9h6M9 6v6" stroke="#2C6BE0" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="font-sans font-semibold text-[13px] text-silver-bright">Google Health</p>
                  <p className="font-sans text-[11px] text-silver-muted mt-0.5">Fitbit · Pixel Watch · Wear OS</p>
                </div>
              </div>

              <button
                type="button"
                className="w-full h-10 rounded-xl bg-cobalt text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(44,107,224,0.35)]"
              >
                Authorize Google Health
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </motion.div>
          )}

          {/* ── Connecting: spinner ── */}
          {phase === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4 py-2"
            >
              <div className="w-11 h-11 rounded-full border-2 border-cobalt/25 border-t-cobalt animate-spin" />
              <p className="font-sans text-[12px] text-silver-muted">Authorizing with Google Health…</p>
            </motion.div>
          )}

          {/* ── Connected: metrics stream in ── */}
          {phase === 'connected' && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <circle cx="7" cy="7" r="6" stroke="#2C6BE0" strokeWidth="1.2" />
                    <path d="M4.5 7l2 2 3-3" stroke="#2C6BE0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-sans font-semibold text-[13px] text-silver-bright">Google Health</span>
                </div>
                <span className="font-sans text-[10px] font-bold uppercase tracking-[1px] text-cobalt-soft">Connected</span>
              </div>

              <div className="space-y-3">
                {METRICS.slice(0, metricCount).map((m) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="flex items-center gap-2.5"
                  >
                    <span className="font-sans text-[11px] text-silver-muted w-[68px] shrink-0">{m.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-midnight-edge overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-cobalt"
                        initial={{ width: 0 }}
                        animate={{ width: `${m.bar * 100}%` }}
                        transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="font-sans text-[12px] font-semibold text-silver-bright w-[54px] text-right shrink-0">
                      {m.value}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
