"use client";

import { useState, useRef, useEffect } from "react";

type UseCase = {
  time: string;
  pillars: string;
  quote: string;
  answer: string;
};

export default function UseCaseScroll({ useCases }: { useCases: UseCase[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const setActiveRef = useRef(setActiveIndex);
  setActiveRef.current = setActiveIndex;

  useEffect(() => {
    const observers = cardRefs.current.map((ref, i) => {
      if (!ref) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveRef.current(i);
        },
        { threshold: 0.5 }
      );
      observer.observe(ref);
      return observer;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  const active = useCases[activeIndex];

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-16 items-start">

      {/* Left: question cards */}
      <div className="w-full md:w-[45%] flex flex-col gap-4">
        {useCases.map((uc, i) => (
          <div
            key={i}
            ref={(el) => { cardRefs.current[i] = el; }}
            className={`bg-paper-warm rounded-2xl p-6 border transition-colors duration-300 ${
              i === activeIndex ? "border-cobalt" : "border-paper-edge"
            }`}
          >
            <p className="font-sans font-medium text-[11px] uppercase tracking-[1px] text-cobalt mb-3">
              {uc.time} · {uc.pillars}
            </p>
            <p className="font-serif italic text-[18px] leading-[1.55] text-ink">
              &ldquo;{uc.quote}&rdquo;
            </p>
          </div>
        ))}
      </div>

      {/* Right: sticky answer panel — desktop only */}
      <div className="hidden md:block md:w-[55%] sticky top-[50vh] -translate-y-1/2">
        <div key={activeIndex} className="animate-answer">
          <p className="font-sans font-medium text-[11px] uppercase tracking-[1px] text-cobalt mb-3">
            {active.time} · {active.pillars}
          </p>
          <p className="font-serif italic text-[22px] leading-[1.5] text-ink mb-5">
            &ldquo;{active.quote}&rdquo;
          </p>
          <p className="font-sans font-normal text-[17px] leading-[1.8] text-ink-soft">
            {active.answer}
          </p>
        </div>
      </div>

      {/* Mobile: answers inline below each card */}
      <div className="md:hidden w-full flex flex-col gap-4">
        {useCases.map((uc, i) => (
          <div key={i} className="px-2">
            <p className="font-sans font-normal text-[16px] leading-[1.75] text-ink-soft">
              {uc.answer}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
