export type OrganId = "heart" | "lung";

export type BloodType = "O" | "A" | "B" | "AB";

export type Cluster =
  | "Hong Kong West"
  | "Hong Kong East"
  | "Kowloon Central"
  | "Kowloon East"
  | "Kowloon West"
  | "New Territories East"
  | "New Territories West";

export type AlcoholUse = "none" | "social" | "heavy";

export type PerfusionDevice = "none" | "ocs" | "evlp" | "organox" | "hmp";

export type CancerStatus = "none" | "remission" | "active";

export type FunctionalStatus = "good" | "fair" | "poor";

export type DonorStatus = "offered" | "accepted";

export type DocumentKind = "family_consent" | "cause_of_death" | "recipient_consent";

export type DecisionStatus = "offered" | "accepted" | "declined";

export type Profile = Record<string, string | number | boolean>;

export type Donor = {
  id: string;
  organ: OrganId;
  name: string;
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  bloodType: BloodType;
  hlaAntigens: string[];
  hlaComplete: boolean;
  causeOfDeath: string;
  lymphNodeMetastasis: boolean;
  medicines: string[];
  alcohol: AlcoholUse;
  hospital: string;
  cluster: Cluster;
  coldIschaemicHours: number;
  warmIschaemicMinutes: number;
  perfusionDevice: PerfusionDevice;
  expectedOperativeHours: number;
  brainDead: boolean;
  familyConsent: boolean;
  circulatoryDeath: boolean;
  hiv: boolean;
  cjd: boolean;
  uncontrolledSepsis: boolean;
  metastaticCancer: boolean;
  melanomaHistory: boolean;
  choriocarcinomaHistory: boolean;
  primaryBrainTumour: boolean;
  hepatitisCarrier: boolean;
  highDoseSteroids: boolean;
  profile: Profile;
  status: DonorStatus;
};

export type Recipient = {
  id: string;
  organ: OrganId;
  name: string;
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  bloodType: BloodType;
  hlaAntigens: string[];
  unacceptableAntigens: string[];
  hlaComplete: boolean;
  cpra: number;
  daysWaiting: number;
  cancerStatus: CancerStatus;
  clinicalBackground: string;
  kidneyDisease: boolean;
  liverDisease: boolean;
  functionalStatus: FunctionalStatus;
  hospital: string;
  cluster: Cluster;
  profile: Profile;
  active: boolean;
};

export type FactorGroup = "compatibility" | "survival" | "logistics";

export type Factor = {
  key: string;
  group: FactorGroup;
  label: string;
  donorValue: string;
  recipientValue: string;
  rule: string;
  points: number;
  max: number;
};

export type ScoreResult = {
  eligible: boolean;
  reasons: string[];
  score: number;
  subtotals: {
    compatibility: number;
    survival: number;
    logistics: number;
  };
  factors: Factor[];
  steering: string | null;
  urgencyPoints: number;
  daysWaiting: number;
  clusterRank: number;
  qualityIndex: number;
  urgencyLabel: string;
};

export type QualityReport = {
  value: number;
  lines: { label: string; detail: string }[];
};

export type RankedRow = {
  recipientId: string;
  recipientName: string;
  hospital: string;
  cluster: string;
  bloodType: string;
  urgencyLabel: string;
  score: number;
  mismatch: number;
  subtotals: ScoreResult["subtotals"];
  factors: Factor[];
  steering: string | null;
  qualityIndex: number;
  daysWaiting: number;
};

export type ExclusionRow = {
  recipientId: string;
  recipientName: string;
  reasons: string[];
};

export type MatchRecord = {
  id: string;
  donorId: string;
  donorName: string;
  organ: OrganId;
  createdAt: string;
  qualityIndex: number;
  qualityLines: { label: string; detail: string }[];
  donorBlock: string[];
  eligible: RankedRow[];
  top: RankedRow[];
  excluded: ExclusionRow[];
  offeredRecipientId: string | null;
  decisionStatus: DecisionStatus | null;
  decisionNote: string;
};

export type ClinicalDocument = {
  id: string;
  kind: DocumentKind;
  title: string;
  donorId: string;
  donorName: string;
  organ: OrganId;
  hospital: string;
  causeOfDeath: string;
  donorBlood: string;
  recipientId: string | null;
  recipientName: string | null;
  recipientBlood: string | null;
  matchId: string | null;
  score: number | null;
  mismatch: number | null;
  createdAt: string;
  signedFileName: string | null;
  signedStoredName: string | null;
};

export type FieldDef = {
  key: string;
  label: string;
  type: "number" | "text" | "select" | "boolean";
  options?: { value: string; label: string }[];
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
};

export type ActionState = { error?: string; redirectTo?: string } | null;
