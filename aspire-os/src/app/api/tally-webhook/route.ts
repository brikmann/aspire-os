import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

type TallyField = {
  key: string;
  label: string;
  type: string;
  value: unknown;
};

type TallyPayload = {
  eventType: string;
  data: {
    fields: TallyField[];
  };
};

export async function POST(req: NextRequest) {
  let payload: TallyPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (payload.eventType !== "FORM_RESPONSE") {
    return NextResponse.json({ ok: true });
  }

  const emailField = payload.data?.fields?.find(
    (f) => f.type === "INPUT_EMAIL" || f.label?.toLowerCase().includes("email")
  );

  const email =
    typeof emailField?.value === "string" ? emailField.value.trim() : null;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "No valid email found." }, { status: 400 });
  }

  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.contacts.create({
    email,
    audienceId,
    unsubscribed: false,
  });

  if (error) {
    console.error("Resend contact error:", error);
    return NextResponse.json({ error: "Failed to add contact." }, { status: 500 });
  }

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
