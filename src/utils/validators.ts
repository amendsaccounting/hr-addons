export function isBlank(value: string | null | undefined): boolean {
  return !value || String(value).trim().length === 0;
}

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function isEmailValid(email: string): boolean {
  if (isBlank(email)) return false;
  return EMAIL_REGEX.test(String(email).trim());
}

export function validateEmail(email: string): string | null {
  const value = String(email || '').trim();
  if (value.length === 0) return 'Email is required';
  if (!isEmailValid(value)) return 'Enter a valid email address';
  return null;
}

export function validateRequired(label: string, value: string | null | undefined): string | null {
  if (isBlank(value)) return `${label} is required`;
  return null;
}

export function parseDateDDMMYYYY(value: string): Date | null {
  if (isBlank(value)) return null;
  const m = String(value).trim().match(/^([0-3]\d)\/([0-1]\d)\/(\d{4})$/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const y = parseInt(m[3], 10);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function validateDateDDMMYYYY(label: string, value: string, opts?: { notFuture?: boolean }): string | null {
  const v = String(value || '').trim();
  if (v.length === 0) return `${label} is required`;
  const dt = parseDateDDMMYYYY(v);
  if (!dt) return `${label} must be DD/MM/YYYY`;
  if (opts?.notFuture) {
    const today = new Date();
    today.setHours(0,0,0,0);
    if (dt > today) return `${label} cannot be in the future`;
  }
  return null;
}

export function validateDateOrder(earlierLabel: string, earlier: string, laterLabel: string, later: string): string | null {
  const a = parseDateDDMMYYYY(earlier);
  const b = parseDateDDMMYYYY(later);
  if (!a || !b) return null; // handled by own validators
  if (b < a) return `${laterLabel} cannot be before ${earlierLabel}`;
  return null;
}

export function validatePhoneNumber(phone: string): string | null {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 0) return 'Phone number is required';
  if (digits.length < 6) return 'Enter a valid phone number';
  if (digits.length > 15) return 'Enter a valid phone number';
  return null;
}
