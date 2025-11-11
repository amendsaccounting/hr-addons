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

