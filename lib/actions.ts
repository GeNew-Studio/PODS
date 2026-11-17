// Client-side actions for the static build. Each one returns the page to open next.

import { MEDICINES, pathwayOf } from "@/lib/constants";
import { findHospital } from "@/lib/hospitals";
import {
  asAlcohol,
  asBlood,
  asCancer,
  asCluster,
  asDecision,
  asEthnicity,
  asFunction,
  asOrgan,
  asOutcome,
  asPerfusion,
  findRecipientConsent,
  getDocument,
  getDonor,
  getMatch,
  getRecipient,
  listRecipients,
  restoreSample,
  saveDocument,
  saveDonor as writeDonor,
  saveFile,
  saveMatch,
  saveRecipient as writeRecipient,
} from "@/lib/db";
import { antigenList, round1 } from "@/lib/format";
import { getOrgan, isOrganId } from "@/lib/organs/registry";
import { matchCanStart } from "@/lib/scoring/gates";
import type {
  ActionState,
  Donor,
  FieldDef,
  ClinicalDocument,
  MatchRecord,
  Profile,
  RankedRow,
  Recipient,
  ScoreResult,
} from "@/lib/types";

function checked(formData: FormData, name: string): boolean {
  return formData.get(name) === "yes";
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function numberIn(formData: FormData, name: string, label: string, min: number, max: number): number {
  const value = Number(text(formData, name));
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return value;
}

function readProfile(formData: FormData, fields: FieldDef[]): Profile {
  const profile: Profile = {};
  for (const field of fields) {
    const raw = formData.get(`p_${field.key}`);
    if (field.type === "boolean") profile[field.key] = raw === "yes";
    else if (field.type === "number") profile[field.key] = raw == null || raw === "" ? 0 : Number(raw);
    else profile[field.key] = String(raw ?? "");
  }
  return profile;
}

export async function saveDonor(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const organ = asOrgan(text(formData, "organ"));
    const organModule = getOrgan(organ);
    const id = text(formData, "id") || crypto.randomUUID();
    const existing = text(formData, "id") ? await getDonor(id) : null;
    const hospital = text(formData, "hospital");
    const knownHospital = findHospital(hospital);
    const causeChoice = text(formData, "causeOfDeath");
    const causeOfDeath = causeChoice === "other" ? text(formData, "causeOfDeathOther") : causeChoice;
    const donor: Donor = {
      id,
      organ,
      name: text(formData, "name"),
      sex: text(formData, "sex") === "female" ? "female" : "male",
      ethnicity: asEthnicity(text(formData, "ethnicity")),
      age: numberIn(formData, "age", "Age", 0, 110),
      heightCm: numberIn(formData, "heightCm", "Height", 80, 230),
      weightKg: numberIn(formData, "weightKg", "Weight", 20, 250),
      bloodType: asBlood(text(formData, "bloodType")),
      hlaAntigens: antigenList(text(formData, "hla")),
      hlaComplete: checked(formData, "hlaComplete"),
      causeOfDeath,
      lymphNodeMetastasis: checked(formData, "lymphNodeMetastasis"),
      medicines: formData.getAll("medicines").map(String).filter((item) => MEDICINES.includes(item)),
      alcohol: asAlcohol(text(formData, "alcohol")),
      hospital,
      cluster: knownHospital?.cluster ?? asCluster(text(formData, "cluster")),
      coldIschaemicHours: numberIn(formData, "coldIschaemicHours", "Cold ischaemic time", 0, 48),
      warmIschaemicMinutes: numberIn(formData, "warmIschaemicMinutes", "Warm ischaemic time", 0, 300),
      perfusionDevice: asPerfusion(text(formData, "perfusionDevice")),
      expectedOperativeHours: numberIn(formData, "expectedOperativeHours", "Expected operative time", 0, 24),
      brainDead: checked(formData, "brainDead"),
      familyConsent: checked(formData, "familyConsent"),
      circulatoryDeath: text(formData, "pathway") === "DCD",
      hiv: checked(formData, "hiv"),
      cjd: checked(formData, "cjd"),
      uncontrolledSepsis: checked(formData, "uncontrolledSepsis"),
      metastaticCancer: checked(formData, "metastaticCancer"),
      melanomaHistory: checked(formData, "melanomaHistory"),
      choriocarcinomaHistory: checked(formData, "choriocarcinomaHistory"),
      primaryBrainTumour: checked(formData, "primaryBrainTumour"),
      hepatitisCarrier: checked(formData, "hepatitisCarrier"),
      highDoseSteroids: checked(formData, "highDoseSteroids"),
      profile: readProfile(formData, organModule.donorFields),
      status: existing?.status ?? "offered",
    };
    if (!donor.name) return { error: "Name is required." };
    if (!donor.hospital) return { error: "Donor hospital is required." };
    if (!donor.causeOfDeath) return { error: "Cause of death is required. Choose one, or choose Other and describe it." };
    await writeDonor(donor);
    return { redirectTo: `/donors/view?id=${donor.id}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the donor." };
  }
}

export async function saveRecipient(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const organ = asOrgan(text(formData, "organ"));
    const organModule = getOrgan(organ);
    const id = text(formData, "id") || crypto.randomUUID();
    const recipient: Recipient = {
      id,
      organ,
      name: text(formData, "name"),
      sex: text(formData, "sex") === "female" ? "female" : "male",
      ethnicity: asEthnicity(text(formData, "ethnicity")),
      age: numberIn(formData, "age", "Age", 0, 110),
      heightCm: numberIn(formData, "heightCm", "Height", 80, 230),
      weightKg: numberIn(formData, "weightKg", "Weight", 20, 250),
      bloodType: asBlood(text(formData, "bloodType")),
      hlaAntigens: antigenList(text(formData, "hla")),
      unacceptableAntigens: antigenList(text(formData, "unacceptable")),
      hlaComplete: checked(formData, "hlaComplete"),
      cpra: numberIn(formData, "cpra", "cPRA", 0, 100),
      daysWaiting: numberIn(formData, "daysWaiting", "Days waiting", 0, 5000),
      cancerStatus: asCancer(text(formData, "cancerStatus")),
      clinicalBackground: text(formData, "clinicalBackground"),
      kidneyDisease: checked(formData, "kidneyDisease"),
      liverDisease: checked(formData, "liverDisease"),
      functionalStatus: asFunction(text(formData, "functionalStatus")),
      hospital: text(formData, "hospital") || organModule.listingCentre,
      cluster: asCluster(text(formData, "cluster")),
      profile: readProfile(formData, organModule.recipientFields),
      outcome: asOutcome(text(formData, "outcome")),
      active: false,
    };
    recipient.active = recipient.outcome === "waiting";
    if (!recipient.name) return { error: "Name is required." };
    if (!recipient.clinicalBackground) return { error: "Clinical background is required." };
    await writeRecipient(recipient);
    return { redirectTo: "/waitlist" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the patient." };
  }
}

export async function runMatch(formData: FormData): Promise<string> {
  const donorId = text(formData, "donorId");
  const donor = await getDonor(donorId);
  if (!donor) return "/donors";
  const cannot = matchCanStart(donor);
  if (cannot || !isOrganId(donor.organ)) return `/donors/view?id=${donorId}`;
  const organModule = getOrgan(donor.organ);
  const recipients = (await listRecipients(donor.organ)).filter((item) => item.active);
  const quality = organModule.quality(donor);
  const donorBlock = organModule.donorBlock(donor);
  const excluded: MatchRecord["excluded"] = [];
  const ranked: { recipient: Recipient; result: ScoreResult }[] = [];
  if (donorBlock.length === 0) {
    for (const recipient of recipients) {
      const result = organModule.evaluate(donor, recipient);
      if (!result.eligible) {
        excluded.push({ recipientId: recipient.id, recipientName: recipient.name, reasons: result.reasons });
      } else {
        ranked.push({ recipient, result });
      }
    }
    ranked.sort((a, b) => {
      if (a.result.tier !== b.result.tier) return a.result.tier - b.result.tier;
      if (a.result.bgPriority !== b.result.bgPriority) return a.result.bgPriority - b.result.bgPriority;
      if (b.result.sortKey !== a.result.sortKey) return b.result.sortKey - a.result.sortKey;
      if (b.result.score !== a.result.score) return b.result.score - a.result.score;
      if (b.result.urgencyPoints !== a.result.urgencyPoints) return b.result.urgencyPoints - a.result.urgencyPoints;
      if (b.result.daysWaiting !== a.result.daysWaiting) return b.result.daysWaiting - a.result.daysWaiting;
      return b.result.clusterRank - a.result.clusterRank;
    });
  }
  const match: MatchRecord = {
    id: crypto.randomUUID(),
    donorId: donor.id,
    donorName: donor.name,
    organ: donor.organ,
    createdAt: new Date().toISOString(),
    qualityIndex: quality.value,
    qualityLines: quality.lines,
    donorBlock,
    eligible: ranked.map(({ recipient, result }) => toRankedRow(recipient, result)),
    top: ranked.slice(0, 3).map(({ recipient, result }) => toRankedRow(recipient, result)),
    excluded,
    offeredRecipientId: null,
    decisionStatus: null,
    decisionNote: "",
    offeredAt: null,
    decidedAt: null,
  };
  await saveMatch(match);
  return `/matches/view?id=${match.id}`;
}

export async function saveDecision(formData: FormData): Promise<string> {
  const id = text(formData, "matchId");
  const match = await getMatch(id);
  if (!match) return "/history";
  const recipientId = text(formData, "recipientId");
  if (!match.eligible.some((row) => row.recipientId === recipientId)) return `/matches/view?id=${id}`;
  const decision = asDecision(text(formData, "status"));
  const note = text(formData, "note").slice(0, 500);
  if (match.decisionStatus === "accepted" && match.offeredRecipientId) {
    const previous = await getRecipient(match.offeredRecipientId);
    if (previous) await writeRecipient({ ...previous, outcome: "waiting", active: true });
  }
  const donor = await getDonor(match.donorId);
  const now = new Date().toISOString();
  const newOffer = match.offeredRecipientId !== recipientId || !match.offeredAt;
  if (newOffer || decision === "offered") {
    if (newOffer || match.decisionStatus !== "offered") match.offeredAt = now;
    match.decidedAt = null;
  }
  if (decision !== "offered") match.decidedAt = now;
  match.offeredRecipientId = recipientId;
  match.decisionStatus = decision;
  match.decisionNote = note;
  await saveMatch(match);
  if (donor) {
    donor.status = decision === "accepted" ? "accepted" : "offered";
    await writeDonor(donor);
  }
  if (decision === "accepted") {
    const recipient = await getRecipient(recipientId);
    if (recipient) await writeRecipient({ ...recipient, outcome: "transplanted", active: false });
  }
  return `/offers/view?id=${id}&sent=${decision}`;
}

function toRankedRow(recipient: Recipient, result: ScoreResult): RankedRow {
  return {
    recipientId: recipient.id,
    recipientName: recipient.name,
    hospital: recipient.hospital,
    cluster: recipient.cluster,
    bloodType: recipient.bloodType,
    urgencyLabel: result.urgencyLabel,
    score: result.score,
    mismatch: round1(100 - result.score),
    subtotals: result.subtotals,
    factors: result.factors,
    steering: result.steering,
    qualityIndex: result.qualityIndex,
    daysWaiting: result.daysWaiting,
    tierLabel: result.tierLabel,
    sortBasis: result.sortBasis,
  };
}

export async function openConsent(formData: FormData): Promise<string> {
  const matchId = text(formData, "matchId");
  const recipientId = text(formData, "recipientId");
  const match = await getMatch(matchId);
  const recipient = await getRecipient(recipientId);
  const donor = match ? await getDonor(match.donorId) : null;
  if (!match || !recipient || !donor) return "/history";
  const row = match.eligible.find((item) => item.recipientId === recipientId);
  if (!row) return `/matches/view?id=${matchId}`;
  const existing = await findRecipientConsent(matchId, recipientId);
  if (existing) return `/documents/view?id=${existing.id}`;
  const document: ClinicalDocument = {
    id: crypto.randomUUID(),
    kind: "recipient_consent",
    title: `Recipient consent — ${recipient.name}`,
    donorId: donor.id,
    donorName: donor.name,
    organ: donor.organ,
    hospital: donor.hospital,
    causeOfDeath: donor.causeOfDeath,
    donationPathway: pathwayOf(donor),
    donorBlood: donor.bloodType,
    recipientId: recipient.id,
    recipientName: recipient.name,
    recipientBlood: recipient.bloodType,
    matchId,
    score: row.score,
    mismatch: row.mismatch,
    createdAt: new Date().toISOString(),
    signedFileName: null,
    signedStoredName: null,
  };
  await saveDocument(document);
  return `/documents/view?id=${document.id}`;
}

export async function attachSigned(formData: FormData): Promise<string> {
  const id = text(formData, "documentId");
  const document = await getDocument(id);
  if (!document) return "/documents";
  const file = formData.get("signed");
  if (!(file instanceof File) || file.size === 0) return `/documents/view?id=${id}`;
  const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
  if (!allowed.has(file.type)) return `/documents/view?id=${id}`;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "signed-copy";
  const storedName = `${id}-${safeName}`;
  await saveFile(storedName, file);
  document.signedFileName = file.name;
  document.signedStoredName = storedName;
  await saveDocument(document);
  return `/documents/view?id=${id}`;
}

export async function restoreSampleData(): Promise<string> {
  await restoreSample();
  return "/";
}
