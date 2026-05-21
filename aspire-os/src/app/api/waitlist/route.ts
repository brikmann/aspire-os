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
<body style="margin:0;padding:0;background:#1B2536;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1B2536;padding:48px 24px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:18px;font-weight:500;letter-spacing:0.5px;color:#E8ECF0;">ASPIRE OS</span>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <h1 style="margin:0;font-size:32px;font-weight:600;line-height:1.15;letter-spacing:-0.75px;color:#E8ECF0;">
            You&rsquo;re on the list.
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <p style="margin:0;font-size:17px;line-height:1.65;color:#C7CCD3;">
            Aspire OS launches mid-June. You&rsquo;ll get one email when it&rsquo;s ready &mdash; nothing before then.
          </p>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <p style="margin:0;font-size:17px;line-height:1.65;color:#C7CCD3;">
            The research has settled. The translation hasn&rsquo;t. That&rsquo;s what we&rsquo;re building.
          </p>
        </td></tr>
        <tr><td style="padding-top:32px;border-top:1px solid #2E3B55;">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#6B7682;">
            Aspire OS &mdash; 4Foundations &mdash; aspireos.com
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }).catch((err) => console.error("Confirmation email error:", err));

  return NextResponse.json({ ok: true });
}
