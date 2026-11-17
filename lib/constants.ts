import type { BloodType, Cluster, DonationPathway, Donor, Ethnicity, OutcomeStatus, PerfusionDevice } from "@/lib/types";

export const CLUSTERS: Cluster[] = [
  "Hong Kong West",
  "Hong Kong East",
  "Kowloon Central",
  "Kowloon East",
  "Kowloon West",
  "New Territories East",
  "New Territories West",
];

export const BLOOD_TYPES: BloodType[] = ["O", "A", "B", "AB"];

export const PERFUSION_DEVICES: { value: PerfusionDevice; label: string }[] = [
  { value: "none", label: "None" },
  { value: "ocs", label: "Ex-vivo normothermic heart perfusion" },
  { value: "evlp", label: "Ex-vivo lung perfusion" },
  { value: "organox", label: "Normothermic machine perfusion, liver (OrganOx)" },
  { value: "hmp", label: "Hypothermic oxygenated machine perfusion, liver (HOPE)" },
];

export const MEDICINES = [
  "Blood pressure",
  "Statin",
  "Diabetes",
  "Thyroid",
  "Antidepressant",
  "Inhaler",
  "Reflux",
  "Pain relief",
  "Blood thinner",
  "Anti-seizure",
  "Opioid replacement",
  "Chemotherapy",
  "Immunosuppressant",
];

export const IMPLANT_HOSPITAL = "Queen Mary Hospital";
export const LISTING_CENTRE = "Grantham Hospital";

// Specific causes of death. DBD causes lead to brainstem death. DCD causes are the
// Maastricht category III pathway (planned withdrawal of life-sustaining treatment),
// which is not yet practised in Hong Kong.
export const CAUSES_OF_DEATH: { value: string; pathway: DonationPathway }[] = [
  { value: "Spontaneous intracerebral haemorrhage (hypertensive)", pathway: "DBD" },
  { value: "Aneurysmal subarachnoid haemorrhage", pathway: "DBD" },
  { value: "Traumatic brain injury – road traffic collision", pathway: "DBD" },
  { value: "Traumatic brain injury – fall from height", pathway: "DBD" },
  { value: "Traumatic brain injury – assault", pathway: "DBD" },
  { value: "Hypoxic-ischaemic brain injury after cardiac arrest", pathway: "DBD" },
  { value: "Hypoxic brain injury after hanging", pathway: "DBD" },
  { value: "Hypoxic brain injury after drowning", pathway: "DBD" },
  { value: "Acute ischaemic stroke with malignant cerebral oedema", pathway: "DBD" },
  { value: "Cerebral venous sinus thrombosis", pathway: "DBD" },
  { value: "Primary brain tumour – non-metastatic", pathway: "DBD" },
  { value: "Withdrawal of life-sustaining treatment – non-survivable brain injury", pathway: "DCD" },
  { value: "Withdrawal of life-sustaining treatment – end-stage respiratory failure", pathway: "DCD" },
  { value: "Withdrawal of life-sustaining treatment – high cervical spinal cord injury", pathway: "DCD" },
];

export const PATHWAY_LABELS: Record<DonationPathway, string> = {
  DBD: "DBD – donation after brainstem death",
  DCD: "DCD – donation after circulatory death",
};

export const DCD_NOTE = "DCD is not yet practised in Hong Kong. Recorded for classification only; it is not allocated.";

// Census-style ethnicity groups used in Hong Kong.
export const ETHNICITIES: { value: Ethnicity; label: string }[] = [
  { value: "chinese", label: "Chinese" },
  { value: "filipino", label: "Filipino" },
  { value: "indonesian", label: "Indonesian" },
  { value: "south_asian", label: "South Asian" },
  { value: "other_asian", label: "Other Asian" },
  { value: "white", label: "White" },
  { value: "mixed_other", label: "Mixed or other" },
];

export const OUTCOMES: { value: OutcomeStatus; label: string }[] = [
  { value: "waiting", label: "Active – waiting" },
  { value: "suspended", label: "Suspended – temporarily unfit" },
  { value: "transplanted", label: "Transplanted" },
  { value: "removed_deteriorated", label: "Removed – too unwell" },
  { value: "removed_improved", label: "Removed – condition improved" },
  { value: "died_waiting", label: "Died while waiting" },
];

export function ethnicityLabel(value: Ethnicity): string {
  return ETHNICITIES.find((item) => item.value === value)?.label ?? "Not recorded";
}

export function outcomeLabel(value: OutcomeStatus): string {
  return OUTCOMES.find((item) => item.value === value)?.label ?? value;
}

export function pathwayOf(donor: Pick<Donor, "circulatoryDeath">): DonationPathway {
  return donor.circulatoryDeath ? "DCD" : "DBD";
}

export function causePathway(cause: string): DonationPathway | null {
  return CAUSES_OF_DEATH.find((item) => item.value === cause)?.pathway ?? null;
}
