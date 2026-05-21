import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  let email: unknown;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    console.error("RESEND_AUDIENCE_ID is not set");
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  const { error } = await resend.contacts.create({
    email,
    audienceId,
    unsubscribed: false,
  });

  if (error) {
    console.error("Resend contact error:", error);
    return NextResponse.json(
      { error: "Could not save your email. Please try again." },
      { status: 500 }
    );
  }

  // Confirmation email — fire and don't block the response on failure
  resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Aspire OS <onboarding@resend.dev>",
    to: email,
    subject: "You're on the list.",
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:48px auto;padding:0 24px;color:#1a1a1a;">
    <p style="font-size:16px;line-height:1.7;margin:0 0 20px;">Got you &mdash; you&rsquo;re on the list.</p>
    <p style="font-size:16px;line-height:1.7;margin:0 0 20px;">Aspire OS launches mid-June. You&rsquo;ll get one email when it&rsquo;s ready &mdash; nothing before then.</p>
    <p style="font-size:16px;line-height:1.7;margin:0 0 20px;">The research has settled. The translation hasn&rsquo;t. That&rsquo;s what we&rsquo;re building.</p>
    <p style="font-size:16px;line-height:1.7;margin:0;">&mdash; Noah</p>
  </div>
</body>
</html>`,
  }).catch((err) => console.error("Confirmation email error:", err));

  return NextResponse.json({ ok: true });
}
