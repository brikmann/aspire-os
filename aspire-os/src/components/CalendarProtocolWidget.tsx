'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Phase = 'data' | 'generating' | 'protocol';

const EVENTS = [
  { time: '9:00',  label: 'Team standup',      dot: '#2C6BE0' },
  { time: '11:30', label: 'Investor call',      dot: '#8B5CF6' },
  { time: '3:00',  label: 'Deep work block',    dot: '#2EA84B' },
];

const TASKS = [
  'Ship dashboard v1',
  'Review Q2 metrics',
  'Send team update',
];

const PROTOCOL = [
  '9–11 AM · HRV nominal — peak cognitive window',
  'Pre-standup: 2 min box breathing',
  '12:30 PM · 10 min walk after lunch',
  '3 PM deep work block protected',
];

export default function CalendarProtocolWidget() {
  const [phase,         setPhase]         = useState<Phase>('data');
  const [protocolCount, setProtocolCount] = useState(0);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clr = () => { if (t.current) clearTimeout(t.current); };

  useEffect(() => {
    clr();
    if (phase === 'data') {
      t.current = setTimeout(() => setPhase('generating'), 2600);
    }
    if (phase === 'generating') {
      t.current = setTimeout(() => { setProtocolCount(0); setPhase('protocol'); }, 1350);
    }
    if (phase === 'protocol') {
      if (protocolCount < PROTOCOL.length) {
        t.current = setTimeout(() => setProtocolCount(c => c + 1), 410);
      } else {
        t.current = setTimeout(() => { setProtocolCount(0); setPhase('data'); }, 4200);
      }
    }
    return clr;
  }, [phase, protocolCount]);

  return (
    <div className="rounded-3xl border border-midnight-edge bg-midnight overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.55)] flex flex-col h-full">

      {/* Chrome */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-midnight-edge bg-midnight-deep shrink-0">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        <span className="flex-1 mx-2 h-6 rounded-md bg-midnight-edge/60 text-[11px] font-mono text-silver-dim flex items-center px-3">
          aspireos.co/dashboard
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-5 flex flex-col min-h-[200px]">
        <AnimatePresence mode="wait">

          {/* ── Data view: calendar + tasks side by side ── */}
          {phase === 'data' && (
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="flex gap-3 flex-1"
            >
              {/* Calendar column */}
              <div className="flex-1 min-w-0">
                <p className="font-sans text-[9px] font-bold uppercase tracking-[1.5px] text-cobalt mb-3">
                  Calendar
                </p>
                <div className="space-y-2">
                  {EVENTS.map(ev => (
                    <div key={ev.label} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-silver-muted shrink-0 w-7">{ev.time}</span>
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: ev.dot }}
                      />
                      <span className="font-sans text-[11px] text-silver truncate">{ev.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px bg-midnight-edge self-stretch shrink-0" />

              {/* Tasks column */}
              <div className="flex-1 min-w-0">
                <p className="font-sans text-[9px] font-bold uppercase tracking-[1.5px] text-silver-muted mb-3">
                  Tasks
                </p>
                <div className="space-y-2">
                  {TASKS.map(task => (
                    <div key={task} className="flex items-start gap-2">
                      <span className="mt-[3px] w-[11px] h-[11px] rounded border border-midnight-edge shrink-0" />
                      <span className="font-sans text-[11px] text-silver leading-tight">{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Generating ── */}
          {phase === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center gap-3"
            >
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="animate-typing-dot w-1.5 h-1.5 rounded-full bg-cobalt-soft"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="font-sans text-[12px] text-silver-muted">Generating Cadence…</p>
            </motion.div>
          )}

          {/* ── Protocol revealed ── */}
          {phase === 'protocol' && (
            <motion.div
              key="protocol"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col gap-3"
            >
              <p className="font-sans text-[9px] font-bold uppercase tracking-[1.5px] text-cobalt">
                Daily Protocol · Generated
              </p>
              <div className="space-y-2.5">
                {PROTOCOL.slice(0, protocolCount).map((item) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="flex items-start gap-2"
                  >
                    <svg className="mt-[2px] shrink-0" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <circle cx="6" cy="6" r="5" stroke="#2C6BE0" strokeWidth="1" />
                      <path d="M3.5 6l1.8 1.8 3-3" stroke="#2C6BE0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-sans text-[12px] leading-[1.5] text-silver">{item}</span>
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
