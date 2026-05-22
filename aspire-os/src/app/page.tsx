import EmailForm from "@/components/EmailForm";
import FadeIn from "@/components/FadeIn";
import UseCaseScroll from "@/components/UseCaseScroll";

const useCases = [
  {
    time: "2 A.M.",
    pillars: "SLEEP",
    quote: "I have a launch tomorrow and I can't fall asleep.",
    answer:
      "Your cortisol is spiking from anticipation — completely normal before a high-stakes morning. Try box breathing: 4 seconds in, 4 hold, 4 out, 4 hold. Repeat 8 cycles. Put your phone face-down across the room; blue light at 2 a.m. delays melatonin by up to 90 minutes. Four hours of quality sleep beats six hours of anxious half-sleep.",
  },
  {
    time: "TUESDAY",
    pillars: "SUN",
    quote: "I haven't been outside in three days. Why does that matter?",
    answer:
      "Sunlight before 10 a.m. anchors your cortisol awakening response — the hormonal signal that sets your energy, mood, and sleep pressure for the entire day. Three days without it and serotonin production drops noticeably. Ten minutes outside (no sunglasses) is enough to reset the signal. This is one of the highest-ROI habits in the 4Foundations protocol.",
  },
  {
    time: "MID-AFTERNOON",
    pillars: "SATIATE",
    quote: "Why does my focus die at 2 p.m. every day?",
    answer:
      "The 2 p.m. crash is a circadian trough amplified by a blood glucose correction after lunch. Your brain uses 20% of your calories — a glucose spike and drop hits cognitive output harder than physical performance. A 10-minute walk after eating cuts the spike by ~30% without changing what you eat. Longer fix: anchor lunch around protein and fat, keep starchy carbs smaller.",
  },
  {
    time: "POST-DEMO DAY",
    pillars: "SERENITY",
    quote: "I crashed after the high. How do I not lose a week to this?",
    answer:
      "Your nervous system ran at maximum output for weeks — the crash is cortisol normalizing. It's not a problem; it's the bill arriving. Protect sleep for the next two nights above everything else. Avoid alcohol (it fragments REM), keep movement light, and block high-stakes decisions for 48 hours. You'll recover faster than you expect.",
  },
  {
    time: "WEEK 7 OF SPRINT",
    pillars: "SLEEP + SERENITY",
    quote: "My HRV has been tanking. Do I push through?",
    answer:
      "When HRV drops more than 10% below your baseline for three straight days, adaptation has stalled — your body is absorbing less from each session, not more. Pushing harder now compounds the deficit. One full recovery day costs you one day; ignoring it costs you a week. Reduce intensity to 60%, prioritize 8+ hours tonight, and cut alcohol completely.",
  },
  {
    time: "5 A.M. WORKOUT",
    pillars: "SATIATE",
    quote: "I'm bonking at the end of every session. What am I missing?",
    answer:
      "You're training in a fasted state on depleted glycogen — your body has no choice but to burn muscle for fuel. Even 20g of fast carbs 30 minutes before (banana, dates, a rice cake) changes the last 20% of every session. Within 30 minutes after: 30–40g of protein to halt muscle breakdown. Pre-fuel for early morning training is not optional.",
  },
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
              Your biology insights, unlocked.
            </h2>
            <p className="mt-4 font-sans font-normal text-[19px] leading-[1.65] text-ink-soft max-w-2xl">
              4Foundations provides deep insights into questions that affect your bottom line.
            </p>
          </FadeIn>

          <div className="mt-12">
            <UseCaseScroll useCases={useCases} />
          </div>
        </div>
      </section>

      <section className="bg-midnight py-16 md:py-24 px-6">
        <div className="max-w-[720px] mx-auto">
          <FadeIn>
            <div className="bg-midnight-light rounded-2xl p-8 md:p-12">

              <div className="w-[120px] h-[120px] rounded-full bg-midnight-edge flex items-center justify-center mb-8">
                <span className="font-sans font-medium text-[32px] text-silver-bright select-none">NB</span>
              </div>

              <p className="font-sans font-medium text-[12px] uppercase tracking-[1.5px] text-cobalt-soft mb-6">
                A Note from the Founder
              </p>

              <div className="space-y-5">
                <p className="font-serif italic text-[19px] leading-[1.55] text-silver">
                  I&rsquo;m a kinesiology student who&rsquo;s been the founder
                  running on five hours with a launch tomorrow. I know what it does.
                  I kept doing it anyway.
                </p>
                <p className="font-serif italic text-[19px] leading-[1.55] text-silver">
                  Friends ask me questions their team can&rsquo;t answer. My parents
                  ask me questions their doctors don&rsquo;t have time for. Same gap
                  &mdash; different decade. It gets more expensive the longer it stays
                  open.
                </p>
                <p className="font-serif italic text-[19px] leading-[1.55] text-silver">
                  4Foundations is the coach I needed at 19. I&rsquo;m building it so
                  I never become my stepdad at 55.
                </p>
              </div>

              <div className="mt-8 pt-8 border-t border-midnight-edge">
                <p className="font-sans font-medium text-[17px] text-silver-bright">
                  &mdash; Noah Brikman
                </p>
                <p className="font-sans font-normal text-[14px] text-silver-muted mt-1">
                  Founder, Aspire OS
                </p>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
