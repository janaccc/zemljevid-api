import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import * as XLSX from "xlsx";

type ImportRow = {
  email: string;
  password?: string;
};

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

function normalizeCell(val: unknown): string {
  return String(val ?? "").replace(/"/g, "").trim();
}

function isLikelyEmail(v: string): boolean {
  const email = v.trim().toLowerCase();
  return !!email && email !== "email" && email.includes("@") && email.includes(".");
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const first = lines[0].split(",").map(normalizeCell).map((v) => v.toLowerCase());
  let emailIdx = 0;
  let passIdx = 1;
  let start = 0;

  if (first.includes("email")) {
    emailIdx = first.indexOf("email");
    passIdx = first.includes("password") ? first.indexOf("password") : passIdx;
    start = 1;
  }

  const out: ImportRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(",").map(normalizeCell);
    const emailRaw = cols[emailIdx] ?? "";
    const email = emailRaw.trim().toLowerCase();
    if (!isLikelyEmail(email)) continue;

    const password = (cols[passIdx] ?? "").trim();
    out.push({ email, password: password || undefined });
  }
  return out;
}

function parseXLSX(buffer: ArrayBuffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  const out: ImportRow[] = [];

  let emailIdx = 0;
  let passIdx = 1;
  let start = 0;

  const header = (rows[0] ?? []).map((v) => normalizeCell(v).toLowerCase());
  if (header.includes("email")) {
    emailIdx = header.indexOf("email");
    passIdx = header.includes("password") ? header.indexOf("password") : passIdx;
    start = 1;
  }

  for (let i = start; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const email = normalizeCell(row[emailIdx]).toLowerCase();
    if (!isLikelyEmail(email)) continue;
    const password = normalizeCell(row[passIdx]);
    out.push({ email, password: password || undefined });
  }

  return out;
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
  let rows: ImportRow[] = [];

  if (name.endsWith(".csv")) {
    rows = parseCSV(await file.text());
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    rows = parseXLSX(await file.arrayBuffer());
  } else {
    return NextResponse.json({ error: "Podprti formati: .csv, .xlsx, .xls" }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Ni veljavnih e-mail naslovov v datoteki." }, { status: 400 });
  }

  let created = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const email = row.email;
    const password =
      row.password ?? (Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10));

    if (password.length < 6) {
      failed++;
      if (errors.length < 10) errors.push(`${email}: geslo mora imeti vsaj 6 znakov.`);
      continue;
    }

    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });
    if (error) {
      failed++;
      if (errors.length < 10) errors.push(`${email}: ${error.message}`);
    } else {
      created++;
    }
  }

  return NextResponse.json({ created, failed, total: rows.length, errors });
}
