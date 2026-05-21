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

  return NextResponse.json({ ok: true });
}
