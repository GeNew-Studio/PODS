import { bmi, flag, num, round1 } from "@/lib/format";
import { aboCompatible, aboIdentical } from "@/lib/scoring/abo";
import { blockedResult, factor, tally } from "@/lib/scoring/factors";
import { sharedDonorGates } from "@/lib/scoring/gates";
import { clamp, clusterPoints, clusterRank, coldTimePoints, restorePoints, waitPoints } from "@/lib/scoring/metrics";
import type { BloodType, Donor, FieldDef, Profile, QualityReport, Recipient, ScoreResult } from "@/lib/types";
import type { OrganModule } from "@/lib/organs/types";

// Liver module, aligned with NHS Blood and Transplant policy:
//   POL195/21 Liver Transplantation: Selection Criteria and Recipient Registration (effective 31 Jul 2026)
//   POL196/14 Deceased Donor Liver Distribution and Allocation (effective 3 Aug 2026)
// Where the NHS leaves a choice to the transplant centre (for example ranking inside a
// centre offer, or donor acceptance), PODS uses its own score and says so in the rule text.

export const LIVER_CENTRE = "Queen Mary Hospital";

export const LIVER_DIAGNOSES = [
  { value: "hbv_cirrhosis", label: "Hepatitis B cirrhosis" },
  { value: "hcc", label: "Hepatocellular carcinoma" },
  { value: "ald", label: "Alcohol-related liver disease" },
  { value: "masld", label: "MASLD (fatty liver) cirrhosis" },
  { value: "hcv_cirrhosis", label: "Hepatitis C cirrhosis" },
  { value: "alf", label: "Acute liver failure" },
  { value: "aih", label: "Autoimmune hepatitis" },
  { value: "pbc", label: "Primary biliary cholangitis" },
  { value: "psc", label: "Primary sclerosing cholangitis" },
  { value: "biliary_atresia", label: "Biliary atresia" },
  { value: "wilson", label: "Wilson disease" },
  { value: "other", label: "Other" },
];

// POL195 section 3.2 (elective), 3.3 (paediatric), and 3.5.2 (super-urgent categories).
export const LIVER_ROUTES = [
  { value: "SU-1", label: "Super-urgent 1 – paracetamol, pH <7.25 after 24 h and fluids" },
  { value: "SU-2", label: "Super-urgent 2 – paracetamol, INR >6.5, creatinine >300 µmol/L or anuria, grade 3-4 encephalopathy" },
  { value: "SU-3", label: "Super-urgent 3 – paracetamol, lactate >5 on admission and >4 at 24 h with encephalopathy" },
  { value: "SU-4", label: "Super-urgent 4 – paracetamol, two of category 2 plus deterioration" },
  { value: "SU-5", label: "Super-urgent 5 – favourable non-paracetamol (e.g. acute viral hepatitis)" },
  { value: "SU-6", label: "Super-urgent 6 – unfavourable non-paracetamol (e.g. drug reaction, seronegative)" },
  { value: "SU-7", label: "Super-urgent 7 – acute Wilson disease or Budd-Chiari" },
  { value: "SU-8", label: "Super-urgent 8 – hepatic artery thrombosis, days 0-21 after transplant" },
  { value: "SU-9", label: "Super-urgent 9 – early graft dysfunction, days 0-7 after transplant" },
  { value: "SU-10", label: "Super-urgent 10 – total absence of liver function" },
  { value: "SU-11", label: "Super-urgent 11 – live liver donor with liver failure within 4 weeks" },
  { value: "SU-20", label: "Super-urgent 20 – acute liver failure in a child under 2" },
  { value: "CLD", label: "Elective – chronic liver disease (UKELD 49 or more)" },
  { value: "HCC", label: "Elective – hepatocellular carcinoma within UK criteria" },
  { value: "VS", label: "Elective – variant syndrome (e.g. diuretic-resistant ascites, chronic encephalopathy)" },
  { value: "PAED", label: "Elective – paediatric chronic liver disease" },
];

