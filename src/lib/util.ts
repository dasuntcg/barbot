export const runtime = 'nodejs'; // force Node.js wherever this is imported

export function normName(s: string) {
  return s.trim().toLowerCase();
}

export function parsePosNumber(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) throw new Error('Invalid positive number');
  return v;
}

export function parseNonNegNumber(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) throw new Error('Invalid non-negative number');
  return v;
}
