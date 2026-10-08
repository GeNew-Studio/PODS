export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function bmi(heightCm: number, weightKg: number): number {
  const metres = heightCm / 100;
  if (metres <= 0) return 0;
  return round1(weightKg / (metres * metres));
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-HK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function flag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "yes" || value === "true";
}

export function antigenList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
}

export function titleCase(value: string): string {
  return value.replaceAll("_", " ");
}
