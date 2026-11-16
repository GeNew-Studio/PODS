import { demoSignature, donorDocuments } from "@/lib/documents";
import { round1 } from "@/lib/format";
import { sampleDonors, sampleRecipients } from "@/lib/seed";
import type {
  AlcoholUse,
  BloodType,
  CancerStatus,
  ClinicalDocument,
  Cluster,
  DecisionStatus,
  Donor,
  DonorStatus,
  FunctionalStatus,
  MatchRecord,
  OrganId,
  PerfusionDevice,
  Profile,
  RankedRow,
  Recipient,
} from "@/lib/types";

// Browser storage for the static (GitHub Pages) build. Each visitor gets their own
// copy of the sample data in localStorage. Signed copies live in IndexedDB.

type Store = {
  donors: Record<string, Donor>;
  recipients: Record<string, Recipient>;
  matches: Record<string, MatchRecord>;
  documents: Record<string, ClinicalDocument>;
};

const STORAGE_KEY = "pods:data:v1";
export const CHANGE_EVENT = "pods-change";

let memory: Store | null = null;

function emptyStore(): Store {
  return { donors: {}, recipients: {}, matches: {}, documents: {} };
}

function sampleStore(): Store {
  const store = emptyStore();
  for (const item of sampleDonors()) store.donors[item.id] = item;
  for (const item of sampleRecipients()) store.recipients[item.id] = item;
  ensureDonorDocuments(store);
  return store;
}

function ensureDonorDocuments(store: Store) {
  const createdAt = "2026-10-08T02:00:00.000Z";
  for (const donor of Object.values(store.donors)) {
    for (const document of donorDocuments(normalizeDonor(donor), createdAt)) {
      if (!store.documents[document.id]) store.documents[document.id] = document;
    }
  }
}

function load(): Store {
  if (memory) return memory;
  let store: Store | null = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) store = { ...emptyStore(), ...(JSON.parse(raw) as Partial<Store>) };
  } catch {
    store = null;
  }
  if (!store || Object.keys(store.donors).length === 0) store = sampleStore();
  else if (Object.keys(store.documents).length === 0) ensureDonorDocuments(store);
  memory = store;
  persist(false);
  return store;
}

function persist(notify = true) {
  if (!memory) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Storage can be full or blocked (private mode). Data stays in memory for this tab.
  }
  if (notify) window.dispatchEvent(new Event(CHANGE_EVENT));
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    memory = null;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeDonor(donor: Donor): Donor {
  const status = donor.status === "accepted" ? "accepted" : "offered";
  return { ...donor, status };
}

function normalizeRow(row: RankedRow): RankedRow {
  return { ...row, mismatch: row.mismatch ?? round1(100 - row.score) };
}

function normalizeMatch(match: MatchRecord): MatchRecord {
  const eligible = (match.eligible?.length ? match.eligible : match.top).map(normalizeRow);
  return { ...match, eligible, top: eligible.slice(0, 3) };
}

export async function listDonors(): Promise<Donor[]> {
  return Object.values(load().donors)
    .map((item) => normalizeDonor(clone(item)))
    .sort((a, b) => a.organ.localeCompare(b.organ) || a.name.localeCompare(b.name));
}

export async function getDonor(id: string): Promise<Donor | null> {
  const item = load().donors[id];
  return item ? normalizeDonor(clone(item)) : null;
}

