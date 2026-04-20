import Link from "next/link";

export default function WelcomePage() {
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
          maxWidth: "440px",
          background: "#121a30",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "48px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "18px",
            background: "linear-gradient(135deg, #4f7cff, #1d4ed8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "30px",
            marginBottom: "24px",
          }}
        >
          🍽️
        </div>

        <h1
          style={{
            margin: "0 0 10px",
            fontSize: "28px",
            fontWeight: 800,
            color: "white",
            textAlign: "center",
          }}
        >
          AI Food Finder
        </h1>

        <p
          style={{
            margin: "0 0 40px",
            fontSize: "15px",
            color: "rgba(255,255,255,0.55)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Najdi najboljše restavracije z AI + Google Maps.
          <br />
          Prijavi se za nadaljevanje.
        </p>

        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <Link
            href="/auth/login"
            style={{
              display: "block",
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: "#4f7cff",
              color: "white",
              fontWeight: 700,
              fontSize: "16px",
              textAlign: "center",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            Prijava
          </Link>

          <Link
            href="/auth/register"
            style={{
              display: "block",
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: "transparent",
              color: "white",
              fontWeight: 600,
              fontSize: "16px",
              textAlign: "center",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.15)",
              boxSizing: "border-box",
            }}
          >
            Registracija
          </Link>
        </div>
      </div>
    </main>
  );
}
