import { bmi, num, flag } from "@/lib/format";
import { IMPLANT_HOSPITAL } from "@/lib/constants";
import { aboIdentical, virtualCrossmatch } from "@/lib/scoring/abo";
import { blockedResult, factor, tally } from "@/lib/scoring/factors";
import { sharedDonorGates, sharedPairGates } from "@/lib/scoring/gates";
import {
  clamp,
  clusterPoints,
  clusterRank,
  coldTimePoints,
  predictedHeartMass,
  ratio,
  restorePoints,
  waitPoints,
} from "@/lib/scoring/metrics";
import type { Donor, FieldDef, Profile, QualityReport, Recipient, ScoreResult } from "@/lib/types";
import type { OrganModule } from "@/lib/organs/types";

export const heartDonorFields: FieldDef[] = [
  { key: "lvef", label: "LVEF", type: "number", unit: "%", min: 0, max: 100, step: 1 },
  {
    key: "noradrenaline",
    label: "Noradrenaline",
    type: "number",
    unit: "mcg/kg/min",
    min: 0,
    step: 0.01,
    help: "Above 0.2 lowers the quality index. It does not by itself exclude the heart.",
  },
  {
    key: "coronary",
    label: "Coronary findings",
    type: "select",
    options: [
      { value: "none", label: "No significant disease" },
      { value: "mild", label: "Mild disease" },
      { value: "significant_unrepaired", label: "Significant unrepaired disease" },
    ],
  },
  { key: "wallThicknessMm", label: "Septal wall thickness", type: "number", unit: "mm", min: 0, step: 0.1 },
  { key: "downtime", label: "Downtime or CPR", type: "boolean" },
  { key: "smoker", label: "Smoker", type: "boolean" },
  { key: "diabetes", label: "Diabetes", type: "boolean" },
];

export const heartRecipientFields: FieldDef[] = [
  {
    key: "optnStatus",
    label: "OPTN status",
    type: "select",
    options: [
      { value: "1", label: "Status 1 — ECMO or non-dischargeable biventricular support" },
      { value: "2", label: "Status 2 — IABP, total artificial heart, or other high urgency" },
      { value: "3", label: "Status 3 — dischargeable LVAD window or high-dose inotropes" },
      { value: "4", label: "Status 4 — stable LVAD or inotropes without monitoring" },
      { value: "5", label: "Status 5 — combined organ transplant" },
      { value: "6", label: "Status 6 — other active candidate" },
    ],
  },
  { key: "redoSternotomy", label: "Redo sternotomy expected", type: "boolean" },
  { key: "vadExplant", label: "VAD explant expected", type: "boolean" },
];

export const heartDonorDefaults: Profile = {
  lvef: 60,
  noradrenaline: 0,
  coronary: "none",
  wallThicknessMm: 11,
  downtime: false,
  smoker: false,
  diabetes: false,
};

export const heartRecipientDefaults: Profile = {
  optnStatus: "6",
  redoSternotomy: false,
  vadExplant: false,
};

type HeartDonorProfile = {
  lvef: number;
  noradrenaline: number;
  coronary: "none" | "mild" | "significant_unrepaired";
  wallThicknessMm: number;
  downtime: boolean;
  smoker: boolean;
  diabetes: boolean;
};

type HeartRecipientProfile = {
  optnStatus: number;
  redoSternotomy: boolean;
  vadExplant: boolean;
};

const OPTN_POINTS: Record<number, number> = { 1: 28, 2: 24, 3: 16, 4: 10, 5: 14, 6: 4 };

export function readHeartDonor(profile: Profile): HeartDonorProfile {
  const coronary = profile.coronary;
  return {
    lvef: num(profile.lvef),
    noradrenaline: num(profile.noradrenaline),
    coronary: coronary === "mild" || coronary === "significant_unrepaired" ? coronary : "none",
    wallThicknessMm: num(profile.wallThicknessMm, 11),
    downtime: flag(profile.downtime),
    smoker: flag(profile.smoker),
    diabetes: flag(profile.diabetes),
  };
}

export function readHeartRecipient(profile: Profile): HeartRecipientProfile {
  const status = clamp(Math.round(num(profile.optnStatus, 6)), 1, 6);
  return {
    optnStatus: status,
    redoSternotomy: flag(profile.redoSternotomy),
    vadExplant: flag(profile.vadExplant),
  };
}

