import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import * as XLSX from "xlsx";

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

function parseCSV(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(",")[0].replace(/"/g, "").trim().toLowerCase())
    .filter((email) => email && email !== "email" && email.includes("@") && email.includes("."));
}

function parseXLSX(buffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
  const emails: string[] = [];
  for (const row of rows) {
    const val = String(row[0] ?? "").trim().toLowerCase();
    if (val && val !== "email" && val.includes("@") && val.includes(".")) {
      emails.push(val);
    }
  }
  return emails;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server misconfigured";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Ni datoteke." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  let emails: string[] = [];

  if (name.endsWith(".csv")) {
    emails = parseCSV(await file.text());
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    emails = parseXLSX(await file.arrayBuffer());
  } else {
    return NextResponse.json({ error: "Podprti formati: .csv, .xlsx, .xls" }, { status: 400 });
  }

  if (emails.length === 0) {
    return NextResponse.json({ error: "Ni veljavnih e-mail naslovov v datoteki." }, { status: 400 });
  }

  let created = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const email of emails) {
    const tmpPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    const { error } = await admin.auth.admin.createUser({
      email,
      password: tmpPassword,
      email_confirm: false,
    });
    if (error) {
      failed++;
      if (errors.length < 10) errors.push(`${email}: ${error.message}`);
    } else {
      created++;
    }
  }

  return NextResponse.json({ created, failed, total: emails.length, errors });
}
