"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Gesli se ne ujemata.");
      return;
    }
    if (password.length < 6) {
      setError("Geslo mora biti dolgo vsaj 6 znakov.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Send welcome email (fire-and-forget, non-blocking)
    fetch("/api/auth/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
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
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>✉️</div>
          <h2 style={{ margin: "0 0 12px", color: "white", fontSize: "22px" }}>
            Potrdi e-mail
          </h2>
          <p style={{ margin: "0 0 28px", color: "rgba(255,255,255,0.55)", fontSize: "14px", lineHeight: 1.6 }}>
            Poslali smo ti potrditveno e-sporočilo na{" "}
            <strong style={{ color: "white" }}>{email}</strong>.
            <br />
            Klikni na povezavo in se nato prijavi.
          </p>
          <Link
            href="/auth/login"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: "12px",
              background: "#4f7cff",
              color: "white",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Na prijavo
          </Link>
        </div>
      </main>
    );
  }

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
          Registracija
        </h1>
        <p style={{ margin: "0 0 32px", color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
          Ustvari račun za AI Food Finder
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

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>Ponovi geslo</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            }}
          >
            {loading ? "Registriram..." : "Ustvari račun"}
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
          Že imaš račun?{" "}
          <Link href="/auth/login" style={{ color: "#4f7cff", textDecoration: "none" }}>
            Prijava
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
