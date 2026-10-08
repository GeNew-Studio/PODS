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
};
