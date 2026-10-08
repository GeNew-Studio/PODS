import { bmi, flag, num } from "@/lib/format";
import { IMPLANT_HOSPITAL } from "@/lib/constants";
import { aboIdentical, virtualCrossmatch } from "@/lib/scoring/abo";
import { blockedResult, factor, tally } from "@/lib/scoring/factors";
import { sharedDonorGates, sharedPairGates } from "@/lib/scoring/gates";
import {
  clamp,
  clusterPoints,
  clusterRank,
  coldTimePoints,
  predictedTlc,
  ratio,
  restorePoints,
  waitPoints,
} from "@/lib/scoring/metrics";
import type { Donor, FieldDef, Profile, QualityReport, Recipient, ScoreResult } from "@/lib/types";
import type { OrganModule } from "@/lib/organs/types";

export const lungDonorFields: FieldDef[] = [
  { key: "pfRatio", label: "PaO2/FiO2", type: "number", min: 0, step: 1, help: "Below 200 excludes the donor. 200–249 stays eligible and lowers quality." },
  { key: "packYears", label: "Smoking pack-years", type: "number", min: 0, step: 1 },
  { key: "ventilationHours", label: "Hours ventilated", type: "number", min: 0, step: 1 },
  { key: "chestTrauma", label: "Chest trauma", type: "boolean" },
  {
    key: "secretions",
    label: "Secretions",
    type: "select",
    options: [
      { value: "none", label: "None" },
      { value: "minimal", label: "Minimal" },
      { value: "moderate", label: "Moderate" },
    ],
  },
  { key: "significantLungDisease", label: "Significant lung disease", type: "boolean" },
  {
    key: "graft",
    label: "Lungs available",
    type: "select",
    options: [
      { value: "double", label: "Double lung" },
      { value: "single", label: "Single lung only" },
    ],
  },
  { key: "cmvPositive", label: "CMV positive", type: "boolean" },
];

export const lungRecipientFields: FieldDef[] = [
  {
    key: "support",
    label: "Support",
    type: "select",
    options: [
      { value: "ecmo_vent", label: "ECMO or ventilated in ICU" },
      { value: "high_o2", label: "High oxygen or pulmonary-hypertension crisis" },
      { value: "oxygen", label: "Oxygen dependent" },
      { value: "ambulatory", label: "Ambulatory end-stage" },
    ],
  },
  {
    key: "diagnosis",
    label: "Diagnosis group",
    type: "select",
    options: [
      { value: "ipf", label: "Idiopathic pulmonary fibrosis" },
      { value: "pah", label: "Pulmonary arterial hypertension" },
      { value: "copd", label: "COPD" },
      { value: "other", label: "Other" },
    ],
  },
  {
    key: "graftNeed",
    label: "Graft needed",
    type: "select",
    options: [
      { value: "double", label: "Double lung" },
      { value: "single", label: "Single lung" },
    ],
  },
  { key: "previousChestSurgery", label: "Previous chest surgery", type: "boolean" },
  { key: "smokingAbstinent", label: "Abstinent from smoking", type: "boolean" },
  { key: "cmvPositive", label: "CMV positive", type: "boolean" },
];

export const lungDonorDefaults: Profile = {
  pfRatio: 400,
  packYears: 0,
  ventilationHours: 8,
  chestTrauma: false,
  secretions: "minimal",
  significantLungDisease: false,
  graft: "double",
  cmvPositive: false,
};

export const lungRecipientDefaults: Profile = {
  support: "oxygen",
  diagnosis: "other",
  graftNeed: "double",
  previousChestSurgery: false,
  smokingAbstinent: true,
  cmvPositive: true,
};

type LungDonorProfile = {
  pfRatio: number;
  packYears: number;
  ventilationHours: number;
  chestTrauma: boolean;
  secretions: "none" | "minimal" | "moderate";
  significantLungDisease: boolean;
  graft: "single" | "double";
  cmvPositive: boolean;
};

type LungRecipientProfile = {
  support: "ecmo_vent" | "high_o2" | "oxygen" | "ambulatory";
  diagnosis: "ipf" | "pah" | "copd" | "other";
  graftNeed: "single" | "double";
  previousChestSurgery: boolean;
  smokingAbstinent: boolean;
  cmvPositive: boolean;
};

