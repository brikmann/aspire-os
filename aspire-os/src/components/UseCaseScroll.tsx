"use client";

import FadeIn from "@/components/FadeIn";

type UseCase = {
  time: string;
  pillars: string;
  quote: string;
  answer: string;
};

export default function UseCaseScroll({ useCases }: { useCases: UseCase[] }) {
  return (
    <div className="flex flex-col gap-8">
      {useCases.map((uc, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-start">

          {/* Left: question card */}
          <div className="bg-paper-warm rounded-2xl p-6 border border-paper-edge">
            <p className="font-sans font-medium text-[11px] uppercase tracking-[1px] text-cobalt mb-3">
              {uc.time} · {uc.pillars}
            </p>
            <p className="font-serif italic text-[18px] leading-[1.55] text-ink">
              &ldquo;{uc.quote}&rdquo;
            </p>
          </div>

          {/* Right: answer fades in on scroll */}
          <FadeIn delay={0.15}>
            <div className="pl-5 border-l-2 border-cobalt py-1">
              <p className="font-sans font-normal text-[17px] leading-[1.8] text-ink-soft">
                {uc.answer}
              </p>
            </div>
          </FadeIn>

        </div>
      ))}
    </div>
  );
}
