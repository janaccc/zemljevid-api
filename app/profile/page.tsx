"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";

const SEARCH_HISTORY_KEY = "search-history";

type SearchHistoryEntry = {
  prompt: string;
  createdAt: string;
};

function readSearchHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedHistory = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];

    return Array.isArray(parsedHistory)
      ? parsedHistory.filter(
          (entry): entry is SearchHistoryEntry =>
            Boolean(
              entry &&
                typeof entry.prompt === "string" &&
                typeof entry.createdAt === "string"
            )
        )
      : [];
  } catch {
    return [];
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [searchHistory] = useState<SearchHistoryEntry[]>(readSearchHistory);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/");
        return;
      }
      setUser(data.user);
    });
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!user) return null;

  const isAdmin = isAdminEmail(user.email);
  const joined = new Date(user.created_at).toLocaleDateString("sl-SI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        padding: "32px 24px",
        color: "white",
      }}
    >
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
          <Link
            href="/dashboard"
            style={{
              color: "rgba(255,255,255,0.45)",
              textDecoration: "none",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ← Nazaj na iskanje
          </Link>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(239,68,68,0.3)",
              background: "transparent",
              color: "rgba(239,68,68,0.8)",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Odjava
          </button>
        </div>

        {/* Avatar + ime */}
        <div
          style={{
            background: "#121a30",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "28px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4f7cff, #1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              flexShrink: 0,
            }}
          >
            {user.email?.[0].toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <span style={{ fontWeight: 700, fontSize: "18px" }}>{user.email}</span>
              {isAdmin && (
                <span style={{ padding: "2px 10px", borderRadius: "999px", background: "rgba(79,124,255,0.18)", color: "#4f7cff", fontSize: "12px", fontWeight: 700 }}>
                  Admin
                </span>
              )}
            </div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
              Član od {joined}
            </div>
          </div>
        </div>

        {/* Info sekcija */}
        <div
          style={{
            background: "#121a30",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "24px 28px",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ margin: "0 0 20px", fontSize: "16px", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Podatki
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <InfoRow label="E-mail" value={user.email ?? "—"} />
            <InfoRow label="ID" value={user.id} mono />
            <InfoRow
              label="E-mail potrjen"
              value={user.email_confirmed_at ? "Da" : "Ne"}
            />
          </div>
        </div>

        {/* Admin sekcija */}
        {isAdmin && (
          <div
            style={{
              background: "rgba(79,124,255,0.06)",
              border: "1px solid rgba(79,124,255,0.2)",
              borderRadius: "20px",
              padding: "24px 28px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#4f7cff" }}>
                Admin Panel
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
                Upravljaj uporabnike in oglej si statistike
              </p>
            </div>
            <Link
              href="/admin"
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                background: "#4f7cff",
                color: "white",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              Odpri →
            </Link>
          </div>
        )}

        {/* Placeholder sekcija za prijatelja */}
        <div
          style={{
            background: "#121a30",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "24px 28px",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Zgodovina iskanj
          </h2>
          {searchHistory.length === 0 ? (
            <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
              Se ni shranjenih iskanj.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {searchHistory.map((entry, index) => (
                <div
                  key={`${entry.createdAt}-${index}`}
                  style={{
                    padding: "14px 0",
                    borderBottom:
                      index === searchHistory.length - 1
                        ? "none"
                        : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontSize: "15px", color: "white", marginBottom: "6px" }}>
                    {entry.prompt}
                  </div>
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
                    {new Date(entry.createdAt).toLocaleString("sl-SI", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
      <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: "14px",
          color: "white",
          fontFamily: mono ? "monospace" : "inherit",
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}
