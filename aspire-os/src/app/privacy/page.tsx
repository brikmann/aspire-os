import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Aspire OS",
  description: "How Aspire OS collects, stores, and uses your data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-midnight">
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-16">

        <Link
          href="/"
          className="inline-block font-sans font-medium text-[22px] text-silver-bright mb-12"
        >
          ASPIRE OS
        </Link>

        <p className="font-sans font-medium text-[12px] uppercase tracking-[1.5px] text-cobalt mb-3">
          Legal
        </p>
        <h1 className="font-sans font-semibold text-[32px] sm:text-[40px] text-silver-bright leading-[1.15] tracking-[-0.5px] mb-3">
          Privacy Policy
        </h1>
        <p className="font-sans text-[14px] text-silver-dim mb-12">
          Last updated May 30, 2026
        </p>

        <div className="space-y-10 font-sans text-[16px] leading-[1.75] text-silver">

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-cobalt mb-3">
              What we collect
            </h2>
            <p>
              When you use Cadence, we collect the biometric and schedule inputs you enter
              into the form — sleep duration, morning energy, HRV, resting heart rate,
              priorities, and calendar events. If you connect Google Fit, we also store an
              encrypted OAuth access token and refresh token so we can fetch your health
              data on your behalf. The health data we retrieve from Google Fit (step count,
              sleep session duration, and heart rate readings from the last 24 hours) is
              used in real time to generate your protocol and is never persisted beyond
              the current request.
            </p>
            <p className="mt-4">
              We set a single first-party session cookie (<code className="text-silver-bright text-[14px] bg-midnight-light px-1.5 py-0.5 rounded">cadence_session</code>)
              to associate your browser with your stored OAuth tokens. This cookie has a
              30-day lifespan and is marked <code className="text-silver-bright text-[14px] bg-midnight-light px-1.5 py-0.5 rounded">HttpOnly</code> and{" "}
              <code className="text-silver-bright text-[14px] bg-midnight-light px-1.5 py-0.5 rounded">SameSite=Lax</code>.
            </p>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-cobalt mb-3">
              Why we collect it
            </h2>
            <p>
              The sole purpose of collecting your biometric data and Google Fit tokens is
              to generate a personalized daily protocol via Claude AI. Your data is not
              used for advertising, sold to third parties, or used to train any machine
              learning model we control.
            </p>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-cobalt mb-3">
              Where it's stored
            </h2>
            <p>
              OAuth tokens (access token and refresh token) are stored in a Supabase
              PostgreSQL database. Before being written to disk, each token is encrypted
              with AES-256-GCM using a server-side key that is never transmitted to the
              client and is not stored in the database. The authentication tag and
              initialization vector are stored alongside the ciphertext, and the
              decryption key exists only in the server environment. Form inputs you enter
              are never written to a database — they exist only in memory for the duration
              of a single API request.
            </p>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-cobalt mb-3">
              Third parties
            </h2>
            <ul className="space-y-3 list-none">
              <li>
                <span className="text-silver-bright font-medium">Anthropic</span> — your
                biometric summary and calendar are sent to Anthropic&rsquo;s Claude API to
                generate the protocol. Per Anthropic&rsquo;s commercial API terms, customer
                inputs and outputs are not used to train Anthropic&rsquo;s models.
                Anthropic&rsquo;s data handling is governed by their{" "}
                <a
                  href="https://www.anthropic.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cobalt hover:text-cobalt-soft underline underline-offset-2 transition-colors"
                >
                  privacy policy
                </a>
                .
              </li>
              <li className="mt-3">
                <span className="text-silver-bright font-medium">Google</span> — if you
                connect Google Fit, we use Google&rsquo;s OAuth 2.0 flow and the Google
                Fitness REST API to retrieve your health data. Google&rsquo;s data handling
                is governed by their{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cobalt hover:text-cobalt-soft underline underline-offset-2 transition-colors"
                >
                  privacy policy
                </a>
                .
              </li>
              <li className="mt-3">
                <span className="text-silver-bright font-medium">Vercel</span> — Aspire OS
                is hosted on Vercel. Vercel processes request metadata (IP address, user
                agent, request timing) as part of normal web hosting. Vercel does not have
                access to your form inputs, OAuth tokens, or Google Fit data — those live
                in encrypted Supabase storage or in-memory only. Vercel&rsquo;s data
                handling is governed by their{" "}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cobalt hover:text-cobalt-soft underline underline-offset-2 transition-colors"
                >
                  privacy policy
                </a>
                .
              </li>
              <li className="mt-3">
                <span className="text-silver-bright font-medium">Supabase</span> — OAuth
                tokens are stored in a Supabase-hosted PostgreSQL instance in the US East
                region. Supabase&rsquo;s data handling is governed by their{" "}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cobalt hover:text-cobalt-soft underline underline-offset-2 transition-colors"
                >
                  privacy policy
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-cobalt mb-3">
              Data deletion
            </h2>
            <p>
              You can disconnect Google Fit at any time using the Disconnect button in the
              Cadence form. This immediately deletes your OAuth tokens from our database
              and clears your session cookie. Because form inputs and fetched health data
              are never persisted, disconnecting removes all data we hold about you. If
              you would like us to verify deletion or have other requests, email us at the
              address below.
            </p>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-cobalt mb-3">
              Changes to this policy
            </h2>
            <p>
              We may update this policy as the product evolves. The &ldquo;Last updated&rdquo; date
              at the top reflects the most recent change. Material changes — new data types
              collected, new third parties, or changes to deletion practices — will be
              announced via email to any user who has connected Google Fit or submitted a
              form.
            </p>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-cobalt mb-3">
              Age
            </h2>
            <p>
              Aspire OS is not intended for use by anyone under 18. If you believe a minor
              has used Aspire OS, email{" "}
              <a
                href="mailto:noahbrikman@gmail.com"
                className="text-cobalt hover:text-cobalt-soft underline underline-offset-2 transition-colors"
              >
                noahbrikman@gmail.com
              </a>{" "}
              and we will delete their data.
            </p>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-cobalt mb-3">
              Contact
            </h2>
            <p>
              Questions or deletion requests:{" "}
              <a
                href="mailto:noahbrikman@gmail.com"
                className="text-cobalt hover:text-cobalt-soft underline underline-offset-2 transition-colors"
              >
                noahbrikman@gmail.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-midnight-edge">
          <Link
            href="/cadence"
            className="text-sm text-silver-dim hover:text-silver transition-colors"
          >
            ← Back to Cadence
          </Link>
        </div>

      </div>
    </main>
  );
}
