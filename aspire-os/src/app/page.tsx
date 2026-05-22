import EmailForm from "@/components/EmailForm";
import FadeIn from "@/components/FadeIn";

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
    </>
  );
}
