import type { BloodType, Cluster, PerfusionDevice } from "@/lib/types";

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
  { value: "organox", label: "OrganOx (stored, not scored for heart or lung)" },
  { value: "hmp", label: "Hypothermic machine perfusion (stored, not scored for heart or lung)" },
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