const SUPPORT_POINTS = { ecmo_vent: 25, high_o2: 18, oxygen: 12, ambulatory: 6 };

export function readLungDonor(profile: Profile): LungDonorProfile {
  const secretions = profile.secretions;
  const graft = profile.graft;
  return {
    pfRatio: num(profile.pfRatio),
    packYears: num(profile.packYears),
    ventilationHours: num(profile.ventilationHours),
    chestTrauma: flag(profile.chestTrauma),
    secretions: secretions === "none" || secretions === "moderate" ? secretions : "minimal",
    significantLungDisease: flag(profile.significantLungDisease),
    graft: graft === "single" ? "single" : "double",
    cmvPositive: flag(profile.cmvPositive),
  };
}

export function readLungRecipient(profile: Profile): LungRecipientProfile {
  const support = profile.support;
  const diagnosis = profile.diagnosis;
  const graftNeed = profile.graftNeed;
  return {
    support:
      support === "ecmo_vent" || support === "high_o2" || support === "ambulatory" ? support : "oxygen",
    diagnosis: diagnosis === "ipf" || diagnosis === "pah" || diagnosis === "copd" ? diagnosis : "other",
    graftNeed: graftNeed === "single" ? "single" : "double",
    previousChestSurgery: flag(profile.previousChestSurgery),
    smokingAbstinent: flag(profile.smokingAbstinent),
    cmvPositive: flag(profile.cmvPositive),
  };
}

function deduct(lines: QualityReport["lines"], label: string, detail: string, amount: number) {
  if (amount > 0) lines.push({ label, detail: `${detail} (−${amount})` });
}

export function lungQuality(donor: Donor): QualityReport {
  const profile = readLungDonor(donor.profile);
  const lines: QualityReport["lines"] = [];
  let value = 100;
  if (profile.pfRatio < 250) {
    value -= 30;
    deduct(lines, "PaO2/FiO2", String(profile.pfRatio), 30);
  } else if (profile.pfRatio < 300) {
    value -= 18;
    deduct(lines, "PaO2/FiO2", String(profile.pfRatio), 18);
  } else if (profile.pfRatio < 350) {
    value -= 8;
    deduct(lines, "PaO2/FiO2", String(profile.pfRatio), 8);
  }
  if (donor.age >= 65) {
    value -= 20;
    deduct(lines, "Age", `${donor.age} years`, 20);
  } else if (donor.age >= 55) {
    value -= 10;
    deduct(lines, "Age", `${donor.age} years`, 10);
  }
  if (profile.packYears > 20) {
    value -= 22;
    deduct(lines, "Pack-years", String(profile.packYears), 22);
  } else if (profile.packYears > 0) {
    value -= 8;
    deduct(lines, "Pack-years", String(profile.packYears), 8);
  }
  if (profile.ventilationHours > 24) {
    value -= 16;
    deduct(lines, "Ventilation", `${profile.ventilationHours} h`, 16);
  }
  if (profile.chestTrauma) {
    value -= 14;
    deduct(lines, "Chest trauma", "Recorded", 14);
  }
  if (profile.secretions === "moderate") {
    value -= 10;
    deduct(lines, "Secretions", "Moderate", 10);
  }
  if (donor.alcohol === "heavy") {
    value -= 4;
    deduct(lines, "Alcohol", "Heavy use", 4);
  }
  if (donor.highDoseSteroids) {
    value -= 10;
    deduct(lines, "Steroids", "Long-term high-dose steroids", 10);
  }
  if (lines.length === 0) lines.push({ label: "Quality", detail: "No quality deductions." });
  return { value: clamp(value, 0, 100), lines };
}

function urgency(profile: LungRecipientProfile): { points: number; rule: string } {
  const base = SUPPORT_POINTS[profile.support];
  let adjustment = 0;
  if (profile.diagnosis === "ipf" || profile.diagnosis === "pah") adjustment = 2;
  if (profile.diagnosis === "copd") adjustment = -2;
  return {
    points: clamp(base + adjustment, 0, 25),
    rule: `Support scores ${base}. Diagnosis adjustment ${adjustment}. Capped at 25. This stands in for waitlist survival in the lung Composite Allocation Score.`,
  };
}