export const liverDonorFields: FieldDef[] = [
  { key: "altPeak", label: "ALT (latest)", type: "number", unit: "U/L", min: 0, step: 1, help: "Split criteria need ALT under 200 U/L (POL196 2.9)." },
  { key: "bilirubinUmol", label: "Bilirubin (latest)", type: "number", unit: "µmol/L", min: 0, step: 1, help: "Split criteria need bilirubin under 30 µmol/L." },
  { key: "astPeak", label: "AST (peak)", type: "number", unit: "U/L", min: 0, step: 1 },
  {
    key: "steatosisPct",
    label: "Macrovesicular steatosis",
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
    help: "For the surgeon's review. NHS policy sets no cut-off; acceptance is the surgeon's decision.",
  },
  { key: "sodiumPeak", label: "Serum sodium (peak)", type: "number", unit: "mmol/L", min: 100, max: 200, step: 1 },
  { key: "icuDays", label: "Days in ICU", type: "number", min: 0, step: 1 },
  { key: "cardiacArrest", label: "Cardiac arrest or CPR", type: "boolean" },
  { key: "diabetes", label: "Diabetes", type: "boolean", help: "A donor input to the NHS Transplant Benefit Score." },
  { key: "aGst", label: "Alpha-GST", type: "number", unit: "µg/L", min: 0, step: 0.1, help: "Liver injury biomarker. Recorded for model training." },
  { key: "ldh", label: "LDH", type: "number", unit: "U/L", min: 0, step: 1, help: "Ischaemia-reperfusion marker. Recorded for model training." },
];

export const liverRecipientFields: FieldDef[] = [
  { key: "diagnosis", label: "Primary diagnosis", type: "select", options: LIVER_DIAGNOSES },
  {
    key: "route",
    label: "NHS listing route",
    type: "select",
    options: LIVER_ROUTES,
    help: "NHSBT POL195. Super-urgent categories are offered first.",
  },
  { key: "bilirubinUmol", label: "Bilirubin", type: "number", unit: "µmol/L", min: 0, step: 1 },
  { key: "inr", label: "INR", type: "number", min: 0.5, max: 15, step: 0.1 },
  { key: "creatinineUmol", label: "Creatinine", type: "number", unit: "µmol/L", min: 0, step: 1 },
  { key: "sodium", label: "Sodium", type: "number", unit: "mmol/L", min: 100, max: 170, step: 1 },
  { key: "albuminGL", label: "Albumin", type: "number", unit: "g/L", min: 5, max: 60, step: 1 },
  { key: "dialysis", label: "On renal support", type: "boolean" },
  { key: "ascites", label: "Ascites present", type: "boolean" },
  { key: "inpatient", label: "Inpatient", type: "boolean" },
  { key: "tumourCount", label: "HCC: number of tumours", type: "number", min: 0, max: 20, step: 1 },
  { key: "maxTumourCm", label: "HCC: largest tumour", type: "number", unit: "cm", min: 0, max: 30, step: 0.1 },
  { key: "afp", label: "HCC: maximum AFP", type: "number", unit: "iu/mL", min: 0, step: 1, help: "AFP over 1,000 is an absolute contraindication (POL195 3.2.1)." },
  { key: "hbsAgPositive", label: "HBsAg positive", type: "boolean" },
  { key: "previousAbdominalSurgery", label: "Previous upper abdominal surgery", type: "boolean" },
];

export const liverDonorDefaults: Profile = {
  altPeak: 50,
  bilirubinUmol: 12,
  astPeak: 60,
  steatosisPct: 5,
  sodiumPeak: 145,
  icuDays: 2,
  cardiacArrest: false,
  diabetes: false,
  aGst: 0,
  ldh: 0,
};

export const liverRecipientDefaults: Profile = {
  diagnosis: "hbv_cirrhosis",
  route: "CLD",
  bilirubinUmol: 50,
  inr: 1.5,
  creatinineUmol: 90,
  sodium: 136,
  albuminGL: 32,
  dialysis: false,
  ascites: false,
  inpatient: false,
  tumourCount: 0,
  maxTumourCm: 0,
  afp: 0,
  hbsAgPositive: false,
  previousAbdominalSurgery: false,
};

type LiverDonorProfile = {
  altPeak: number;
  bilirubinUmol: number;
  astPeak: number;
  steatosisPct: number;
  sodiumPeak: number;
  icuDays: number;
  cardiacArrest: boolean;
  diabetes: boolean;
};

