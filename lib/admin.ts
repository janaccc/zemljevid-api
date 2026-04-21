const DEFAULT_FALLBACK_ADMIN_EMAILS = ["admin@scv.si"];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseEmailList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(normalizeEmail);
}

export function getAdminEmails(): string[] {
  const configured =
    process.env.ADMIN_EMAILS ??
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ??
    process.env.ADMIN_EMAIL ??
    process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  if (configured) {
    return parseEmailList(configured);
  }

  return DEFAULT_FALLBACK_ADMIN_EMAILS.map(normalizeEmail);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return getAdminEmails().includes(normalized);
}
