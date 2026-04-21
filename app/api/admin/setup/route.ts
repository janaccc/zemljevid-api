import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getAdminEmails } from "@/lib/admin";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = getAdminEmails()[0];
  const password = process.env.ADMIN_SETUP_PASSWORD ?? "123123123";

  if (!email) {
    return NextResponse.json(
      { error: "Admin email not configured (ADMIN_EMAIL / NEXT_PUBLIC_ADMIN_EMAIL)" },
      { status: 500 }
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server misconfigured";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const alreadyExists = existing?.users?.some((u) => u.email === email);

  if (alreadyExists) {
    return NextResponse.json({ message: "Admin user already exists" });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Admin user created", email: data.user.email });
}
