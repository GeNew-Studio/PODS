import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { io } from "next/cache";
import { donorDocuments, writeDemoSignatures } from "@/lib/documents";
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

type Sql = {
  run: (...params: unknown[]) => unknown;
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
  all: (...params: unknown[]) => Record<string, unknown>[];
};

type Sqlite = {
  exec: (sql: string) => void;
  prepare: (sql: string) => Sql;
};

const globalForDb = globalThis as unknown as { podsDb?: Sqlite };

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS donors (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recipients (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );
`;

function database(): Sqlite {
  if (!globalForDb.podsDb) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    globalForDb.podsDb = new DatabaseSync(path.join(dir, "pods.sqlite")) as unknown as Sqlite;
  }
  const db = globalForDb.podsDb;
  db.exec(SCHEMA);
  const donors = Number((db.prepare("SELECT COUNT(*) AS n FROM donors").get() as { n: number }).n);
  const documents = Number((db.prepare("SELECT COUNT(*) AS n FROM documents").get() as { n: number }).n);
  if (donors === 0) insertSample(db);
  else if (documents === 0) ensureDonorDocuments(db);
  return db;
}

function insertSample(db: Sqlite) {
  const insertDonor = db.prepare("INSERT INTO donors (id, payload) VALUES (?, ?)");
  const insertRecipient = db.prepare("INSERT INTO recipients (id, payload) VALUES (?, ?)");
  for (const item of sampleDonors()) insertDonor.run(item.id, JSON.stringify(item));
  for (const item of sampleRecipients()) insertRecipient.run(item.id, JSON.stringify(item));
  ensureDonorDocuments(db);
}

function ensureDonorDocuments(db: Sqlite) {
  const insert = db.prepare(
    `INSERT INTO documents (id, payload) VALUES (?, ?)
     ON CONFLICT(id) DO NOTHING`,
  );
  const createdAt = "2026-10-08T02:00:00.000Z";
  const donors = db.prepare("SELECT payload FROM donors").all().map((row) => normalizeDonor(readPayload<Donor>(row)));
  for (const donor of donors) {
    for (const document of donorDocuments(donor, createdAt)) {
      insert.run(document.id, JSON.stringify(document));
    }
  }
  writeDemoSignatures();
}

function readPayload<T>(row: Record<string, unknown>): T {
  return JSON.parse(String(row.payload)) as T;
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
  await io();
  return database()
    .prepare("SELECT payload FROM donors")
    .all()
    .map((row) => normalizeDonor(readPayload<Donor>(row)))
    .sort((a, b) => a.organ.localeCompare(b.organ) || a.name.localeCompare(b.name));
}

export async function getDonor(id: string): Promise<Donor | null> {
  await io();
  const row = database().prepare("SELECT payload FROM donors WHERE id = ?").get(id);
  return row ? normalizeDonor(readPayload<Donor>(row)) : null;
}

export async function listRecipients(organ?: OrganId): Promise<Recipient[]> {
  await io();
  const rows = database().prepare("SELECT payload FROM recipients").all().map((row) => readPayload<Recipient>(row));
  return rows
    .filter((item) => (organ ? item.organ === organ : true))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRecipient(id: string): Promise<Recipient | null> {
  await io();
  const row = database().prepare("SELECT payload FROM recipients WHERE id = ?").get(id);
  return row ? readPayload<Recipient>(row) : null;
}

export async function saveDonor(donor: Donor): Promise<void> {
  await io();
  const db = database();
  db.prepare(
    `INSERT INTO donors (id, payload) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
  ).run(donor.id, JSON.stringify(donor));
  const insert = db.prepare(
    `INSERT INTO documents (id, payload) VALUES (?, ?)
     ON CONFLICT(id) DO NOTHING`,
  );
  for (const document of donorDocuments(donor, new Date().toISOString())) {
    insert.run(document.id, JSON.stringify(document));
  }
  writeDemoSignatures();
}

export async function saveRecipient(recipient: Recipient): Promise<void> {
  await io();
  database()
    .prepare(
      `INSERT INTO recipients (id, payload) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
    )
    .run(recipient.id, JSON.stringify(recipient));
}

export async function listMatches(): Promise<MatchRecord[]> {
  await io();
  return database()
    .prepare("SELECT payload FROM matches")
    .all()
    .map((row) => normalizeMatch(readPayload<MatchRecord>(row)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getMatch(id: string): Promise<MatchRecord | null> {
  await io();
  const row = database().prepare("SELECT payload FROM matches WHERE id = ?").get(id);
  return row ? normalizeMatch(readPayload<MatchRecord>(row)) : null;
}

export async function saveMatch(match: MatchRecord): Promise<void> {
  await io();
  database()
    .prepare(
      `INSERT INTO matches (id, payload) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
    )
    .run(match.id, JSON.stringify(match));
}

export async function restoreSample(): Promise<void> {
  await io();
  const db = database();
  db.exec("DELETE FROM documents; DELETE FROM matches; DELETE FROM recipients; DELETE FROM donors;");
  insertSample(db);
}

export async function listDocuments(): Promise<ClinicalDocument[]> {
  await io();
  return database()
    .prepare("SELECT payload FROM documents")
    .all()
    .map((row) => readPayload<ClinicalDocument>(row))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title));
}

export async function listDonorDocuments(donorId: string): Promise<ClinicalDocument[]> {
  const documents = await listDocuments();
  return documents.filter((item) => item.donorId === donorId && item.kind !== "recipient_consent");
}

export async function getDocument(id: string): Promise<ClinicalDocument | null> {
  await io();
  const row = database().prepare("SELECT payload FROM documents WHERE id = ?").get(id);
  return row ? readPayload<ClinicalDocument>(row) : null;
}

export async function saveDocument(document: ClinicalDocument): Promise<void> {
  await io();
  database()
    .prepare(
      `INSERT INTO documents (id, payload) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
    )
    .run(document.id, JSON.stringify(document));
}

export async function findRecipientConsent(matchId: string, recipientId: string): Promise<ClinicalDocument | null> {
  const documents = await listDocuments();
  return (
    documents.find(
      (item) => item.kind === "recipient_consent" && item.matchId === matchId && item.recipientId === recipientId,
    ) ?? null
  );
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
