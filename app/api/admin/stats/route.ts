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
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [todayRes, weekRes, recentRes] = await Promise.all([
    admin.from("searches").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    admin.from("searches").select("id", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
    admin.from("searches").select("created_at, query").gte("created_at", fourteenDaysAgo.toISOString()),
  ]);

  // Build daily data map (last 14 days)
  const dailyMap: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }

  const queryMap: Record<string, number> = {};
  for (const s of recentRes.data ?? []) {
    const date = s.created_at.slice(0, 10);
    if (dailyMap[date] !== undefined) dailyMap[date]++;
    const q = (s.query ?? "").toLowerCase().trim();
    if (q) queryMap[q] = (queryMap[q] || 0) + 1;
  }

  const dailyData = Object.entries(dailyMap).map(([date, count]) => ({
    date: date.slice(5), // MM-DD
    count,
  }));

  const topQueries = Object.entries(queryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([query, count]) => ({ query, count }));

  return NextResponse.json({
    today: todayRes.count ?? 0,
    week: weekRes.count ?? 0,
    dailyData,
    topQueries,
  });
}
