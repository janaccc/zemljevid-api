"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

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
            <div style={{ fontWeight: 700, fontSize: "18px", marginBottom: "4px" }}>
              {user.email}
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

        {/* Placeholder sekcija za prijatelja */}
        <div
          style={{
            background: "#121a30",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "24px 28px",
            opacity: 0.5,
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Zgodovina iskanj
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
            Kmalu na voljo...
          </p>
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
