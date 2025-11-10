export function isValidEmail(input: string): boolean {
  if (!input) return false;
  const v = input.trim();
  if (v.length === 0) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(v);
}

