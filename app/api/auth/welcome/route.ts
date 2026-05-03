import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ ok: false });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ ok: false, error: "Email ni konfiguriran." });

  const resend = new Resend(resendKey);
  const from = process.env.RESEND_FROM ?? "AI Food Finder <onboarding@resend.dev>";

  await resend.emails.send({
    from,
    to: email,
    subject: "Dobrodošli v AI Food Finder!",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0b1020;color:white;padding:40px;border-radius:16px;">
        <h2 style="color:#4f7cff;margin-bottom:16px;">Dobrodošli v AI Food Finder!</h2>
        <p style="color:rgba(255,255,255,0.8);line-height:1.7;">
          Hvala za registracijo. Z našo aplikacijo lahko enostavno in hitro poiščeš restavracije blizu tebe,
          kar z naravnim jezikom – preprosto vpiši, kaj te zanima.
        </p>
        <p style="color:rgba(255,255,255,0.8);line-height:1.7;">
          Primeri iskanj:<br/>
          <em style="color:#4f7cff;">„pizza, poceni, center"</em><br/>
          <em style="color:#4f7cff;">„romantična večerja, Ljubljana"</em><br/>
          <em style="color:#4f7cff;">„burger, odprto zdaj"</em>
        </p>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard"
           style="display:inline-block;margin-top:24px;padding:14px 28px;background:#4f7cff;color:white;border-radius:12px;text-decoration:none;font-weight:700;">
          Začni iskati
        </a>
        <p style="margin-top:32px;color:rgba(255,255,255,0.35);font-size:12px;">
          AI Food Finder &bull; Dobrega apetita!
        </p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
