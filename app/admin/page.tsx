"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchStats, setSearchStats] = useState<{ today: number; week: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    setError("");
    setLoading(true);

    (async () => {
      try {
        const r = await fetch("/api/admin/users");

        if (r.status === 403) {
          router.push("/dashboard");
          return;
        }

        const data = await r.json().catch(() => null);

        if (!r.ok) {
          if (!cancelled) {
            setError(data?.error ?? "Napaka pri nalaganju uporabnikov.");
          }
          return;
        }

        if (!cancelled) {
          setUsers(data?.users ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("Napaka pri nalaganju uporabnikov.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    fetch("/api/admin/stats")
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (!cancelled && data) setSearchStats(data);
      })
      .catch(() => {
        // stats are optional
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Izbriši uporabnika ${email}?`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } else {
      const d = await res.json();
      setError(d.error ?? "Napaka pri brisanju.");
    }
    setDeletingId(null);
  };

  const handleEditSave = async (id: string) => {
    setSaving(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: editEmail }),
    });
    if (res.ok) {
      const d = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? d.user : u)));
      setEditingId(null);
    } else {
      const d = await res.json();
      setError(d.error ?? "Napaka pri shranjevanju.");
    }
    setSaving(false);
  };

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const totalUsers = users.length;
  const confirmedUsers = users.filter((u) => u.email_confirmed_at).length;
  const newThisWeek = users.filter(
    (u) => new Date(u.created_at) > weekAgo
  ).length;

  return (
    <main style={{ minHeight: "100vh", background: "#0b1020", padding: "32px 24px", color: "white" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800 }}>Admin Panel</h1>
            <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>AI Food Finder</p>
          </div>
          <Link
            href="/dashboard"
            style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none", fontSize: "14px" }}
          >
            ← Nazaj na iskanje
          </Link>
        </div>

        {error && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: "14px" }}>
            {error}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "12px" }}>
          <StatCard label="Skupaj uporabnikov" value={totalUsers} />
          <StatCard label="Potrjeni e-maili" value={confirmedUsers} />
          <StatCard label="Novi ta teden" value={newThisWeek} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "24px" }}>
          <StatCard label="Iskanja danes" value={searchStats?.today ?? 0} accent />
          <StatCard label="Iskanja zadnjih 7 dni" value={searchStats?.week ?? 0} accent />
        </div>

        {/* Users table */}
        <div style={{ background: "#121a30", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Uporabniki</h2>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
              Nalagam...
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
              Ni uporabnikov.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Uporabnik", "Registracija", "Status", "Akcije"].map((h) => (
                      <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Email */}
                      <td style={{ padding: "14px 24px" }}>
                        {editingId === user.id ? (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(79,124,255,0.5)", background: "#0b1020", color: "white", fontSize: "14px", outline: "none" }}
                            />
                            <button
                              onClick={() => handleEditSave(user.id)}
                              disabled={saving}
                              style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: "#4f7cff", color: "white", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
                            >
                              {saving ? "..." : "Shrani"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "white", cursor: "pointer", fontSize: "13px" }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #4f7cff, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>
                              {user.email?.[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: 500 }}>{user.email}</div>
                              {isAdminEmail(user.email) && (
                                <div style={{ fontSize: "11px", color: "#4f7cff" }}>Admin</div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Datum */}
                      <td style={{ padding: "14px 24px", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
                        {new Date(user.created_at).toLocaleDateString("sl-SI")}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 24px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: user.email_confirmed_at ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)",
                          color: user.email_confirmed_at ? "#4ade80" : "#fbbf24",
                        }}>
                          {user.email_confirmed_at ? "Potrjen" : "Nepotrjen"}
                        </span>
                      </td>

                      {/* Akcije */}
                      <td style={{ padding: "14px 24px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => { setEditingId(user.id); setEditEmail(user.email ?? ""); setError(""); }}
                            style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "white", cursor: "pointer", fontSize: "13px" }}
                          >
                            Uredi
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.email ?? user.id)}
                            disabled={deletingId === user.id}
                            style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#fca5a5", cursor: "pointer", fontSize: "13px" }}
                          >
                            {deletingId === user.id ? "..." : "Izbriši"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ background: accent ? "rgba(79,124,255,0.06)" : "#121a30", border: `1px solid ${accent ? "rgba(79,124,255,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: "16px", padding: "20px 24px" }}>
      <div style={{ fontSize: "32px", fontWeight: 800, marginBottom: "4px", color: accent ? "#4f7cff" : "white" }}>{value}</div>
      <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>{label}</div>
    </div>
  );
}