type LiverRecipientProfile = {
  diagnosis: string;
  route: string;
  superUrgent: boolean;
  bilirubinUmol: number;
  inr: number;
  creatinineUmol: number;
  sodium: number;
  albuminGL: number;
  dialysis: boolean;
  ascites: boolean;
  inpatient: boolean;
  tumourCount: number;
  maxTumourCm: number;
  afp: number;
  hbsAgPositive: boolean;
  previousAbdominalSurgery: boolean;
};

export function readLiverDonor(profile: Profile): LiverDonorProfile {
  return {
    altPeak: num(profile.altPeak),
    bilirubinUmol: num(profile.bilirubinUmol, 12),
    astPeak: num(profile.astPeak),
    steatosisPct: num(profile.steatosisPct),
    sodiumPeak: num(profile.sodiumPeak, 145),
    icuDays: num(profile.icuDays),
    cardiacArrest: flag(profile.cardiacArrest),
    diabetes: flag(profile.diabetes),
  };
}

export function readLiverRecipient(profile: Profile): LiverRecipientProfile {
  let route = String(profile.route ?? "");
  if (!LIVER_ROUTES.some((item) => item.value === route)) {
    // Earlier records used a single acute liver failure flag.
    route = flag(profile.acuteLiverFailure) ? "SU-5" : String(profile.diagnosis) === "hcc" ? "HCC" : "CLD";
  }
  return {
    diagnosis: String(profile.diagnosis ?? "other"),
    route,
    superUrgent: route.startsWith("SU"),
    bilirubinUmol: num(profile.bilirubinUmol, 17),
    inr: num(profile.inr, 1),
    creatinineUmol: num(profile.creatinineUmol, 88),
    sodium: num(profile.sodium, 137),
    albuminGL: num(profile.albuminGL, 35),
    dialysis: flag(profile.dialysis),
    ascites: flag(profile.ascites),
    inpatient: flag(profile.inpatient),
    tumourCount: num(profile.tumourCount),
    maxTumourCm: num(profile.maxTumourCm),
    afp: num(profile.afp),
    hbsAgPositive: flag(profile.hbsAgPositive),
    previousAbdominalSurgery: flag(profile.previousAbdominalSurgery),
  };
}

// UKELD (Barber et al., Transplantation 2011), the score POL195 3.2.1 uses for elective
// listing. Inputs in µmol/L and mmol/L. Listing needs 49 or more (1-year mortality over 9%).
// Bounds as published: values below 1.0 set to 1.0, creatinine capped at 400 µmol/L,
// sodium kept between 112 and 150 mmol/L.
export function ukeld(p: LiverRecipientProfile): number {
  const inr = Math.max(p.inr, 1);
  const creatinine = clamp(p.creatinineUmol, 1, 400);
  const bilirubin = Math.max(p.bilirubinUmol, 1);
  const sodium = clamp(p.sodium, 112, 150);
  const score = 5.395 * Math.log(inr) + 1.485 * Math.log(creatinine) + 3.13 * Math.log(bilirubin) - 81.565 * Math.log(sodium) + 435;
  return Math.round(score);
}

// MELD 3.0 (Kim et al., 2021). The US score Chloe's OPTN list names. Shown for comparison only.
export function meld3(sex: Recipient["sex"], p: LiverRecipientProfile): number {
  const bili = Math.max(p.bilirubinUmol / 17.1, 1);
  const inr = Math.max(p.inr, 1);
  const cr = p.dialysis ? 3 : clamp(p.creatinineUmol / 88.4, 1, 3);
  const na = clamp(p.sodium, 125, 137);
  const alb = clamp(p.albuminGL / 10, 1.5, 3.5);
  const lnBili = Math.log(bili);
  const lnCr = Math.log(cr);
  const score =
    1.33 * (sex === "female" ? 1 : 0) +
    4.56 * lnBili +
    0.82 * (137 - na) -
    0.24 * (137 - na) * lnBili +
    9.09 * Math.log(inr) +
    11.14 * lnCr +
    1.85 * (3.5 - alb) -
    1.83 * (3.5 - alb) * lnCr +
    6;
  return clamp(Math.round(score), 6, 40);
}

// POL196 2.1: an adult donor is 16 or over and over 40 kg.
export function isPaediatricLiverDonor(donor: Donor): boolean {
  return donor.age < 16 || donor.weightKg <= 40;
}

