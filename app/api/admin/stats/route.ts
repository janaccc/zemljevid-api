import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

export async function GET() {
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
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [todayRes, weekRes] = await Promise.all([
    admin.from("searches").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    admin.from("searches").select("id", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
  ]);

  return NextResponse.json({
    today: todayRes.count ?? 0,
    week: weekRes.count ?? 0,
  });
}
