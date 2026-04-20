"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Napačen e-mail ali geslo.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1020",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#121a30",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "40px",
        }}
      >
        <h1
          style={{
            margin: "0 0 6px",
            fontSize: "24px",
            fontWeight: 800,
            color: "white",
          }}
        >
          Prijava
        </h1>
        <p style={{ margin: "0 0 32px", color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
          Dobrodošel nazaj v AI Food Finder
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tvoj@email.com"
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#0b1020",
                color: "white",
                fontSize: "15px",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>Geslo</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#0b1020",
                color: "white",
                fontSize: "15px",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, color: "#fca5a5", fontSize: "13px" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: loading ? "rgba(79,124,255,0.5)" : "#4f7cff",
              color: "white",
              fontWeight: 700,
              fontSize: "16px",
              cursor: loading ? "default" : "pointer",
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Prijavljam..." : "Prijava"}
          </button>
        </form>

        <p
          style={{
            margin: "24px 0 0",
            textAlign: "center",
            fontSize: "14px",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Nimaš računa?{" "}
          <Link href="/auth/register" style={{ color: "#4f7cff", textDecoration: "none" }}>
            Registracija
          </Link>
        </p>

        <p style={{ margin: "12px 0 0", textAlign: "center" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none", fontSize: "13px" }}>
            ← Nazaj
          </Link>
        </p>
      </div>
    </main>
  );
}