function projectedSurvival(recipient: Recipient, profile: LungRecipientProfile): { points: number; notes: string[] } {
  let points = 20;
  const notes = ["Started at 20."];
  if (recipient.age > 65) {
    points -= 6;
    notes.push(`Age ${recipient.age} −6.`);
  } else if (recipient.age > 55) {
    points -= 3;
    notes.push(`Age ${recipient.age} −3.`);
  }
  const index = bmi(recipient.heightCm, recipient.weightKg);
  if (index < 18 || index > 35) {
    points -= 4;
    notes.push(`BMI ${index} −4.`);
  }
  if (recipient.functionalStatus === "poor") {
    points -= 5;
    notes.push("Poor function −5.");
  } else if (recipient.functionalStatus === "fair") {
    points -= 2;
    notes.push("Fair function −2.");
  }
  if (recipient.kidneyDisease || recipient.liverDisease) {
    points -= 4;
    notes.push("Kidney or liver disease −4.");
  }
  if (profile.previousChestSurgery) {
    points -= 3;
    notes.push("Previous chest surgery −3.");
  }
  if (!profile.smokingAbstinent) {
    points -= 4;
    notes.push("Not abstinent from smoking −4.");
  }
  return { points: clamp(points, 0, 20), notes };
}

function poorOutlook(recipient: Recipient, raw: number): boolean {
  return recipient.age > 65 || recipient.functionalStatus === "poor" || raw <= 10;
}

const SUPPORT_LABEL: Record<LungRecipientProfile["support"], string> = {
  ecmo_vent: "ECMO or ventilator",
  high_o2: "High oxygen",
  oxygen: "Oxygen dependent",
  ambulatory: "Ambulatory",
};

export function lungDonorBlock(donor: Donor): string[] {
  const reasons = sharedDonorGates(donor);
  const profile = readLungDonor(donor.profile);
  if (donor.age >= 70) {
    reasons.push("Donor age is 70 or older. The public Hong Kong lung donor bound is under 70.");
  }
  if (profile.significantLungDisease) reasons.push("Significant lung disease excludes this donor.");
  if (profile.pfRatio < 200) {
    reasons.push(`PaO2/FiO2 is ${profile.pfRatio}, below 200, so the lungs are excluded.`);
  }
  if (donor.coldIschaemicHours > 10 && donor.perfusionDevice !== "evlp") {
    reasons.push("Cold ischaemic time is over 10 hours and ex-vivo lung perfusion is not connected.");
  }
  return reasons;
}

