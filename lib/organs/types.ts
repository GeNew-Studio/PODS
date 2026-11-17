import type { FieldDef, OrganId, Profile, QualityReport, ScoreResult } from "@/lib/types";
import type { Donor, Recipient } from "@/lib/types";

export type OrganModule = {
  id: OrganId;
  label: string;
  donorFields: FieldDef[];
  recipientFields: FieldDef[];
  donorDefaults: Profile;
  recipientDefaults: Profile;
  donorBlock: (donor: Donor) => string[];
  evaluate: (donor: Donor, recipient: Recipient) => ScoreResult;
  quality: (donor: Donor) => QualityReport;
  clock: (hours: number) => "ok" | "soon" | "late";
  clockLabel: string;
  summariseDonor: (donor: Donor) => { label: string; value: string }[];
  summariseRecipient: (recipient: Recipient) => { label: string; value: string }[];
  // Organ-specific urgency shown on the waiting list (NHS heart scheme, liver UKELD or super-urgent category, ...).
  urgency: (recipient: Recipient) => string;
  // Primary diagnosis label for the waiting list.
  diagnosis: (recipient: Recipient) => string;
  listingCentre: string;
  implantSite: string;
};