// POL196 2.1: paediatric recipient is 16 or under; adult is 17 or over. Small adults
// (17+, 40 kg or less) and large paediatrics (16 or under, 40 kg or more) can be dual listed.
export type LiverPatientCategory = "paediatric" | "large_paediatric" | "small_adult" | "adult";

export function liverPatientCategory(recipient: Recipient): LiverPatientCategory {
  if (recipient.age <= 16) return recipient.weightKg >= 40 ? "large_paediatric" : "paediatric";
  return recipient.weightKg <= 40 ? "small_adult" : "adult";
}

// POL196 2.9.1: a DBD donor meets split criteria if age under 45, weight under 90 kg or BMI
// under 30, latest ALT under 200 U/L, and latest bilirubin under 30 µmol/L.
export function splitCriteria(donor: Donor): { met: boolean; lines: string[] } {
  const p = readLiverDonor(donor.profile);
  const index = bmi(donor.heightCm, donor.weightKg);
  const checks = [
    { ok: !donor.circulatoryDeath, text: "DBD donor" },
    { ok: donor.age < 45, text: `Age ${donor.age} (under 45)` },
    { ok: donor.weightKg < 90 || index < 30, text: `Weight ${donor.weightKg} kg or BMI ${index} (under 90 kg or BMI under 30)` },
    { ok: p.altPeak < 200, text: `ALT ${p.altPeak} U/L (under 200)` },
    { ok: p.bilirubinUmol < 30, text: `Bilirubin ${p.bilirubinUmol} µmol/L (under 30)` },
  ];
  return { met: checks.every((item) => item.ok), lines: checks.map((item) => `${item.ok ? "Yes" : "No"}: ${item.text}`) };
}

// POL196 2.6: O livers go to O, then B or AB, then A. B livers go to B, then AB.
function liverBgPriority(donor: BloodType, recipient: BloodType): number {
  if (donor === "O") return recipient === "O" ? 0 : recipient === "B" || recipient === "AB" ? 1 : 2;
  if (donor === "B") return recipient === "B" ? 0 : 1;
  return 0;
}

// POL195 3.2.1 HCC listing criteria and 3.9 de-selection.
function hccProblem(p: LiverRecipientProfile): string | null {
  if (p.afp > 1000) return `AFP ${p.afp} iu/mL is over 1,000, an absolute contraindication (POL195 3.2.1).`;
  if (p.tumourCount <= 0) return null;
  if (p.tumourCount > 5) return `${p.tumourCount} tumours is more than the UK limit of 5 (POL195 3.9).`;
  if (p.tumourCount === 1 && p.maxTumourCm > 7) return `Single tumour of ${p.maxTumourCm} cm is over 7 cm (POL195 3.9).`;
  if (p.tumourCount >= 2 && p.maxTumourCm > 3) return `With ${p.tumourCount} tumours, each must be 3 cm or less; largest is ${p.maxTumourCm} cm (POL195 3.2.1).`;
  return null;
}

type Tier = { tier: number; label: string; sortBasis: "waiting" | "score" };

function deduct(lines: QualityReport["lines"], label: string, detail: string, amount: number) {
  if (amount > 0) lines.push({ label, detail: `${detail} (−${amount})` });
}