export function evaluateLung(donor: Donor, recipient: Recipient): ScoreResult {
  const blocked = lungDonorBlock(donor);
  if (blocked.length > 0) return blockedResult(blocked);
  const donorProfile = readLungDonor(donor.profile);
  const recipientProfile = readLungRecipient(recipient.profile);
  const donorVolume = predictedTlc(donor.sex, donor.heightCm);
  const recipientVolume = predictedTlc(recipient.sex, recipient.heightCm);
  const sizeRatio = Math.round(ratio(donorVolume, recipientVolume) * 100) / 100;
  const reasons = sharedPairGates(donor, recipient);
  if (recipientProfile.graftNeed === "double" && donorProfile.graft === "single") {
    reasons.push("This recipient needs two lungs and the donor can provide only one.");
  }
  if (sizeRatio < 0.7 || sizeRatio > 1.3) {
    reasons.push(`Predicted lung volume ratio is ${sizeRatio.toFixed(2)}, outside 0.70–1.30.`);
  }
  const urgencyLabel = `${SUPPORT_LABEL[recipientProfile.support]}, ${recipientProfile.diagnosis.toUpperCase()}`;
  if (reasons.length > 0) return blockedResult(reasons, urgencyLabel);

  const identical = aboIdentical(donor.bloodType, recipient.bloodType);
  const crossmatch = virtualCrossmatch(donor, recipient);
  const crossmatchPoints = crossmatch === "uncertain" ? 3 : recipient.cpra >= 80 ? 10 : 8;
  let sizePoints = 6;
  let sizeRule = "Within 30% of predicted lung volume scores 6.";
  if (sizeRatio >= 0.8 && sizeRatio <= 1.2) {
    sizePoints = 12;
    sizeRule = "Within 20% of predicted lung volume scores 12.";
  }
  const cmvSafe = !donorProfile.cmvPositive || recipientProfile.cmvPositive;
  const urgent = urgency(recipientProfile);
  const survival = projectedSurvival(recipient, recipientProfile);
  const quality = lungQuality(donor);
  let survivalPoints = survival.points;
  let steering: string | null = null;
  let steeringRule = "Quality index is between 50 and 69, so no quality steering cap applies.";
  if (quality.value >= 70 && poorOutlook(recipient, survival.points)) {
    const capped = Math.min(survivalPoints, 10);
    if (capped < survivalPoints) {
      steering =
        "High-quality lungs: survival points were capped because this patient has a poorer expected outlook.";
    }
    steeringRule = "High-quality organ and poorer expected outlook: cap projected survival at 10.";
    survivalPoints = capped;
  } else if (quality.value >= 70) {
    steeringRule = "High-quality organ and longer expected outlook: full survival points kept.";
  } else if (quality.value < 50 && recipientProfile.support !== "ecmo_vent") {
    const capped = Math.min(survivalPoints, 6);
    if (capped < survivalPoints) {
      steering =
        "Marginal lungs: survival points were capped so the organ is steered toward a patient on ECMO or a ventilator.";
    }
    steeringRule = "Marginal organ and a lower urgency band: cap projected survival at 6.";
    survivalPoints = capped;
  } else if (quality.value < 50) {
    steeringRule = "Marginal organ and the patient is on ECMO or a ventilator: no survival cap.";
  }

  let cold = coldTimePoints(donor.coldIschaemicHours, 9, 4, 8);
  const coldRule = ["Full 9 points at 4 hours or less, falling to 0 at 8 hours."];
  if (donor.perfusionDevice === "evlp") {
    cold = restorePoints(cold, 9, 5);
    coldRule.push("Ex-vivo lung perfusion restores up to 5 points.");
  }
  const place = clusterPoints(donor.cluster, 3, 2, 1);
  const theatre = (recipientProfile.previousChestSurgery ? 0 : 2) + (donor.perfusionDevice === "evlp" ? 1 : 0);

  const factors = [
    factor(
      "compatibility",
      "abo",
      "ABO",
      donor.bloodType,
      recipient.bloodType,
      identical ? "Identical blood groups score 8." : "Compatible but not identical blood groups score 5.",
      identical ? 8 : 5,
      8,
    ),
    factor(
      "compatibility",
      "crossmatch",
      "Virtual crossmatch",
      donor.hlaAntigens.join(", ") || "Not recorded",
      `cPRA ${recipient.cpra}. Unacceptable: ${recipient.unacceptableAntigens.join(", ") || "none"}`,
      crossmatch === "uncertain"
        ? "HLA typing is incomplete, so the crossmatch is uncertain and scores 3."
        : recipient.cpra >= 80
          ? "Predicted negative crossmatch in a patient with cPRA 80 or higher scores 10."
          : "Predicted negative crossmatch scores 8.",
      crossmatchPoints,
      10,
    ),
    factor(
      "compatibility",
      "size",
      "Predicted lung volume",
      `${donorVolume.toFixed(2)} L`,
      `${recipientVolume.toFixed(2)} L`,
      `Donor/recipient ratio ${sizeRatio.toFixed(2)}. ${sizeRule}`,
      sizePoints,
      12,
    ),
    factor(
      "compatibility",
      "cmv",
      "CMV",
      donorProfile.cmvPositive ? "Positive" : "Negative",
      recipientProfile.cmvPositive ? "Positive" : "Negative",
      cmvSafe
        ? "Donor negative, or recipient already positive, scores 5."
        : "Donor positive into a negative recipient scores 0.",
      cmvSafe ? 5 : 0,
      5,
    ),
    factor(
      "survival",
      "urgency",
      "Medical urgency",
      donorProfile.graft === "double" ? "Double lung" : "Single lung",
      urgencyLabel,
      urgent.rule,
      urgent.points,
      25,
    ),
    factor(
      "survival",
      "survival",
      "Projected five-year survival",
      `Quality index ${quality.value}`,
      `${recipient.age} years, BMI ${bmi(recipient.heightCm, recipient.weightKg)}, function ${recipient.functionalStatus}`,
      `${survival.notes.join(" ")} Raw ${survival.points}. ${steeringRule}`,
      survivalPoints,
      20,
    ),
    factor(
      "survival",
      "wait",
      "Waiting time",
      "Current offer",
      `${recipient.daysWaiting} days`,
      "Linear up to 5 points at 365 days.",
      waitPoints(recipient.daysWaiting, 5),
      5,
    ),
    factor(
      "logistics",
      "cit",
      "Cold ischaemic time",
      `${donor.coldIschaemicHours} h`,
      IMPLANT_HOSPITAL,
      coldRule.join(" "),
      cold,
      9,
    ),
    factor(
      "logistics",
      "place",
      "Distance to Queen Mary",
      donor.cluster,
      recipient.cluster,
      "Hong Kong West scores 3, other Hong Kong Island or Kowloon scores 2, New Territories scores 1. Points follow the donor hospital.",
      place,
      3,
    ),
    factor(
      "logistics",
      "theatre",
      "Theatre and perfusion",
      donor.perfusionDevice === "evlp" ? "EVLP connected" : "No EVLP",
      recipientProfile.previousChestSurgery ? "Previous chest surgery" : "No previous chest surgery",
      "Straightforward theatre scores 2. Previous chest surgery scores 0. EVLP adds 1, to a maximum of 3.",
      theatre,
      3,
    ),
  ];
  const totals = tally(factors);
  return {
    eligible: true,
    reasons: [],
    score: totals.score,
    subtotals: totals,
    factors,
    steering,
    urgencyPoints: urgent.points,
    daysWaiting: recipient.daysWaiting,
    clusterRank: clusterRank(recipient.cluster),
    qualityIndex: quality.value,
    urgencyLabel,
  };
}

