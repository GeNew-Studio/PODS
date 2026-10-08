import type { Cluster } from "@/lib/types";
import { round1 } from "@/lib/format";

export function predictedHeartMass(
  sex: "male" | "female",
  age: number,
  heightCm: number,
  weightKg: number,
): number {
  const heightM = heightCm / 100;
  const safeAge = Math.max(age, 1);
  const lvA = sex === "male" ? 8.25 : 6.82;
  const rvA = sex === "male" ? 11.25 : 10.59;
  const left = lvA * heightM ** 0.54 * weightKg ** 0.61;
  const right = rvA * safeAge ** -0.32 * heightM ** 1.135 * weightKg ** 0.315;
  return left + right;
}

export function predictedTlc(sex: "male" | "female", heightCm: number): number {
  const heightM = heightCm / 100;
  return sex === "male" ? 7.99 * heightM - 7.08 : 6.6 * heightM - 5.79;
}

export function ratio(donor: number, recipient: number): number {
  if (recipient <= 0 || donor <= 0) return 0;
  return donor / recipient;
}

export function clusterPoints(cluster: Cluster, same: number, city: number, far: number): number {
  if (cluster === "Hong Kong West") return same;
  if (cluster === "Hong Kong East" || cluster.startsWith("Kowloon")) return city;
  return far;
}

export function clusterRank(cluster: Cluster): number {
  if (cluster === "Hong Kong West") return 3;
  if (cluster === "Hong Kong East" || cluster.startsWith("Kowloon")) return 2;
  return 1;
}

export function waitPoints(days: number, max: number): number {
  const capped = Math.min(Math.max(days, 0), 365);
  return (max * capped) / 365;
}

export function coldTimePoints(hours: number, full: number, goodUntil: number, zeroAt: number): number {
  if (hours <= goodUntil) return full;
  if (hours >= zeroAt) return 0;
  return full * ((zeroAt - hours) / (zeroAt - goodUntil));
}

export function restorePoints(points: number, full: number, restore: number): number {
  return Math.min(full, points + restore);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function pointsLabel(value: number): string {
  return round1(value).toFixed(1).replace(/\.0$/, "");
}
