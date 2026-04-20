import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const email = process.env.ADMIN_EMAIL;
  const password = "123123123";

  if (!email) {
    return NextResponse.json({ error: "ADMIN_EMAIL not set" }, { status: 500 });
  }

  const admin = createAdminClient();

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
