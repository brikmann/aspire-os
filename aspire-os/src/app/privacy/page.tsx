export const dynamic = 'force-static';
export const revalidate = false;

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
          Last updated June 1, 2026 (revised)
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
              If you connect Google Health (the primary wearable integration), we store
              an encrypted OAuth access token and refresh token and use them to fetch
              steps, resting heart rate, HRV, and sleep duration for the current day.
              Google Health consolidates data from Fitbit, Wear OS, Pixel Watch, and
              any Android device syncing through Health Connect. The health data we
              retrieve is used in real time to generate your protocol and is never
              persisted beyond the current request.
            </p>
            <p className="mt-4">
              If you connect Google Fit (legacy), we store an encrypted OAuth token and
              use it to fetch step count, sleep session duration, and heart rate readings
              from the last 24 hours. This integration remains active for backward
              compatibility; Google Health is preferred when both are connected.
            </p>
            <p className="mt-4">
              If you connect Google Calendar (a separate, independent connection), we
              fetch today&rsquo;s events — start time, end time, title, location, and
              duration only. We do not fetch attendees, meeting links, descriptions, or
              events from any day other than today. This data is used in real time to
              generate your protocol and is never persisted.
            </p>
            <p className="mt-4">
              If you connect Notion, we store an encrypted OAuth access token and the IDs
              of the parent page and Cadence Protocol database in your workspace. When you
              use &ldquo;Push to Notion,&rdquo; we write your generated protocol items as
              pages in that database — action text, scheduled time, category, rationale,
              and duration. We never read, list, or modify any other content in your Notion
              workspace. Notion tokens do not expire; you can revoke access at any time
              from the dashboard or from Notion&rsquo;s integration settings.
            </p>
            <p className="mt-4">
              When you chat with 4F (the conversational coach within the Dashboard),
              your messages and the protocol context are sent to Anthropic&rsquo;s Claude
              API to generate responses. Conversations are not stored — they exist only in
              your browser session and clear on page refresh.
            </p>
            <p className="mt-4">
              We set a single first-party session cookie (<code className="text-silver-bright text-[14px] bg-midnight-light px-1.5 py-0.5 rounded">cadence_session</code>)
              to associate your browser with your stored OAuth tokens across all
              integrations. This cookie has a 30-day lifespan and is marked{" "}
              <code className="text-silver-bright text-[14px] bg-midnight-light px-1.5 py-0.5 rounded">HttpOnly</code> and{" "}
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
                <span className="text-silver-bright font-medium">Google</span> — we use
                Google&rsquo;s OAuth 2.0 flow for three independent integrations: Google
                Health API (primary wearable data — unifies Fitbit, Wear OS, Pixel Watch,
                and Health Connect sources), Google Fit (legacy wearable integration), and
                Google Calendar. Each requires a separate authorization and can be
                disconnected independently without affecting the others. Google&rsquo;s
                data handling is governed by their{" "}
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
                <span className="text-silver-bright font-medium">Fitbit / Wear OS / Health Connect</span> — when
                you connect Google Health, data from your Fitbit device, Wear OS watch,
                or any Android app syncing through Health Connect may be retrieved via
                the Google Health API. We do not communicate directly with Fitbit or Wear
                OS servers; Google Health acts as the intermediary. The data we receive
                carries source attribution (device and platform) which is displayed in
                the dashboard but is not stored beyond the current request.
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
                <span className="text-silver-bright font-medium">Notion</span> — if you
                connect Notion, we use Notion&rsquo;s public OAuth 2.0 flow to obtain a
                workspace-scoped access token. This token is used only to create and write
                to the &ldquo;Cadence Protocol&rdquo; database in your chosen parent page.
                We do not read other pages in your workspace. Notion&rsquo;s data handling
                is governed by their{" "}
                <a
                  href="https://www.notion.so/privacy"
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
                href="mailto:noah@aspireos.co"
                className="text-cobalt hover:text-cobalt-soft underline underline-offset-2 transition-colors"
              >
                noah@aspireos.co
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
                href="mailto:noah@aspireos.co"
                className="text-cobalt hover:text-cobalt-soft underline underline-offset-2 transition-colors"
              >
                noah@aspireos.co
              </a>
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-midnight-edge">
          <Link
            href="/dashboard"
            className="text-sm text-silver-dim hover:text-silver transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

      </div>
    </main>
  );
}
