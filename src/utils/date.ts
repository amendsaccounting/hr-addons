// Lightweight date helpers optimized for LeaveScreen

// Returns a new Date at 00:00 local time
export function startOfDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

export function todayStart(): Date {
  return startOfDay(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(s?: string | null): Date | null {
  if (!s) return null;
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : startOfDay(dt);
}

// Clamp a date not to be before min and not after max
export function clampDate(d: Date, min?: Date | null, max?: Date | null): Date {
  const t = d.getTime();
  if (min && t < min.getTime()) return new Date(min.getTime());
  if (max && t > max.getTime()) return new Date(max.getTime());
  return d;
}

// When user picks From date, ensure it isn't in the past and not after To
export function adjustFromOnPick(picked: Date, toDateStr?: string, today = todayStart()): { from: string; to?: string } {
  const to = parseISODate(toDateStr);
  const adjusted = clampDate(startOfDay(picked), today, to || undefined);
  const fromStr = toISODate(adjusted);
  const out: { from: string; to?: string } = { from: fromStr };
  if (to && adjusted.getTime() > to.getTime()) {
    out.to = fromStr;
  }
  return out;
}

// When user picks To date, ensure it isn't in the past and not before From
export function adjustToOnPick(picked: Date, fromDateStr?: string, today = todayStart()): { to: string; from?: string } {
  const from = parseISODate(fromDateStr) || today;
  const minAllowed = from.getTime() < today.getTime() ? today : from;
  const adjusted = clampDate(startOfDay(picked), minAllowed, undefined);
  const toStr = toISODate(adjusted);
  const out: { to: string; from?: string } = { to: toStr };
  if (fromDateStr) {
    const f = parseISODate(fromDateStr)!;
    if (f.getTime() > adjusted.getTime()) out.from = toStr;
  }
  return out;
}

// Validate a range; returns {ok,false} with message if invalid
export function validateRange(fromStr?: string, toStr?: string, today = todayStart()): { ok: boolean; error?: string } {
  if (!fromStr || !toStr) return { ok: false, error: 'Please fill From and To dates.' };
  const f = parseISODate(fromStr);
  const t = parseISODate(toStr);
  if (!f || !t) return { ok: false, error: 'Please pick valid From and To dates.' };
  if (f.getTime() < today.getTime() || t.getTime() < today.getTime()) return { ok: false, error: 'Dates cannot be in the past.' };
  if (t.getTime() < f.getTime()) return { ok: false, error: 'To Date cannot be before From Date.' };
  return { ok: true };
}

