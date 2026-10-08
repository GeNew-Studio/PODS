import type { BloodType, Donor, Recipient } from "@/lib/types";

export function aboCompatible(donor: BloodType, recipient: BloodType): boolean {
  if (donor === "O") return true;
  if (donor === "A") return recipient === "A" || recipient === "AB";
  if (donor === "B") return recipient === "B" || recipient === "AB";
  return recipient === "AB";
}

export function aboIdentical(donor: BloodType, recipient: BloodType): boolean {
  return donor === recipient;
}

export type Crossmatch = "positive" | "negative" | "uncertain";

export function virtualCrossmatch(donor: Donor, recipient: Recipient): Crossmatch {
  if (!donor.hlaComplete || !recipient.hlaComplete) return "uncertain";
  const donorAntigens = new Set(donor.hlaAntigens.map((item) => item.toUpperCase()));
  const hit = recipient.unacceptableAntigens.some((item) => donorAntigens.has(item.toUpperCase()));
  return hit ? "positive" : "negative";
}