// PODS quality index. NHS policy (POL196 2.4.3 and 4.4.2) leaves donor acceptance to the
// surgeon and lists the factors to weigh, but gives no cut-offs. These deductions are a
// PODS heuristic for the demo, not NHS thresholds.
export function liverQuality(donor: Donor): QualityReport {
  const p = readLiverDonor(donor.profile);
  const lines: QualityReport["lines"] = [];
  let value = 100;
  const take = (label: string, detail: string, amount: number) => {
    value -= amount;
    deduct(lines, label, detail, amount);
  };
  if (donor.age >= 70) take("Age", `${donor.age} years`, 20);
  else if (donor.age >= 60) take("Age", `${donor.age} years`, 12);
  else if (donor.age >= 50) take("Age", `${donor.age} years`, 5);
  if (p.steatosisPct >= 30) take("Steatosis", `${p.steatosisPct}% macrovesicular`, 25);
  else if (p.steatosisPct >= 15) take("Steatosis", `${p.steatosisPct}% macrovesicular`, 10);
  const transaminase = Math.max(p.astPeak, p.altPeak);
  if (transaminase > 1000) take("Transaminases", `Peak ${transaminase} U/L`, 15);
  else if (transaminase > 500) take("Transaminases", `Peak ${transaminase} U/L`, 8);
  else if (transaminase > 150) take("Transaminases", `Peak ${transaminase} U/L`, 3);
  if (p.sodiumPeak > 160) take("Sodium", `Peak ${p.sodiumPeak} mmol/L`, 12);
  else if (p.sodiumPeak > 155) take("Sodium", `Peak ${p.sodiumPeak} mmol/L`, 6);
  if (p.icuDays > 7) take("ICU stay", `${p.icuDays} days`, 8);
  else if (p.icuDays > 4) take("ICU stay", `${p.icuDays} days`, 4);
  if (p.cardiacArrest) take("Cardiac arrest", "CPR recorded", 8);
  if (p.diabetes) take("Diabetes", "Donor diabetes", 4);
  if (donor.alcohol === "heavy") take("Alcohol", "Heavy use", 8);
  if (bmi(donor.heightCm, donor.weightKg) > 35) take("BMI", `BMI ${bmi(donor.heightCm, donor.weightKg)}`, 5);
  if (donor.highDoseSteroids) take("Steroids", "Long-term high-dose steroids", 4);
  if (lines.length === 0) lines.push({ label: "Quality", detail: "No quality deductions." });
  lines.push({ label: "Source", detail: "PODS heuristic for surgeon review. NHS policy sets no donor cut-offs." });
  return { value: clamp(value, 0, 100), lines };
}

// Donor-side blocks. Only the shared safety gates (consent, DBD in Hong Kong, absolute
// contraindications) apply. NHS policy does not exclude livers on age, steatosis, or cold time.
export function liverDonorBlock(donor: Donor): string[] {
  return sharedDonorGates(donor);
}

function projectedSurvival(recipient: Recipient): { points: number; notes: string[] } {
  let points = 10;
  const notes = ["Started at 10."];
  if (recipient.age > 65) {
    points -= 3;
    notes.push(`Age ${recipient.age} −3 (POL195 2.1.6: survival over 65 is significantly worse).`);
  } else if (recipient.age > 55) {
    points -= 1;
    notes.push(`Age ${recipient.age} −1.`);
  }
  const index = bmi(recipient.heightCm, recipient.weightKg);
  if (recipient.age >= 17 && (index < 18 || index > 35)) {
    points -= 2;
    notes.push(`BMI ${index} −2.`);
  }
  if (recipient.kidneyDisease) {
    points -= 2;
    notes.push("Kidney disease −2.");
  }
  if (recipient.functionalStatus === "poor") {
    points -= 3;
    notes.push("Poor function −3.");
  } else if (recipient.functionalStatus === "fair") {
    points -= 1;
    notes.push("Fair function −1.");
  }
  return { points: clamp(points, 0, 10), notes };
}

