import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Food Finder",
  description: "Najdi najboljše restavracije z AI + Google Maps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sl">
      <body>{children}</body>
    </html>
  );
}