'use client';

import { useState, useEffect, useRef } from 'react';

const DEMOS = [
  {
    question: "I can't fall asleep and I have a launch in 8 hours. What do I do right now?",
    answer:
      "Your cortisol is spiking from anticipation — completely normal before a high-stakes morning. Right now: box breathing, 8 cycles (4 in, hold, 4 out, hold). Phone face-down across the room — blue light at this hour delays melatonin by 90 minutes. Four hours of quality sleep beats six hours of anxious half-sleep.",
    pillar: "SLEEP",
  },
  {
    question: "I haven't been outside in three days. Is my circadian rhythm actually broken?",
    answer:
      "Not broken — but running without its anchor. Sunlight before 10 a.m. sets the cortisol awakening response, the hormonal signal that determines your energy, mood, and sleep pressure for the entire day. Three days without it and serotonin drops noticeably. Ten minutes outside right now (no sunglasses) is enough to reset it.",
    pillar: "SUNLIGHT",
  },
  {
    question: "Why does my focus crash at 2pm today and what can I do about it?",
    answer:
      "The 2 p.m. crash is a circadian trough amplified by a glucose correction after lunch. Your brain uses 20% of your calories — the spike-and-drop hits cognitive output harder than physical performance. A 10-minute walk right now cuts the remaining spike by ~30%. Longer fix: anchor lunch around protein and fat, keep starchy carbs smaller.",
    pillar: "SATIATE",
  },
  {
    question: "My HRV has been dropping for three days straight. Should I train hard today or rest?",
    answer:
      "Rest. When HRV drops more than 10% below baseline for three straight days, adaptation has stalled — you're absorbing less from each session, not more. Pushing harder compounds the deficit. Cut intensity to 60%, prioritize 8+ hours tonight. One recovery day costs you one day; ignoring this costs you a week.",
    pillar: "SERENITY",
  },
  {
    question: "I crashed hard after demo day. How do I get back without losing a week?",
    answer:
      "Your nervous system ran at maximum output for weeks — the crash is cortisol normalizing. It's not a problem; it's the bill arriving. Protect sleep for the next two nights above everything else. Avoid alcohol (it fragments REM), keep movement light, block high-stakes decisions for 48 hours. You'll recover faster than you expect.",
    pillar: "SERENITY",
  },
];

const CHAR_DELAY_Q = 42;
const CHAR_DELAY_A = 18;
const THINKING_MS  = 950;
const PAUSE_MS     = 3200;

type Phase = 'typing-q' | 'thinking' | 'typing-a' | 'pause';

export default function CadenceDemo() {
  const [idx,    setIdx]    = useState(0);
  const [phase,  setPhase]  = useState<Phase>('typing-q');
  const [dispQ,  setDispQ]  = useState('');
  const [dispA,  setDispA]  = useState('');
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charPos = useRef(0);

  const clear = () => { if (timer.current) clearTimeout(timer.current); };

  useEffect(() => {
    const demo = DEMOS[idx];
    clear();

    if (phase === 'typing-q') {
      charPos.current = 0;
      setDispQ('');
      setDispA('');
      const tick = () => {
        charPos.current += 1;
        setDispQ(demo.question.slice(0, charPos.current));
        if (charPos.current < demo.question.length) {
          timer.current = setTimeout(tick, CHAR_DELAY_Q);
        } else {
          timer.current = setTimeout(() => setPhase('thinking'), 420);
        }
      };
      timer.current = setTimeout(tick, 500);
    }

    if (phase === 'thinking') {
      timer.current = setTimeout(() => setPhase('typing-a'), THINKING_MS);
    }

    if (phase === 'typing-a') {
      charPos.current = 0;
      const tick = () => {
        charPos.current += 1;
        setDispA(demo.answer.slice(0, charPos.current));
        if (charPos.current < demo.answer.length) {
          timer.current = setTimeout(tick, CHAR_DELAY_A);
        } else {
          timer.current = setTimeout(() => setPhase('pause'), 400);
        }
      };
      timer.current = setTimeout(tick, 220);
    }

    if (phase === 'pause') {
      timer.current = setTimeout(() => {
        setIdx((i) => (i + 1) % DEMOS.length);
        setPhase('typing-q');
      }, PAUSE_MS);
    }

    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  const demo = DEMOS[idx];

  return (
    <div className="rounded-3xl border border-midnight-edge bg-midnight overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.55)]">

      {/* ── Browser chrome ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-midnight-edge bg-midnight-deep">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <span className="w-3 h-3 rounded-full bg-[#28C840]" />
        <span className="flex-1 mx-2 h-6 rounded-md bg-midnight-edge/60 text-[11px] font-mono text-silver-dim flex items-center px-3">
          aspireos.co/dashboard
        </span>
        <span className="text-[11px] font-medium text-green-400 flex items-center gap-1.5 shrink-0">
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-green-400" />
          Live
        </span>
      </div>

      {/* ── Chat area ──────────────────────────────────────────────── */}
      <div className="px-6 py-7 space-y-5 min-h-[260px] md:min-h-[240px]">

        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-[78%] bg-cobalt/20 border border-cobalt/25 rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="font-sans text-[14px] md:text-[15px] leading-[1.55] text-silver-bright">
              {dispQ}
              {phase === 'typing-q' && (
                <span
                  className="inline-block w-[2px] h-[14px] bg-silver-bright ml-[2px] align-text-bottom"
                  style={{ animation: 'blink 1s step-end infinite' }}
                />
              )}
            </p>
          </div>
        </div>

        {/* Cadence response */}
        {(phase === 'thinking' || phase === 'typing-a' || phase === 'pause') && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-sans text-[10px] font-bold uppercase tracking-[1.5px] text-cobalt">
                Cadence
              </span>
              <span className="font-sans text-[10px] font-medium uppercase tracking-[1px] text-silver-muted bg-midnight-edge/80 px-2 py-0.5 rounded">
                {demo.pillar}
              </span>
            </div>
            <div className="max-w-[88%] bg-midnight-light border border-midnight-edge rounded-2xl rounded-tl-sm px-4 py-3">
              {phase === 'thinking' ? (
                <div className="flex items-center gap-1.5 py-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="animate-typing-dot w-1.5 h-1.5 rounded-full bg-silver-muted"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              ) : (
                <p className="font-sans text-[14px] md:text-[15px] leading-[1.65] text-silver">
                  {dispA}
                  {phase === 'typing-a' && (
                    <span
                      className="inline-block w-[2px] h-[14px] bg-silver ml-[2px] align-text-bottom"
                      style={{ animation: 'blink 1s step-end infinite' }}
                    />
                  )}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Input bar ──────────────────────────────────────────────── */}
      <div className="px-5 pb-4 flex items-center gap-3">
        <div className="flex-1 h-10 rounded-xl bg-midnight-light border border-midnight-edge flex items-center px-3.5">
          <span className="font-sans text-[13px] text-silver-dim">Ask Cadence anything…</span>
        </div>
        <button
          type="button"
          aria-label="Send"
          className="w-10 h-10 rounded-xl bg-cobalt hover:bg-cobalt-dark transition-colors flex items-center justify-center shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

    </div>
  );
}