function deduct(lines: QualityReport["lines"], label: string, detail: string, amount: number) {
  if (amount > 0) lines.push({ label, detail: `${detail} (−${amount})` });
}

export function heartQuality(donor: Donor): QualityReport {
  const profile = readHeartDonor(donor.profile);
  const lines: QualityReport["lines"] = [];
  let value = 100;
  if (donor.age >= 65) {
    value -= 25;
    deduct(lines, "Age", `${donor.age} years`, 25);
  } else if (donor.age >= 55) {
    value -= 15;
    deduct(lines, "Age", `${donor.age} years`, 15);
  } else if (donor.age >= 45) {
    value -= 8;
    deduct(lines, "Age", `${donor.age} years`, 8);
  }
  if (profile.lvef < 50) {
    value -= 30;
    deduct(lines, "LVEF", `${profile.lvef}%`, 30);
  } else if (profile.lvef < 55) {
    value -= 12;
    deduct(lines, "LVEF", `${profile.lvef}%`, 12);
  }
  if (profile.noradrenaline > 0.2) {
    value -= 18;
    deduct(lines, "Noradrenaline", `${profile.noradrenaline} mcg/kg/min`, 18);
  } else if (profile.noradrenaline > 0) {
    value -= 6;
    deduct(lines, "Noradrenaline", `${profile.noradrenaline} mcg/kg/min`, 6);
  }
  if (profile.downtime) {
    value -= 15;
    deduct(lines, "Downtime", "CPR or downtime recorded", 15);
  }
  if (profile.wallThicknessMm > 13) {
    value -= 12;
    deduct(lines, "Wall thickness", `${profile.wallThicknessMm} mm`, 12);
  }
  if (profile.smoker) {
    value -= 8;
    deduct(lines, "Smoking", "Smoker", 8);
  }
  if (profile.diabetes) {
    value -= 8;
    deduct(lines, "Diabetes", "Diabetes recorded", 8);
  }
  if (donor.alcohol === "heavy") {
    value -= 6;
    deduct(lines, "Alcohol", "Heavy use", 6);
  }
  if (donor.highDoseSteroids) {
    value -= 4;
    deduct(lines, "Steroids", "Long-term high-dose steroids", 4);
  }
  if (lines.length === 0) lines.push({ label: "Quality", detail: "No quality deductions." });
  return { value: clamp(value, 0, 100), lines };
}

function projectedSurvival(recipient: Recipient): { points: number; notes: string[] } {
  let points = 12;
  const notes = ["Started at 12."];
  if (recipient.age > 65) {
    points -= 4;
    notes.push(`Age ${recipient.age} −4.`);
  } else if (recipient.age > 55) {
    points -= 2;
    notes.push(`Age ${recipient.age} −2.`);
  }
  const index = bmi(recipient.heightCm, recipient.weightKg);
  if (index < 18 || index > 35) {
    points -= 3;
    notes.push(`BMI ${index} −3.`);
  }
  if (recipient.kidneyDisease) {
    points -= 3;
    notes.push("Kidney disease −3.");
  }
  if (recipient.liverDisease) {
    points -= 3;
    notes.push("Liver disease −3.");
  }
  if (recipient.functionalStatus === "poor") {
    points -= 3;
    notes.push("Poor function −3.");
  } else if (recipient.functionalStatus === "fair") {
    points -= 1;
    notes.push("Fair function −1.");
  }
  points = clamp(points, 0, 12);
  return { points, notes };
}

function poorOutlook(recipient: Recipient, raw: number): boolean {
  return (
    recipient.age > 65 ||
    recipient.functionalStatus === "poor" ||
    (recipient.kidneyDisease && recipient.liverDisease) ||
    raw <= 6
  );
}

export function heartDonorBlock(donor: Donor): string[] {
  const reasons = sharedDonorGates(donor);
  const profile = readHeartDonor(donor.profile);
  if (donor.age >= 70) {
    reasons.push("Donor age is 70 or older. The public Hong Kong heart donor bound is under 70.");
  }
  if (profile.lvef <= 40) {
    reasons.push(`LVEF is ${profile.lvef}%. Hearts at or below 40% are excluded.`);
  }
  if (profile.coronary === "significant_unrepaired") {
    reasons.push("Significant unrepaired coronary disease excludes this heart.");
  }
  if (donor.coldIschaemicHours > 2) {
    reasons.push(
      "Cold ischaemic time is over 2 hours. A heart is transplantable only under 2 hours. Under 1 hour is the gold standard.",
    );
  }
  return reasons;
}

