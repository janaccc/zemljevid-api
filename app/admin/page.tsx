"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

type Stats = {
  today: number;
  week: number;
  dailyData: { date: string; count: number }[];
  topQueries: { query: string; count: number }[];
};

type SortKey = "email" | "created_at" | "status";
type SortDir = "asc" | "desc";

// ─── Modals ────────────────────────────────────────────────────────────────

function EmailModal({ users, onClose }: { users: User[]; onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, recipients: "all" }),
      });
      const d = await res.json();
      if (res.ok) setResult(`Poslano ${d.sent} prejemnikom.`);
      else setResult(`Napaka: ${d.error}`);
    } catch {
      setResult("Napaka pri pošiljanju.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Pošlji email vsem</h2>
          <button onClick={onClose} style={iconBtn}>✕</button>
        </div>
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginBottom: "16px" }}>
          Prejemniki: {users.length} uporabnikov
        </div>
        <label style={lbl}>Zadeva</label>
        <input
          value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="Zadeva sporočila..."
          style={inp}
        />
        <label style={{ ...lbl, marginTop: "12px" }}>Vsebina</label>
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Sporočilo za uporabnike..."
          rows={6}
          style={{ ...inp, resize: "vertical" }}
        />
        {result && (
          <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "8px", background: result.startsWith("Napaka") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: result.startsWith("Napaka") ? "#fca5a5" : "#4ade80", fontSize: "13px" }}>
            {result}
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={secondaryBtn}>Prekliči</button>
          <button onClick={send} disabled={sending || !subject.trim() || !body.trim()} style={primaryBtn}>
            {sending ? "Pošiljam..." : "Pošlji vsem"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setErr("");
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/import", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) setErr(d.error ?? "Napaka.");
      else { setResult(d); onImported(); }
    } catch {
      setErr("Napaka pri uvažanju.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Uvozi uporabnike</h2>
          <button onClick={onClose} style={iconBtn}>✕</button>
        </div>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: "0 0 16px" }}>
          Naloži .csv ali .xlsx datoteko: stolpec A = email, stolpec B = geslo (opcijsko). Glava je lahko &ldquo;email&rdquo; / &ldquo;password&rdquo;.
        </p>
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: "2px dashed rgba(79,124,255,0.35)", borderRadius: "12px", padding: "28px", textAlign: "center", cursor: "pointer", background: "rgba(79,124,255,0.04)", transition: "border-color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(79,124,255,0.7)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(79,124,255,0.35)")}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>📂</div>
          <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
            {file ? file.name : "Klikni za izbiro datoteke (.csv, .xlsx)"}
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setErr(""); }} />
        </div>
        {err && <div style={{ marginTop: "12px", color: "#fca5a5", fontSize: "13px" }}>{err}</div>}
        {result && (
          <div style={{ marginTop: "12px", padding: "12px 14px", borderRadius: "8px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: "13px" }}>
            <div style={{ color: "#4ade80", fontWeight: 600 }}>Uvoženo: {result.created} uporabnikov</div>
            {result.failed > 0 && <div style={{ color: "#fbbf24", marginTop: "4px" }}>Neuspešno: {result.failed}</div>}
            {result.errors.map((e, i) => <div key={i} style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "2px" }}>{e}</div>)}
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={secondaryBtn}>Zapri</button>
          <button onClick={handleImport} disabled={!file || loading} style={primaryBtn}>
            {loading ? "Uvažam..." : "Uvozi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showEmail, setShowEmail] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadUsers = () => {
    setError("");
    setLoading(true);
    fetch("/api/admin/users")
      .then(async (r) => {
        if (r.status === 403) { router.push("/dashboard"); return; }
        const d = await r.json().catch(() => null);
        if (r.ok) setUsers(d?.users ?? []);
        else setError(d?.error ?? "Napaka pri nalaganju.");
      })
      .catch(() => setError("Napaka pri nalaganju."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setStats(d); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Izbriši uporabnika ${email}?`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id));
    else { const d = await res.json(); setError(d.error ?? "Napaka pri brisanju."); }
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

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(79, 124, 255);
    doc.text("AI Food Finder — Admin poročilo", 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(120, 120, 140);
    doc.text(`Generirano: ${new Date().toLocaleString("sl-SI")}`, 14, 26);

    doc.setFontSize(12);
    doc.setTextColor(30, 30, 50);
    doc.text(`Skupaj uporabnikov: ${users.length}`, 14, 36);
    doc.text(`Potrjeni: ${users.filter((u) => u.email_confirmed_at).length}`, 14, 43);
    if (stats) {
      doc.text(`Iskanja danes: ${stats.today}   |   Zadnjih 7 dni: ${stats.week}`, 14, 50);
    }

    autoTable(doc, {
      startY: 58,
      head: [["Email", "Registracija", "Status"]],
      body: visibleUsers.map((u) => [
        u.email ?? "",
        new Date(u.created_at).toLocaleDateString("sl-SI"),
        u.email_confirmed_at ? "Potrjen" : "Nepotrjen",
      ]),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [79, 124, 255] },
      alternateRowStyles: { fillColor: [245, 245, 252] },
    });

    doc.save(`admin-porocilo-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ── Filtering & sorting ──────────────────────────────────────────────────
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const filtered = users.filter((u) => {
    if (!filter) return true;
    return (u.email ?? "").toLowerCase().includes(filter.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    let av: string, bv: string;
    if (sortKey === "email") { av = a.email ?? ""; bv = b.email ?? ""; }
    else if (sortKey === "status") { av = a.email_confirmed_at ? "1" : "0"; bv = b.email_confirmed_at ? "1" : "0"; }
    else { av = a.created_at; bv = b.created_at; }
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const visibleUsers = sorted;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const totalUsers = users.length;
  const confirmedUsers = users.filter((u) => u.email_confirmed_at).length;
  const newThisWeek = users.filter((u) => new Date(u.created_at) > weekAgo).length;

  return (
    <main style={{ minHeight: "100vh", background: "#0b1020", padding: "32px 24px", color: "white" }}>
      {showEmail && <EmailModal users={users} onClose={() => setShowEmail(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={loadUsers} />}

      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800 }}>Admin Panel</h1>
            <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>AI Food Finder</p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={() => setShowImport(true)} style={toolBtn}>📂 Uvozi CSV/XLSX</button>
            <button onClick={handleExportPDF} style={toolBtn}>📄 Izvozi PDF</button>
            <button onClick={() => setShowEmail(true)} style={{ ...toolBtn, background: "rgba(79,124,255,0.15)", borderColor: "rgba(79,124,255,0.4)", color: "#7da5ff" }}>✉️ Pošlji email</button>
            <Link href="/dashboard" style={{ ...toolBtn, textDecoration: "none", display: "inline-block" }}>← Iskanje</Link>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: "14px" }}>
            {error}
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "12px" }}>
          <StatCard label="Skupaj uporabnikov" value={totalUsers} />
          <StatCard label="Potrjeni e-maili" value={confirmedUsers} />
          <StatCard label="Novi ta teden" value={newThisWeek} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "28px" }}>
          <StatCard label="Iskanja danes" value={stats?.today ?? 0} accent />
          <StatCard label="Iskanja zadnjih 7 dni" value={stats?.week ?? 0} accent />
        </div>

        {/* Charts */}
        {mounted && stats && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
            {/* Daily searches chart */}
            <div style={chartCard}>
              <h3 style={chartTitle}>Iskanja — zadnjih 14 dni</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stats.dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#121a30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="count" stroke="#4f7cff" strokeWidth={2} dot={{ fill: "#4f7cff", r: 3 }} activeDot={{ r: 5 }} name="Iskanja" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top queries chart */}
            <div style={chartCard}>
              <h3 style={chartTitle}>Top poizvedbe (14 dni)</h3>
              {stats.topQueries.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "180px", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
                  Še ni podatkov
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.topQueries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="query" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#121a30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "12px" }} />
                    <Bar dataKey="count" fill="#4f7cff" radius={[4, 4, 0, 0]} name="Iskanja" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Users table */}
        <div style={{ background: "#121a30", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, flex: 1 }}>
              Uporabniki {visibleUsers.length !== users.length && <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400, fontSize: "13px" }}>({visibleUsers.length} / {users.length})</span>}
            </h2>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtriraj po emailu..."
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "#0b1020", color: "white", fontSize: "13px", outline: "none", width: "220px" }}
            />
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Nalagam...</div>
          ) : visibleUsers.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
              {users.length === 0 ? "Ni uporabnikov." : "Ni rezultatov za ta filter."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {(["email", "created_at", "status"] as SortKey[]).map((key) => {
                      const labels: Record<SortKey, string> = { email: "Uporabnik", created_at: "Registracija", status: "Status" };
                      return (
                        <th
                          key={key}
                          onClick={() => toggleSort(key)}
                          style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: sortKey === key ? "#4f7cff" : "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none" }}
                        >
                          {labels[key]}{sortIcon(key)}
                        </th>
                      );
                    })}
                    <th style={{ padding: "12px 24px", textAlign: "left", fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => (
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
                            <button onClick={() => handleEditSave(user.id)} disabled={saving} style={primaryBtnSm}>
                              {saving ? "..." : "Shrani"}
                            </button>
                            <button onClick={() => setEditingId(null)} style={secondaryBtnSm}>✕</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#4f7cff,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>
                              {user.email?.[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: 500 }}>{user.email}</div>
                              {isAdminEmail(user.email) && <div style={{ fontSize: "11px", color: "#4f7cff" }}>Admin</div>}
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
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: user.email_confirmed_at ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)", color: user.email_confirmed_at ? "#4ade80" : "#fbbf24" }}>
                          {user.email_confirmed_at ? "Potrjen" : "Nepotrjen"}
                        </span>
                      </td>

                      {/* Akcije */}
                      <td style={{ padding: "14px 24px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => { setEditingId(user.id); setEditEmail(user.email ?? ""); setError(""); }}
                            style={secondaryBtnSm}
                          >
                            Uredi
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.email ?? user.id)}
                            disabled={deletingId === user.id}
                            style={{ ...secondaryBtnSm, borderColor: "rgba(239,68,68,0.3)", color: "#fca5a5" }}
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

// ─── Shared styles ──────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ background: accent ? "rgba(79,124,255,0.06)" : "#121a30", border: `1px solid ${accent ? "rgba(79,124,255,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: "16px", padding: "20px 24px" }}>
      <div style={{ fontSize: "32px", fontWeight: 800, marginBottom: "4px", color: accent ? "#4f7cff" : "white" }}>{value}</div>
      <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>{label}</div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "24px" };
const modal: React.CSSProperties = { background: "#121a30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "480px", color: "white" };
const lbl: React.CSSProperties = { display: "block", fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "6px" };
const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "#0b1020", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" };
const primaryBtn: React.CSSProperties = { padding: "10px 20px", borderRadius: "10px", border: "none", background: "#4f7cff", color: "white", fontWeight: 700, fontSize: "14px", cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { padding: "10px 20px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "white", fontWeight: 500, fontSize: "14px", cursor: "pointer" };
const primaryBtnSm: React.CSSProperties = { padding: "6px 12px", borderRadius: "8px", border: "none", background: "#4f7cff", color: "white", cursor: "pointer", fontSize: "13px", fontWeight: 600 };
const secondaryBtnSm: React.CSSProperties = { padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "white", cursor: "pointer", fontSize: "13px" };
const iconBtn: React.CSSProperties = { background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "18px", cursor: "pointer", padding: "4px" };
const toolBtn: React.CSSProperties = { padding: "8px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.75)", cursor: "pointer", fontSize: "13px", fontWeight: 500 };
const chartCard: React.CSSProperties = { background: "#121a30", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px" };
const chartTitle: React.CSSProperties = { margin: "0 0 16px", fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.7)" };
