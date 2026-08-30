/**
 * Normalizes a phone number for wa.me links. Handles the common Indian
 * formats the spec calls out: "+91 9876543210", "091 98765 43210",
 * "9876543210" all become "919876543210".
 */
export function normalizePhoneForWhatsApp(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  // Strip a leading trunk "0" (e.g. 0 9876543210)
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  // Bare 10-digit Indian mobile number — assume +91
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

export function waLink(raw?: string | null): string | null {
  if (!raw) return null;
  const normalized = normalizePhoneForWhatsApp(raw);
  if (normalized.length < 8) return null;
  return `https://wa.me/${normalized}`;
}

export function telLink(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length < 6) return null;
  return `tel:${digits}`;
}

export function mailLink(raw?: string | null): string | null {
  if (!raw) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return null;
  return `mailto:${raw}`;
}

/** Basic reasonableness check for a phone/WhatsApp number entered in a form. */
export function isValidPhone(raw: string): boolean {
  if (!raw.trim()) return true; // optional fields stay optional
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 13;
}

export function isValidEmail(raw: string): boolean {
  if (!raw.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

/** EditableField-shaped validator: returns an error message, or null if valid. */
export function phoneValidator(raw: string): string | null {
  return isValidPhone(raw) ? null : "Enter a valid phone number";
}

/** EditableField-shaped validator: returns an error message, or null if valid. */
export function emailValidator(raw: string): string | null {
  return isValidEmail(raw) ? null : "Enter a valid email address";
}
