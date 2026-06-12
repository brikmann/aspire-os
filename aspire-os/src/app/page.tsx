import Link from "next/link";
import FadeIn from "@/components/FadeIn";
import CadenceDemo from "@/components/CadenceDemo";
import WearableConnectWidget from "@/components/WearableConnectWidget";
import CalendarProtocolWidget from "@/components/CalendarProtocolWidget";
import FounderNote from "@/components/FounderNote";
import HeroSignIn from "@/components/HeroSignIn";

// ── How it works steps ────────────────────────────────────────────────────────

const steps = [
  {
    number: "01",
    title: "Connect your wearable",
    body: "Authorize Google Health in one tap. Fitbit, Pixel Watch, Wear OS, and Health Connect devices flow in automatically — steps, sleep, HRV, resting heart rate.",
  },
  {
    number: "02",
    title: "Open your dashboard",
    body: "Cadence reads your biometrics, calendar, and current state, then generates your operational protocol for the day. Automatic every morning. No forms.",
  },
  {
    number: "03",
    title: "Execute with precision",
    body: "Ask the 4F coach anything. Push notifications deliver your protocol each morning. Overdrive tier unlocks advanced optimization for peak performance periods.",
  },
];

// ── 4 Foundations pillars (with real-world examples) ─────────────────────────

const pillars = [
  {
    label: "Sleep",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M17 14.5A7.5 7.5 0 0 1 8.5 6a7.53 7.53 0 0 1 .12-1.35A7.5 7.5 0 1 0 17 14.5z" stroke="#2C6BE0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    body: "HRV, recovery, and cognitive repair. Sleep is the single highest-leverage variable in your output.",
    example: "\"I can't fall asleep and I have a launch in 8 hours. What do I do right now?\"",
  },
  {
    label: "Sunlight",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="3.5" stroke="#2C6BE0" strokeWidth="1.4" />
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="#2C6BE0" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    body: "Circadian rhythm and the cortisol awakening response. Morning light sets your energy, mood, and sleep pressure for the entire day.",
    example: "\"I haven't been outside in three days. Is my circadian rhythm actually broken?\"",
  },
  {
    label: "Nutrition",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3c0 0-6 3.5-6 8a6 6 0 0 0 12 0c0-4.5-6-8-6-8z" stroke="#2C6BE0" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M10 11v4" stroke="#2C6BE0" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    body: "Glucose management and cognitive fuel. Your brain runs on 20% of your calories — what and when you eat directly determines your output.",
    example: "\"Why does my focus crash at 2pm today and what can I do about it?\"",
  },
  {
    label: "Stress",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0" stroke="#2C6BE0" strokeWidth="1.4" />
        <path d="M10 7v4M10 13.5v.5" stroke="#2C6BE0" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    body: "Cortisol regulation and nervous system balance. Stress isn't the enemy — chronic, unmanaged stress is. HRV is the scorecard.",
    example: "\"My HRV has been dropping for three days. Should I train hard today or rest?\"",
  },
];

// ── Tiers ─────────────────────────────────────────────────────────────────────

