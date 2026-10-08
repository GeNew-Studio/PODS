import fs from "fs";
import path from "path";
import type { ClinicalDocument, Donor } from "@/lib/types";

export const uploadsDir = path.join(process.cwd(), "data", "uploads");

const signedSeed: Record<string, { storedName: string; fileName: string }> = {
  "doc-h-good-family_consent": {
    storedName: "alex-chan-family-consent-signed.svg",
    fileName: "alex-chan-family-consent-signed.svg",
  },
  "doc-l-good-cause_of_death": {
    storedName: "dana-wu-cause-of-death-signed.svg",
    fileName: "dana-wu-cause-of-death-signed.svg",
  },
};

export function donorDocumentId(donorId: string, kind: "family_consent" | "cause_of_death"): string {
  return `doc-${donorId}-${kind}`;
}

export function donorDocuments(donor: Donor, createdAt: string): ClinicalDocument[] {
  const shared = {
    donorId: donor.id,
    donorName: donor.name,
    organ: donor.organ,
    hospital: donor.hospital,
    causeOfDeath: donor.causeOfDeath,
    donorBlood: donor.bloodType,
    recipientId: null,
    recipientName: null,
    recipientBlood: null,
    matchId: null,
    score: null,
    mismatch: null,
    createdAt,
  };
  return [
    {
      ...shared,
      id: donorDocumentId(donor.id, "family_consent"),
      kind: "family_consent",
      title: `Family consent — ${donor.name}`,
      ...signedFields(donorDocumentId(donor.id, "family_consent")),
    },
    {
      ...shared,
      id: donorDocumentId(donor.id, "cause_of_death"),
      kind: "cause_of_death",
      title: `Cause of death — ${donor.name}`,
      ...signedFields(donorDocumentId(donor.id, "cause_of_death")),
    },
  ];
}

function signedFields(id: string): Pick<ClinicalDocument, "signedFileName" | "signedStoredName"> {
  const signed = signedSeed[id];
  if (!signed) return { signedFileName: null, signedStoredName: null };
  return { signedFileName: signed.fileName, signedStoredName: signed.storedName };
}

export function writeDemoSignatures() {
  fs.mkdirSync(uploadsDir, { recursive: true });
  for (const signed of Object.values(signedSeed)) {
    const filePath = path.join(uploadsDir, signed.storedName);
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, signatureSvg(signed.fileName));
  }
}

function signatureSvg(label: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240">
  <rect width="640" height="240" fill="#f7f3ea"/>
  <text x="32" y="56" font-family="Georgia, serif" font-size="22" fill="#1c2b2a">Demonstration signed copy</text>
  <text x="32" y="96" font-family="Georgia, serif" font-size="16" fill="#5c6f6d">${label}</text>
  <path d="M40 160 C 80 120, 120 200, 160 150 S 240 110, 300 160 S 420 210, 520 140" fill="none" stroke="#1a2744" stroke-width="2"/>
</svg>`;
}

export function documentKindLabel(kind: ClinicalDocument["kind"]): string {
  if (kind === "family_consent") return "Family consent";
  if (kind === "cause_of_death") return "Cause of death";
  return "Recipient consent";
}
