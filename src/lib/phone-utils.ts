export function formatUkrPhone(raw: string): string {
  const digits = raw.replace(/^\+380\s*/, "").replace(/\D/g, "").slice(0, 9);
  if (digits.length === 0) return "+380 ";
  if (digits.length <= 2) return `+380 ${digits}`;
  if (digits.length <= 5) return `+380 ${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 7) return `+380 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `+380 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
}

export function toTelHref(formatted: string): string {
  return "tel:+" + formatted.replace(/\D/g, "");
}