export function evaluateLiver(donor: Donor, recipient: Recipient): ScoreResult {
  const blocked = liverDonorBlock(donor);
  if (blocked.length > 0) return blockedResult(blocked);
  const r = readLiverRecipient(recipient.profile);
  const category = liverPatientCategory(recipient);
  const paediatricDonor = isPaediatricLiverDonor(donor);
  const split = splitCriteria(donor);
  const score = ukeld(r);
  const weightGap = Math.abs(donor.weightKg - recipient.weightKg);
  const label = urgencyLabel(recipient, r);

  const reasons: string[] = [];
  if (donor.organ !== recipient.organ) reasons.push("Organ does not match.");
  // POL196 3.2.2 and 2.6.6: children under 2 may accept blood group incompatible livers.
  const incompatibleAllowed = recipient.age < 2;
  if (!aboCompatible(donor.bloodType, recipient.bloodType) && !incompatibleAllowed) {
    reasons.push(`ABO incompatible. Donor blood group ${donor.bloodType} cannot go to recipient blood group ${recipient.bloodType}.`);
  }
  if (recipient.cancerStatus === "active") reasons.push("Recipient has active cancer outside the liver.");

  // Which NHS tier this patient sits in for this donor (POL196 4.2 for adult donors, 5.1 for paediatric donors).
  let tier: Tier | null = null;
  if (r.superUrgent) {
    tier = { tier: 1, label: "1 · Super-urgent", sortBasis: "waiting" };
  } else if (category === "paediatric" || category === "small_adult") {
    if (paediatricDonor) {
      tier = { tier: 2, label: "2 · Paediatric donor to paediatric / small adult (centre choice)", sortBasis: "score" };
    } else if (split.met) {
      tier = { tier: 2, label: "2 · Left lateral split to paediatric / small adult (centre choice)", sortBasis: "score" };
    } else if (category === "small_adult" && weightGap <= 20) {
      tier = { tier: 3, label: "3 · Elective named patient (Transplant Benefit Score)", sortBasis: "score" };
    } else {
      reasons.push(
        "Adult donor does not meet NHS split criteria, so it is not offered to paediatric or small adult patients (POL196 2.9 and 4.2).",
      );
    }
  } else {
    // Adult and large paediatric elective patients.
    if (r.route === "CLD" && score < 49) {
      reasons.push(`UKELD ${score} is below 49, the NHS minimum for chronic liver disease (POL195 3.2.1 and 3.9).`);
    }
    if (r.route === "HCC") {
      const problem = hccProblem(r);
      if (problem) reasons.push(problem);
    }
    const band = r.route === "VS" ? 10 : 20;
    if (weightGap > band) {
      reasons.push(
        `Weight differs from the donor by ${round1(weightGap)} kg. NHS offering only includes patients within ±${band} kg of the donor (POL196 4.3).`,
      );
    }
    tier =
      r.route === "VS"
        ? { tier: 4, label: "4 · Elective variant syndrome (by waiting time)", sortBasis: "waiting" }
        : { tier: 3, label: "3 · Elective CLD / HCC (Transplant Benefit Score)", sortBasis: "score" };
  }
  if (reasons.length > 0 || !tier) return blockedResult(reasons, label);

  const identical = aboIdentical(donor.bloodType, recipient.bloodType);
  const bgPriority = liverBgPriority(donor.bloodType, recipient.bloodType);
  let hbvPoints = 8;
  let hbvRule = "Donor is HBsAg negative. Scores 8.";
  if (donor.hepatitisCarrier && r.hbsAgPositive) {
    hbvRule = "HBsAg-positive donor to an HBsAg-positive recipient. Offered through the NHS positive donor virology scheme (POL196 8). Scores 8.";
  } else if (donor.hepatitisCarrier) {
    hbvPoints = 2;
    hbvRule = "HBsAg-positive donor to an HBsAg-negative recipient needs lifelong antiviral prophylaxis. Scores 2 (PODS choice).";
  }

  const usingSplit = tier.tier === 2 && !paediatricDonor;
  let sizePoints = 4;
  let sizeRule = `Weight gap ${round1(weightGap)} kg, inside the NHS ±20 kg band. Under 5 kg scores 12, under 10 kg scores 8, otherwise 4 (PODS bands).`;
  if (usingSplit) {
    sizePoints = 9;
    sizeRule = "Left lateral segment from a donor that meets NHS split criteria. Scores 9.";
  } else if (weightGap < 5) sizePoints = 12;
  else if (weightGap < 10) sizePoints = 8;

  const urgencyPoints = r.superUrgent ? 35 : category === "adult" || category === "large_paediatric" ? round1((35 * clamp(score - 45, 0, 25)) / 25) : 18;
  const urgencyRule = r.superUrgent
    ? "Super-urgent patients are offered first (POL196 3). Full 35 points."
    : category === "adult" || category === "large_paediatric"
      ? `UKELD ${score}. PODS scales UKELD 45 (0 points) to 70 (35 points). The NHS uses the Transplant Benefit Score here, which combines need and utility from 16 recipient and 6 donor factors (POL196 4.3); its coefficients are not in the policy.`
      : "Paediatric and small adult offers are centre choice (POL196 4.4). PODS gives a flat 18 points.";

  const survival = projectedSurvival(recipient);
  const quality = liverQuality(donor);
  let survivalPoints = survival.points;
  let steering: string | null = null;
  let steeringRule = "Quality index is between 50 and 69, so no quality steering cap applies.";
  const poorOutlook = recipient.age > 65 || recipient.functionalStatus === "poor" || survival.points <= 5;
  const lowUrgency = !r.superUrgent && score < 56;
  if (quality.value >= 70 && poorOutlook) {
    const capped = Math.min(survivalPoints, 5);
    if (capped < survivalPoints) steering = "High-quality liver: survival points were capped because this patient has a poorer expected outlook.";
    steeringRule = "High-quality organ and poorer expected outlook: cap projected survival at 5 (PODS rule).";
    survivalPoints = capped;
  } else if (quality.value >= 70) {
    steeringRule = "High-quality organ and longer expected outlook: full survival points kept.";
  } else if (quality.value < 50 && lowUrgency) {
    const capped = Math.min(survivalPoints, 3);
    if (capped < survivalPoints) steering = "Marginal liver: survival points were capped so the organ is steered toward a sicker patient.";
    steeringRule = "Marginal organ and UKELD under 56: cap projected survival at 3 (PODS rule).";
    survivalPoints = capped;
  } else if (quality.value < 50) {
    steeringRule = "Marginal organ and a sicker patient: no survival cap.";
  }

  let cold = coldTimePoints(donor.coldIschaemicHours, 12, 8, 12);
  const coldRule = [
    "PODS assumption: full 12 points up to 8 hours, falling to 0 at 12 hours. NHS policy lists projected cold time as a factor but sets no limit (POL196 4.4.2).",
  ];
  if (donor.perfusionDevice === "organox" || donor.perfusionDevice === "hmp") {
    cold = restorePoints(cold, 12, 6);
    coldRule.push("Liver machine perfusion restores up to 6 points.");
  }
  const place = clusterPoints(donor.cluster, 4, 3, 2);
  const complex = r.previousAbdominalSurgery;

  const factors = [
    factor(
      "compatibility",
      "abo",
      "ABO",
      donor.bloodType,
      recipient.bloodType,
      `${identical ? "Identical blood groups score 10." : aboCompatible(donor.bloodType, recipient.bloodType) ? "Compatible but not identical scores 5." : "Incompatible, allowed for a child under 2. Scores 0."} NHS offer order: ${donor.bloodType === "O" ? "O patients, then B or AB, then A" : donor.bloodType === "B" ? "B patients, then AB" : "compatible patients"} (POL196 2.6).`,
      identical ? 10 : aboCompatible(donor.bloodType, recipient.bloodType) ? 5 : 0,
      10,
    ),
    factor("compatibility", "size", usingSplit ? "Graft size (split)" : "Graft size", `${donor.weightKg} kg`, `${recipient.weightKg} kg`, sizeRule, sizePoints, 12),
    factor(
      "compatibility",
      "hbv",
      "Hepatitis B pairing",
      donor.hepatitisCarrier ? "HBsAg positive" : "HBsAg negative",
      r.hbsAgPositive ? "HBsAg positive" : "HBsAg negative",
      hbvRule,
      hbvPoints,
      8,
    ),
    factor("survival", "urgency", "Medical need", "Liver donor", label, urgencyRule, urgencyPoints, 35),
    factor(
      "survival",
      "survival",
      "Projected survival",
      `Quality index ${quality.value}`,
      `${recipient.age} years, BMI ${bmi(recipient.heightCm, recipient.weightKg)}, function ${recipient.functionalStatus}`,
      `${survival.notes.join(" ")} Raw ${survival.points}. ${steeringRule}`,
      survivalPoints,
      10,
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
    factor("logistics", "cit", "Cold ischaemic time", `${donor.coldIschaemicHours} h`, LIVER_CENTRE, coldRule.join(" "), cold, 12),
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
      complex ? "Previous upper abdominal surgery" : "Straightforward implant",
      complex ? "Previous upper abdominal surgery scores 1 (also a TBS input)." : "A straightforward implant scores 4.",
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
    urgencyPoints,
    daysWaiting: recipient.daysWaiting,
    clusterRank: clusterRank(recipient.cluster),
    qualityIndex: quality.value,
    urgencyLabel: label,
    tier: tier.tier,
    tierLabel: tier.label,
    bgPriority,
    sortKey: tier.sortBasis === "waiting" ? recipient.daysWaiting : totals.score,
    sortBasis: tier.sortBasis,
  };
}

function urgencyLabel(recipient: Recipient, p: LiverRecipientProfile): string {
  if (p.superUrgent) return `Super-urgent cat ${p.route.split("-")[1]}`;
  const category = liverPatientCategory(recipient);
  if (category === "paediatric") return "Paediatric";
  if (p.route === "HCC") return `HCC · UKELD ${ukeld(p)}`;
  if (p.route === "VS") return `Variant syndrome · UKELD ${ukeld(p)}`;
  return `UKELD ${ukeld(p)}`;
}

function clock(hours: number): "ok" | "soon" | "late" {
  if (hours <= 8) return "ok";
  if (hours <= 12) return "soon";
  return "late";
}

function liverDiagnosis(recipient: Recipient): string {
  const value = String(recipient.profile.diagnosis ?? "");
  return LIVER_DIAGNOSES.find((item) => item.value === value)?.label ?? "Not recorded";
}

export const liverModule: OrganModule = {
  id: "liver",
  label: "Liver",
  donorFields: liverDonorFields,
  recipientFields: liverRecipientFields,
  donorDefaults: liverDonorDefaults,
  recipientDefaults: liverRecipientDefaults,
  donorBlock: liverDonorBlock,
  evaluate: evaluateLiver,
  quality: liverQuality,
  clock,
  clockLabel: "PODS guide: under 8 hours preferred (NHS sets no limit)",
  summariseDonor(donor) {
    const p = readLiverDonor(donor.profile);
    const split = splitCriteria(donor);
    return [
      { label: "Donor category", value: isPaediatricLiverDonor(donor) ? "Paediatric (under 16 or 40 kg or less)" : "Adult" },
      { label: "NHS split criteria", value: split.met ? "Met. Left lateral segment offered to children first." : "Not met" },
      { label: "Split checks", value: split.lines.join("; ") },
      { label: "ALT / AST", value: `${p.altPeak} / ${p.astPeak} U/L` },
      { label: "Bilirubin", value: `${p.bilirubinUmol} µmol/L` },
      { label: "Steatosis", value: `${p.steatosisPct}% macrovesicular` },
      { label: "Sodium peak", value: `${p.sodiumPeak} mmol/L` },
      { label: "ICU stay", value: `${p.icuDays} days` },
      { label: "Cardiac arrest", value: p.cardiacArrest ? "Yes" : "No" },
      { label: "Diabetes", value: p.diabetes ? "Yes" : "No" },
      { label: "Alpha-GST", value: donor.profile.aGst ? `${donor.profile.aGst} µg/L` : "Not recorded" },
      { label: "LDH", value: donor.profile.ldh ? `${donor.profile.ldh} U/L` : "Not recorded" },
    ];
  },
  summariseRecipient(recipient) {
    const p = readLiverRecipient(recipient.profile);
    return [
      { label: "Urgency", value: urgencyLabel(recipient, p) },
      { label: "Listing route", value: LIVER_ROUTES.find((item) => item.value === p.route)?.label ?? p.route },
      { label: "Patient category", value: liverPatientCategory(recipient).replace("_", " ") },
      { label: "UKELD", value: `${ukeld(p)} (listing needs 49 or more for chronic liver disease)` },
      { label: "MELD 3.0 (US, comparison only)", value: String(meld3(recipient.sex, p)) },
      { label: "Primary diagnosis", value: liverDiagnosis(recipient) },
      { label: "Bilirubin", value: `${p.bilirubinUmol} µmol/L` },
      { label: "INR", value: String(p.inr) },
      { label: "Creatinine", value: p.dialysis ? `${p.creatinineUmol} µmol/L (on renal support)` : `${p.creatinineUmol} µmol/L` },
      { label: "Sodium", value: `${p.sodium} mmol/L` },
      { label: "HBsAg", value: p.hbsAgPositive ? "Positive" : "Negative" },
    ];
  },
  urgency(recipient) {
    return urgencyLabel(recipient, readLiverRecipient(recipient.profile));
  },
  diagnosis: liverDiagnosis,
  listingCentre: LIVER_CENTRE,
  implantSite: LIVER_CENTRE,
};
