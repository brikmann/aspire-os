const TALLY_API_KEY = "tly-gNyJOLt8mzsv1FHzcfIGf7jiXQM6jJx0";
const TALLY_FORM_ID = "2ElM9M";
const RESEND_API_KEY = "re_iYBYTC9T_3VDip6jhPoutYVLRwU5HczDY";
const RESEND_AUDIENCE_ID = "f71c092e-2baf-49fe-907e-e9a2bdbfd2ae";

async function fetchTallySubmissions() {
  const url = `https://api.tally.so/forms/${TALLY_FORM_ID}/submissions?limit=500`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TALLY_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Tally API error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function addToResend(email) {
  const res = await fetch("https://api.resend.com/audiences/" + RESEND_AUDIENCE_ID + "/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  return res.json();
}

const data = await fetchTallySubmissions();
const submissions = data.submissions ?? [];
console.log(`Found ${submissions.length} Tally submission(s).`);

let added = 0, skipped = 0, failed = 0;

for (const submission of submissions) {
  const email = submission.responses?.[0]?.answer?.trim() ?? null;

  if (!email || !email.includes("@")) { skipped++; continue; }

  const result = await addToResend(email);
  if (result.id) {
    console.log(`  ✓ ${email}`);
    added++;
  } else {
    console.log(`  ✗ ${email} — ${JSON.stringify(result)}`);
    failed++;
  }
}

console.log(`\nDone. Added: ${added}, Skipped (no email): ${skipped}, Failed: ${failed}`);