export async function listRecipients(organ?: OrganId): Promise<Recipient[]> {
  return Object.values(load().recipients)
    .map((item) => clone(item))
    .filter((item) => (organ ? item.organ === organ : true))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRecipient(id: string): Promise<Recipient | null> {
  const item = load().recipients[id];
  return item ? clone(item) : null;
}

export async function saveDonor(donor: Donor): Promise<void> {
  const store = load();
  store.donors[donor.id] = clone(donor);
  for (const document of donorDocuments(donor, new Date().toISOString())) {
    if (!store.documents[document.id]) store.documents[document.id] = document;
  }
  persist();
}

export async function saveRecipient(recipient: Recipient): Promise<void> {
  load().recipients[recipient.id] = clone(recipient);
  persist();
}

export async function listMatches(): Promise<MatchRecord[]> {
  return Object.values(load().matches)
    .map((item) => normalizeMatch(clone(item)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getMatch(id: string): Promise<MatchRecord | null> {
  const item = load().matches[id];
  return item ? normalizeMatch(clone(item)) : null;
}

export async function saveMatch(match: MatchRecord): Promise<void> {
  load().matches[match.id] = clone(match);
  persist();
}

export async function restoreSample(): Promise<void> {
  memory = sampleStore();
  await clearFiles();
  persist();
}

export async function listDocuments(): Promise<ClinicalDocument[]> {
  return Object.values(load().documents)
    .map((item) => clone(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title));
}

export async function listDonorDocuments(donorId: string): Promise<ClinicalDocument[]> {
  const documents = await listDocuments();
  return documents.filter((item) => item.donorId === donorId && item.kind !== "recipient_consent");
}

export async function getDocument(id: string): Promise<ClinicalDocument | null> {
  const item = load().documents[id];
  return item ? clone(item) : null;
}

export async function saveDocument(document: ClinicalDocument): Promise<void> {
  load().documents[document.id] = clone(document);
  persist();
}

export async function findRecipientConsent(matchId: string, recipientId: string): Promise<ClinicalDocument | null> {
  const documents = await listDocuments();
  return (
    documents.find(
      (item) => item.kind === "recipient_consent" && item.matchId === matchId && item.recipientId === recipientId,
    ) ?? null
  );
}

// Signed copies can be too large for localStorage, so they are kept in IndexedDB.

const FILE_DB = "pods-files";
const FILE_STORE = "files";

function openFiles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(FILE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(FILE_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function fileRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openFiles();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(FILE_STORE, mode).objectStore(FILE_STORE));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveFile(storedName: string, file: Blob): Promise<void> {
  await fileRequest<IDBValidKey>("readwrite", (store) => store.put(file, storedName));
}

export async function getFile(storedName: string): Promise<Blob | null> {
  try {
    const stored = await fileRequest<Blob | undefined>("readonly", (store) => store.get(storedName));
    if (stored) return stored;
  } catch {
    // Fall through to the built-in demo copies.
  }
  return demoSignature(storedName);
}

async function clearFiles(): Promise<void> {
  try {
    await fileRequest<undefined>("readwrite", (store) => store.clear());
  } catch {
    // Nothing to clear.
  }
}

export function asOrgan(value: string): OrganId {
  if (value === "heart" || value === "lung") return value;
  throw new Error("Organ must be heart or lung.");
}

export function asBlood(value: string): BloodType {
  if (value === "O" || value === "A" || value === "B" || value === "AB") return value;
  throw new Error("Blood group is not valid.");
}

export function asCluster(value: string): Cluster {
  const clusters: Cluster[] = [
    "Hong Kong West",
    "Hong Kong East",
    "Kowloon Central",
    "Kowloon East",
    "Kowloon West",
    "New Territories East",
    "New Territories West",
  ];
  if (clusters.includes(value as Cluster)) return value as Cluster;
  throw new Error("Hospital cluster is not valid.");
}

export function asAlcohol(value: string): AlcoholUse {
  if (value === "none" || value === "social" || value === "heavy") return value;
  throw new Error("Alcohol history is not valid.");
}

export function asPerfusion(value: string): PerfusionDevice {
  if (value === "none" || value === "ocs" || value === "evlp" || value === "organox" || value === "hmp") return value;
  throw new Error("Perfusion device is not valid.");
}

export function asCancer(value: string): CancerStatus {
  if (value === "none" || value === "remission" || value === "active") return value;
  throw new Error("Cancer status is not valid.");
}

export function asFunction(value: string): FunctionalStatus {
  if (value === "good" || value === "fair" || value === "poor") return value;
  throw new Error("Functional status is not valid.");
}

export function asDecision(value: string): DecisionStatus {
  if (value === "offered" || value === "accepted" || value === "declined") return value;
  throw new Error("Decision is not valid.");
}

export function asDonorStatus(value: string): DonorStatus {
  if (value === "accepted") return "accepted";
  return "offered";
}

export function asProfile(value: unknown): Profile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Profile;
}