const tiers = [
  {
    name: "Core",
    status: "Live · Free during alpha",
    statusClass: "text-green-400",
    description: "Everything you need to start optimizing your day.",
    features: [
      "Auto-generated daily Cadence protocol",
      "Google Health + Calendar integration",
      "4F coach — ask anything about sleep, sunlight, nutrition, stress",
      "HRV, sleep, steps, and resting heart rate",
    ],
    cta: { label: "Open Dashboard →", href: "/dashboard", primary: true },
    highlight: false,
    quantum: false,
  },
  {
    name: "Overdrive",
    status: "Preview available",
    statusClass: "text-cobalt-soft",
    description: "For periods when you need to push harder and recover smarter.",
    features: [
      "Everything in Core",
      "Advanced HRV trend analysis and predictions",
      "Peak performance windows identified by biometrics",
      "Priority push notifications — protocol to your device each morning",
      "Overdrive recovery protocols for high-output weeks",
      "Share your daily protocol with an accountability partner",
    ],
    cta: { label: "Preview Overdrive →", href: "/dashboard/overdrive", primary: false },
    highlight: true,
    quantum: false,
  },
  {
    name: "Quantum",
    status: "Rolling out soon",
    statusClass: "text-quantum-soft",
    description: "Full-stack biometric intelligence for elite performers.",
    features: [
      "Everything in Overdrive",
      "Apple Health (via iOS app), Whoop, Oura, and CGMs",
      "Real-time biometric adaptation throughout the day",
      "Multi-device sync",
      "Unlimited 4F coach sessions with deep context",
      "Social graph — follow peers, compare recovery scores, share protocols publicly",
    ],
    cta: { label: "Get notified", href: "#", primary: false },
    highlight: false,
    quantum: true,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 h-[72px] bg-midnight/90 backdrop-blur-md border-b border-midnight-edge flex items-center justify-between px-6 md:px-12">
        <Link href="/" className="font-sans font-medium text-2xl text-silver-bright leading-none tracking-[-0.5px] hover:text-white transition-colors">
          ASPIRE OS
        </Link>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="hero-bg flex-1 bg-midnight flex flex-col items-center px-6 pt-20 pb-28 text-center relative overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[180px] blur-[80px] opacity-20"
          style={{ background: "radial-gradient(ellipse at center, #2C6BE0 0%, transparent 70%)" }}
        />

        <FadeIn delay={0} load>
          <span className="inline-flex items-center gap-2 bg-cobalt text-white text-xs font-semibold px-3.5 py-1.5 rounded-full mb-8 tracking-wide uppercase select-none">
            <span className="live-dot w-2 h-2 rounded-full bg-green-400 shrink-0" />
            Live Now
          </span>
        </FadeIn>

        <FadeIn className="w-full max-w-3xl" delay={0.05} load>
          <h1 className="font-sans font-semibold text-[40px] md:text-[64px] leading-[1.08] tracking-[-2px] text-silver-bright">
            The operating system for human optimization.
          </h1>
        </FadeIn>

        <FadeIn className="w-full max-w-2xl" delay={0.12} load>
          <p className="mt-7 font-sans font-normal text-[17px] md:text-[19px] leading-[1.65] text-silver">
            Aspire OS is the data synthesis layer for ambitious people.{" "}
            <span className="text-silver-bright font-medium">Cadence</span> — the first product — pulls your
            wearable, your calendar, and your state into the day&rsquo;s operational protocol. Auto-generated
            when you open it. Push notifications optional. Live alpha at{" "}
            <span className="text-cobalt-soft">aspireos.co/dashboard</span>.
          </p>
        </FadeIn>

        <FadeIn className="mt-10 flex flex-col sm:flex-row items-center gap-4" delay={0.2} load>
          <HeroSignIn />
          <a href="#how-it-works" className="text-[15px] font-medium text-silver-muted hover:text-silver transition-colors">
            How it works ↓
          </a>
        </FadeIn>

        <FadeIn delay={0.28} load>
          <p className="mt-5 font-sans font-normal text-[12px] leading-[1.5] tracking-[0.2px] text-silver-dim">
            Free during alpha &middot; No credit card required
          </p>
        </FadeIn>
      </section>

      {/* ── How Cadence Works + 4Foundations ─────────────────────────── */}
      <section id="how-it-works" className="bg-midnight-deep py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">

          {/* 3-step cards */}
          <FadeIn>
            <p className="font-sans font-medium text-[12px] uppercase tracking-[1.5px] text-cobalt mb-4">
              How It Works
            </p>
            <h2 className="font-sans font-semibold text-[28px] md:text-[38px] leading-[1.15] tracking-[-0.8px] text-silver-bright max-w-xl">
              From wearable to protocol in seconds.
            </h2>
          </FadeIn>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((step, i) => (
              <FadeIn key={step.number} delay={i * 0.08}>
                <div className="bg-midnight-light border border-midnight-edge rounded-2xl p-7 h-full flex flex-col gap-4 hover:border-cobalt/40 transition-colors duration-300">
                  <span className="font-sans font-bold text-[36px] leading-none text-cobalt/30 step-glow select-none">
                    {step.number}
                  </span>
                  <h3 className="font-sans font-semibold text-[17px] text-silver-bright leading-snug">{step.title}</h3>
                  <p className="font-sans font-normal text-[15px] leading-[1.65] text-silver-muted flex-1">{step.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* ── Animated widgets ── */}
          <FadeIn delay={0.1} className="mt-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
              <FadeIn delay={0.05}><WearableConnectWidget /></FadeIn>
              <FadeIn delay={0.12}><CalendarProtocolWidget /></FadeIn>
              <FadeIn delay={0.19}><CadenceDemo /></FadeIn>
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-[13px] font-medium text-silver-muted hover:text-silver-bright border border-midnight-edge hover:border-cobalt/40 px-5 py-2.5 rounded-xl transition-all duration-200"
              >
                Try it yourself
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </FadeIn>

          {/* 4 Foundations science */}
          <div className="mt-20 pt-16 border-t border-midnight-edge">
            <FadeIn>
              <p className="font-sans font-medium text-[12px] uppercase tracking-[1.5px] text-cobalt mb-3">
                The Science Behind It
              </p>
              <h2 className="font-sans font-semibold text-[26px] md:text-[32px] leading-[1.15] tracking-[-0.7px] text-silver-bright mb-2">
                What is 4Foundations?
              </h2>
              <p className="font-sans text-[16px] leading-[1.65] text-silver max-w-2xl">
                4Foundations is the research framework powering Cadence. There are four biological levers
                that control cognitive and physical output — and they compound. When all four are dialled
                in, everything else follows.
              </p>
            </FadeIn>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pillars.map((p, i) => (
                <FadeIn key={p.label} delay={i * 0.07}>
                  <div className="bg-midnight-light border border-midnight-edge rounded-2xl p-6 h-full flex flex-col gap-3 hover:border-cobalt/40 transition-colors duration-300">
                    <div className="w-9 h-9 rounded-xl bg-cobalt/10 border border-cobalt/20 flex items-center justify-center shrink-0">
                      {p.icon}
                    </div>
                    <h3 className="font-sans font-semibold text-[16px] text-silver-bright">{p.label}</h3>
                    <p className="font-sans text-[13px] leading-[1.6] text-silver-muted flex-1">{p.body}</p>
                    <p className="font-sans text-[12px] leading-[1.55] text-cobalt-soft/80 italic border-t border-midnight-edge pt-3 mt-1">
                      {p.example}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Founder Note ──────────────────────────────────────────────── */}
      <section className="bg-midnight-deep py-16 md:py-24 px-6">
        <FounderNote />
      </section>

      {/* ── Tiers ─────────────────────────────────────────────────────── */}
      <section className="bg-midnight-deep border-y border-midnight-edge py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <p className="font-sans font-medium text-[12px] uppercase tracking-[1.5px] text-cobalt mb-4">
              Tiers
            </p>
            <h2 className="font-sans font-semibold text-[28px] md:text-[38px] leading-[1.15] tracking-[-0.8px] text-silver-bright max-w-xl">
              Start free. Grow into your edge.
            </h2>
          </FadeIn>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            {tiers.map((tier, i) => (
              <FadeIn key={tier.name} delay={i * 0.08}>
                <div
                  className={[
                    "relative rounded-2xl border p-7 flex flex-col gap-5 h-full transition-colors duration-300",
                    tier.quantum
                      ? "border-quantum/25 shadow-[0_0_48px_rgba(139,92,246,0.08)] hover:border-quantum/40"
                      : tier.highlight
                        ? "bg-cobalt/8 border-cobalt/40 shadow-[0_0_40px_rgba(44,107,224,0.12)]"
                        : "bg-midnight-light border-midnight-edge hover:border-midnight-edge/80",
                  ].join(" ")}
                  style={tier.quantum
                    ? { background: "linear-gradient(145deg, #170F2A 0%, #1C1130 60%, #130E20 100%)" }
                    : undefined}
                >
                  {tier.highlight && (
                    <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 bg-cobalt text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Featured
                    </span>
                  )}
                  {tier.quantum && (
                    <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 bg-quantum text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-[0_0_16px_rgba(139,92,246,0.5)]">
                      ✦ Quantum
                    </span>
                  )}

                  <div>
                    <h3 className={[
                      "font-sans font-bold text-[22px] mb-1",
                      tier.quantum ? "text-quantum-soft" : "text-silver-bright",
                    ].join(" ")}>{tier.name}</h3>
                    <p className={["font-sans text-[12px] font-medium uppercase tracking-[1px]", tier.statusClass].join(" ")}>
                      {tier.status}
                    </p>
                  </div>

                  <p className="font-sans text-[14px] leading-[1.6] text-silver-muted">{tier.description}</p>

                  <ul className="space-y-2.5 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <svg className="mt-[3px] shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <circle cx="7" cy="7" r="6"
                            stroke={tier.quantum ? "#8B5CF6" : "#2C6BE0"}
                            strokeWidth="1.2" />
                          <path d="M4.5 7l2 2 3-3"
                            stroke={tier.quantum ? "#8B5CF6" : "#2C6BE0"}
                            strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-sans text-[13px] leading-[1.55] text-silver">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={tier.cta.href}
                    className={[
                      "mt-2 inline-flex items-center justify-center gap-2 font-semibold text-[14px] px-5 py-3 rounded-xl transition-all duration-200",
                      tier.quantum
                        ? "bg-quantum hover:bg-quantum-dark text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)]"
                        : tier.cta.primary
                          ? "bg-cobalt hover:bg-cobalt-dark text-white shadow-[0_4px_20px_rgba(44,107,224,0.3)]"
                          : "bg-midnight-edge/60 hover:bg-midnight-edge text-silver-bright",
                    ].join(" ")}
                  >
                    {tier.cta.label}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="bg-paper py-16 md:py-24 px-6">
        <div className="max-w-[720px] mx-auto">
          <FadeIn>
            <p className="font-sans font-medium text-[12px] uppercase tracking-[1.5px] text-cobalt mb-4">
              Questions People Ask
            </p>
            <h2 className="font-sans font-semibold text-[30px] md:text-[40px] leading-[1.15] tracking-[-1px] text-ink mb-10">
              What you might be wondering.
            </h2>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="divide-y divide-paper-edge">

              <details className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-sans font-medium text-[18px] text-ink">Who is this actually for?</span>
                  <svg className="w-5 h-5 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </summary>
                <p className="mt-4 pb-1 font-sans font-normal text-[16px] leading-[1.7] text-ink-soft">
                  Founders, ambitious early-career professionals, and athletes who are pushing the limits of their own output &mdash; and want to keep doing it without their body becoming the bottleneck. If you&rsquo;re optimizing for output (cognitive or physical), this is built for you.
                </p>
              </details>

              <details className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-sans font-medium text-[18px] text-ink">Is this a replacement for my doctor?</span>
                  <svg className="w-5 h-5 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </summary>
                <p className="mt-4 pb-1 font-sans font-normal text-[16px] leading-[1.7] text-ink-soft">
                  No. 4Foundations is a coach, not a clinician. It helps you understand what&rsquo;s happening, prepare better questions for your doctor, and act on the things within your control. When something belongs in a clinical setting, the coach will tell you.
                </p>
              </details>

              <details className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-sans font-medium text-[18px] text-ink">How is this different from ChatGPT?</span>
                  <svg className="w-5 h-5 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </summary>
                <p className="mt-4 pb-1 font-sans font-normal text-[16px] leading-[1.7] text-ink-soft">
                  ChatGPT is a general-purpose tool. The 4F coach is trained specifically on the research and frameworks for the four foundations — sleep science, circadian biology, metabolic nutrition, and stress physiology. It answers like someone who has spent years inside this research, not like a generalist who&rsquo;s read the Wikipedia summary.
                </p>
              </details>

              <details className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-sans font-medium text-[18px] text-ink">When does it actually launch?</span>
                  <svg className="w-5 h-5 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </summary>
                <p className="mt-4 pb-1 font-sans font-normal text-[16px] leading-[1.7] text-ink-soft">
                  Cadence is live now. Try it at aspireos.co/dashboard. The 4F coach is included. Overdrive tier preview is at /dashboard/overdrive. Push notifications + multi-wearable + Quantum tier rolling out over the next few weeks.
                </p>
              </details>

              <details className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-sans font-medium text-[18px] text-ink">Do I have to fill out a form every day?</span>
                  <svg className="w-5 h-5 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </summary>
                <p className="mt-4 pb-1 font-sans font-normal text-[16px] leading-[1.7] text-ink-soft">
                  No. When your wearable and calendar are connected, Cadence is generated automatically when you open the dashboard. Push notifications optional — get your protocol delivered to your device each morning.
                </p>
              </details>

              <details className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-sans font-medium text-[18px] text-ink">Is my information private?</span>
                  <svg className="w-5 h-5 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </summary>
                <p className="mt-4 pb-1 font-sans font-normal text-[16px] leading-[1.7] text-ink-soft">
                  Yes. Your conversations and personal context stay with you. We never share, sell, or train external models on your data. The social sharing features on Overdrive and Quantum are opt-in — you control what you share and with whom.
                </p>
              </details>

              <details className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-sans font-medium text-[18px] text-ink">Which wearables work?</span>
                  <svg className="w-5 h-5 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </summary>
                <p className="mt-4 pb-1 font-sans font-normal text-[16px] leading-[1.7] text-ink-soft">
                  Google Health (Fitbit, Pixel Watch, Wear OS, Android Health Connect) is live. Apple Health (via iOS app), Whoop, Oura, and CGMs rolling out over the next few weeks.
                </p>
              </details>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="bg-midnight py-20 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <FadeIn>
            <span className="inline-flex items-center gap-2 bg-cobalt/15 border border-cobalt/30 text-cobalt-soft text-xs font-semibold px-3.5 py-1.5 rounded-full mb-7 tracking-wide uppercase select-none">
              <span className="live-dot w-2 h-2 rounded-full bg-green-400 shrink-0" />
              Free during alpha
            </span>
            <h2 className="font-sans font-semibold text-[28px] md:text-[38px] leading-[1.12] tracking-[-0.8px] text-silver-bright mb-5">
              Your protocol is waiting.
            </h2>
            <p className="font-sans text-[17px] leading-[1.6] text-silver mb-8">
              Connect your wearable, open your dashboard, and let Cadence generate your day. Takes two minutes. No forms.
            </p>
            <Link
              href="/dashboard"
              className="btn-shimmer relative overflow-hidden inline-flex items-center gap-2.5 bg-cobalt hover:bg-cobalt-dark active:scale-[0.98] text-white font-semibold text-[17px] px-9 py-4 rounded-xl transition-all duration-200 shadow-[0_4px_32px_rgba(44,107,224,0.35)]"
            >
              Open Dashboard
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-midnight border-t border-midnight-edge py-8 px-6 text-center space-y-2">
        <p className="font-sans text-[12px] text-silver-muted">
          &copy; 2026 Aspire OS &middot; Cadence is grounded in 4Foundations&trade; research.
        </p>
        <a href="/privacy" className="font-sans text-[12px] text-silver-dim hover:text-silver-muted transition-colors">
          Privacy Policy
        </a>
      </footer>
    </>
  );
}