function clock(hours: number): "ok" | "soon" | "late" {
  if (hours <= 4) return "ok";
  if (hours <= 8) return "soon";
  return "late";
}

export const lungModule: OrganModule = {
  id: "lung",
  label: "Lung",
  donorFields: lungDonorFields,
  recipientFields: lungRecipientFields,
  donorDefaults: lungDonorDefaults,
  recipientDefaults: lungRecipientDefaults,
  donorBlock: lungDonorBlock,
  evaluate: evaluateLung,
  quality: lungQuality,
  clock,
  clockLabel: "8-hour lung clock",
  summariseDonor(donor) {
    const profile = readLungDonor(donor.profile);
    return [
      { label: "PaO2/FiO2", value: String(profile.pfRatio) },
      { label: "Pack-years", value: String(profile.packYears) },
      { label: "Ventilation", value: `${profile.ventilationHours} h` },
      { label: "Chest trauma", value: profile.chestTrauma ? "Yes" : "No" },
      { label: "Secretions", value: profile.secretions },
      { label: "Significant lung disease", value: profile.significantLungDisease ? "Yes" : "No" },
      { label: "Available graft", value: profile.graft },
      { label: "CMV", value: profile.cmvPositive ? "Positive" : "Negative" },
    ];
  },
  summariseRecipient(recipient) {
    const profile = readLungRecipient(recipient.profile);
    return [
      { label: "Support", value: SUPPORT_LABEL[profile.support] },
      { label: "Diagnosis", value: profile.diagnosis.toUpperCase() },
      { label: "Graft needed", value: profile.graftNeed },
      { label: "Previous chest surgery", value: profile.previousChestSurgery ? "Yes" : "No" },
      { label: "Smoking abstinent", value: profile.smokingAbstinent ? "Yes" : "No" },
      { label: "CMV", value: profile.cmvPositive ? "Positive" : "Negative" },
    ];
  },
};
