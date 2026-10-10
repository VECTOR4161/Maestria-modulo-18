const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const toUtc = (value: string) => new Date(`${value}T00:00:00Z`);

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }
  const parsed = toUtc(value);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function addDays(value: string, days: number): string {
  const parsed = toUtc(value);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / DAY_MS);
}

export function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let current = from; current <= to; current = addDays(current, 1)) {
    dates.push(current);
  }
  return dates;
}
