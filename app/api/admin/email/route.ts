import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { Resend } from "resend";

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Email ni konfiguriran. Dodaj RESEND_API_KEY v .env.local" }, { status: 500 });
  }

  const { subject, body, recipients } = await request.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Zadeva in vsebina sta obvezni." }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server misconfigured";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let targets: string[];
  if (!recipients || recipients === "all") {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    targets = (data?.users ?? []).map((u) => u.email).filter((e): e is string => !!e);
  } else {
    targets = Array.isArray(recipients) ? recipients : [recipients];
  }

  if (targets.length === 0) {
    return NextResponse.json({ error: "Ni prejemnikov." }, { status: 400 });
  }

  const resend = new Resend(resendKey);
  const from = process.env.RESEND_FROM ?? "AI Food Finder <onboarding@resend.dev>";
  const htmlBody = body.replace(/\n/g, "<br>");

  // Resend batch: max 100 per request
  const BATCH = 50;
  let sent = 0;
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    await resend.emails.send({ from, to: batch, subject, html: htmlBody });
    sent += batch.length;
  }

  return NextResponse.json({ sent });
}