export function evaluateHeart(donor: Donor, recipient: Recipient): ScoreResult {
  const blocked = heartDonorBlock(donor);
  if (blocked.length > 0) return blockedResult(blocked);
  const recipientProfile = readHeartRecipient(recipient.profile);
  const donorMass = predictedHeartMass(donor.sex, donor.age, donor.heightCm, donor.weightKg);
  const recipientMass = predictedHeartMass(recipient.sex, recipient.age, recipient.heightCm, recipient.weightKg);
  const sizeRatio = Math.round(ratio(donorMass, recipientMass) * 100) / 100;
  const reasons = sharedPairGates(donor, recipient);
  if (sizeRatio < 0.6 || sizeRatio > 1.4) {
    reasons.push(
      `Predicted heart mass ratio is ${sizeRatio.toFixed(2)}, outside 0.60–1.40.`,
    );
  }
  if (reasons.length > 0) return blockedResult(reasons, `OPTN status ${recipientProfile.optnStatus}`);

  const identical = aboIdentical(donor.bloodType, recipient.bloodType);
  const crossmatch = virtualCrossmatch(donor, recipient);
  const crossmatchPoints = crossmatch === "uncertain" ? 4 : recipient.cpra >= 80 ? 15 : 10;
  let sizePoints = 3;
  let sizeRule = "Ratio inside 0.60–1.40 but outside 0.70–1.30 scores 3.";
  if (sizeRatio >= 0.8 && sizeRatio <= 1.2) {
    sizePoints = 12;
    sizeRule = "Ratio 0.80–1.20 scores 12.";
  } else if (sizeRatio >= 0.7 && sizeRatio <= 1.3) {
    sizePoints = 7;
    sizeRule = "Ratio 0.70–1.30 scores 7.";
  }

  const urgency = OPTN_POINTS[recipientProfile.optnStatus] ?? 4;
  const survival = projectedSurvival(recipient);
  const quality = heartQuality(donor);
  let survivalPoints = survival.points;
  let steering: string | null = null;
  let steeringRule = "Quality index is between 50 and 69, so no quality steering cap applies.";
  if (quality.value >= 70 && poorOutlook(recipient, survival.points)) {
    const capped = Math.min(survivalPoints, 6);
    if (capped < survivalPoints) {
      steering =
        "High-quality heart: survival points were capped because this patient has a poorer expected outlook.";
    }
    steeringRule = "High-quality organ and poorer expected outlook: cap projected survival at 6.";
    survivalPoints = capped;
  } else if (quality.value >= 70) {
    steeringRule = "High-quality organ and longer expected outlook: full survival points kept.";
  } else if (quality.value < 50 && recipientProfile.optnStatus >= 4) {
    const capped = Math.min(survivalPoints, 4);
    if (capped < survivalPoints) {
      steering = "Marginal heart: survival points were capped so the organ is steered toward an urgent patient.";
    }
    steeringRule = "Marginal organ and OPTN status 4, 5, or 6: cap projected survival at 4.";
    survivalPoints = capped;
  } else if (quality.value < 50 && recipientProfile.optnStatus <= 2) {
    steeringRule = "Marginal organ and OPTN status 1 or 2: no survival cap.";
  } else if (quality.value < 50) {
    steeringRule = "Marginal organ and OPTN status 3: no survival cap.";
  }

  const complex = recipientProfile.redoSternotomy || recipientProfile.vadExplant;
  let cold = coldTimePoints(donor.coldIschaemicHours, 12, 1, 2);
  const coldRule = [
    "Full 12 points under 1 hour, the gold standard. Points fall to 0 at 2 hours. Over 2 hours is not transplantable.",
  ];
  if (donor.perfusionDevice === "ocs") {
    cold = restorePoints(cold, 12, 6);
    coldRule.push("Ex-vivo perfusion can restore up to 6 points inside the 2-hour limit. It does not extend a heart past 2 hours.");
  }
  const place = clusterPoints(donor.cluster, 4, 3, 2);

  const factors = [
    factor(
      "compatibility",
      "abo",
      "ABO",
      donor.bloodType,
      recipient.bloodType,
      identical ? "Identical blood groups score 8." : "Compatible but not identical blood groups score 4.",
      identical ? 8 : 4,
      8,
    ),
    factor(
      "compatibility",
      "crossmatch",
      "Virtual crossmatch",
      donor.hlaAntigens.join(", ") || "Not recorded",
      `cPRA ${recipient.cpra}. Unacceptable: ${recipient.unacceptableAntigens.join(", ") || "none"}`,
      crossmatch === "uncertain"
        ? "HLA typing is incomplete, so the crossmatch is uncertain and scores 4."
        : recipient.cpra >= 80
          ? "Predicted negative crossmatch in a patient with cPRA 80 or higher scores 15."
          : "Predicted negative crossmatch scores 10.",
      crossmatchPoints,
      15,
    ),
    factor(
      "compatibility",
      "size",
      "Predicted heart mass",
      `${Math.round(donorMass)} g`,
      `${Math.round(recipientMass)} g`,
      `Donor/recipient ratio ${sizeRatio.toFixed(2)}. ${sizeRule}`,
      sizePoints,
      12,
    ),
    factor(
      "survival",
      "urgency",
      "OPTN status",
      "Heart donor",
      `Status ${recipientProfile.optnStatus}`,
      "Status 1 = 28, 2 = 24, 3 = 16, 4 = 10, 5 = 14, 6 = 4.",
      urgency,
      28,
    ),
    factor(
      "survival",
      "survival",
      "Projected survival",
      `Quality index ${quality.value}`,
      `${recipient.age} years, BMI ${bmi(recipient.heightCm, recipient.weightKg)}, function ${recipient.functionalStatus}`,
      `${survival.notes.join(" ")} Raw ${survival.points}. ${steeringRule}`,
      survivalPoints,
      12,
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
      12,
    ),
    factor(
      "logistics",
      "place",
      "Distance to Queen Mary",
      donor.cluster,
      recipient.cluster,
      "Hong Kong West scores 4, other Hong Kong Island or Kowloon scores 3, New Territories scores 2. Points follow the donor hospital.",
      place,
      4,
    ),
    factor(
      "logistics",
      "operative",
      "Expected operative time",
      `${donor.expectedOperativeHours} h expected retrieval to implant`,
      complex ? "Redo sternotomy or VAD explant" : "Straightforward implant",
      complex ? "Redo sternotomy or VAD explant scores 1." : "A straightforward implant scores 4.",
      complex ? 1 : 4,
      4,
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
    urgencyPoints: urgency,
    daysWaiting: recipient.daysWaiting,
    clusterRank: clusterRank(recipient.cluster),
    qualityIndex: quality.value,
    urgencyLabel: `OPTN status ${recipientProfile.optnStatus}`,
  };
}

function clock(hours: number): "ok" | "soon" | "late" {
  if (hours < 1) return "ok";
  if (hours <= 2) return "soon";
  return "late";
}

export const heartModule: OrganModule = {
  id: "heart",
  label: "Heart",
  donorFields: heartDonorFields,
  recipientFields: heartRecipientFields,
  donorDefaults: heartDonorDefaults,
  recipientDefaults: heartRecipientDefaults,
  donorBlock: heartDonorBlock,
  evaluate: evaluateHeart,
  quality: heartQuality,
  clock,
  clockLabel: "Under 2 hours to transplant, gold standard under 1 hour",
  summariseDonor(donor) {
    const profile = readHeartDonor(donor.profile);
    return [
      { label: "LVEF", value: `${profile.lvef}%` },
      { label: "Noradrenaline", value: `${profile.noradrenaline} mcg/kg/min` },
      { label: "Coronary findings", value: profile.coronary.replaceAll("_", " ") },
      { label: "Wall thickness", value: `${profile.wallThicknessMm} mm` },
      { label: "Downtime or CPR", value: profile.downtime ? "Yes" : "No" },
      { label: "Smoker", value: profile.smoker ? "Yes" : "No" },
      { label: "Diabetes", value: profile.diabetes ? "Yes" : "No" },
    ];
  },
  summariseRecipient(recipient) {
    const profile = readHeartRecipient(recipient.profile);
    return [
      { label: "OPTN status", value: String(profile.optnStatus) },
      { label: "Redo sternotomy", value: profile.redoSternotomy ? "Yes" : "No" },
      { label: "VAD explant", value: profile.vadExplant ? "Yes" : "No" },
    ];
  },
};
