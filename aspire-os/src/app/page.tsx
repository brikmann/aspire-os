import EmailForm from "@/components/EmailForm";
import FadeIn from "@/components/FadeIn";

const useCases = [
  { time: "2 A.M.",           pillars: "SLEEP",            quote: "I have a launch tomorrow and I can't fall asleep." },
  { time: "TUESDAY",          pillars: "SUN",              quote: "I haven't been outside in three days. Why does that matter?" },
  { time: "MID-AFTERNOON",    pillars: "SATIATE",          quote: "Why does my focus die at 2 p.m. every day?" },
  { time: "POST-DEMO DAY",    pillars: "SERENITY",         quote: "I crashed after the high. How do I not lose a week to this?" },
  { time: "WEEK 7 OF SPRINT", pillars: "SLEEP + SERENITY", quote: "My HRV has been tanking. Do I push through?" },
  { time: "5 A.M. WORKOUT",   pillars: "SATIATE",          quote: "I'm bonking at the end of every session. What am I missing?" },
];

function WordMark() {
  return (
    <span className="font-sans font-medium text-[22px] text-silver-bright tracking-tight inline-flex items-center select-none">
      ASP
      <span
        className="bg-cobalt rounded-[1px]"
        style={{
          display: "inline-block",
          width: "2.5px",
          height: "1.1em",
          margin: "0 1.5px",
          verticalAlign: "-0.1em",
        }}
        aria-hidden="true"
      />
      RE OS
    </span>
  );
}

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-50 h-[72px] bg-midnight border-b border-midnight-edge flex items-center px-6 md:px-12">
        <WordMark />
      </header>

      <section
        id="waitlist"
        className="flex-1 bg-midnight flex flex-col items-center px-6 pt-16 pb-24 text-center"
      >
        <FadeIn className="w-full max-w-3xl" delay={0}>
          <h1 className="font-sans font-semibold text-[40px] md:text-[64px] leading-[1.10] tracking-[-1.5px] text-silver-bright">
            The operating system for human optimization.
          </h1>
        </FadeIn>

        <FadeIn className="w-full max-w-xl" delay={0.1}>
          <p className="mt-6 font-sans font-normal text-[17px] md:text-[19px] leading-[1.60] text-silver">
            4Foundations is a private AI coach for founders and ambitious people
            who won&rsquo;t let their body be the reason they fall short.
          </p>
        </FadeIn>

        <FadeIn className="mt-10 w-full max-w-sm" delay={0.2}>
          <EmailForm />
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mt-4 font-sans font-normal text-[13px] leading-[1.50] tracking-[0.2px] text-silver-dim">
            Mid-June launch. No spam. One email when it&rsquo;s ready.
          </p>
        </FadeIn>
      </section>

      <section className="bg-paper py-16 md:py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <p className="font-sans font-medium text-[12px] uppercase tracking-[1.5px] text-cobalt mb-4">
              In Practice
            </p>
            <h2 className="font-sans font-semibold text-[30px] md:text-[40px] leading-[1.15] tracking-[-1px] text-ink max-w-2xl">
              A response to every question.
            </h2>
            <p className="mt-4 font-sans font-normal text-[19px] leading-[1.65] text-ink-soft max-w-2xl">
              From poor sleep to low energy and everything in between, 4Foundations has a good answer &mdash; if you know what to ask.
            </p>
          </FadeIn>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {useCases.map((uc, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="bg-paper-warm rounded-2xl p-6 border border-paper-edge h-full">
                  <p className="font-sans font-medium text-[11px] uppercase tracking-[1px] text-cobalt mb-3">
                    {uc.time} · {uc.pillars}
                  </p>
                  <p className="font-serif italic text-[19px] leading-[1.55] text-ink">
                    &ldquo;{uc.quote}&rdquo;
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
