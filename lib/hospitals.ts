import type { Cluster } from "@/lib/types";

// Real Hong Kong hospitals that can refer a deceased donor. Patient records in this demo are fake.
// Public: Hospital Authority acute hospitals, cluster as listed on the HA page
//   https://www.ha.org.hk/visitor/template101.asp (checked 17 Nov 2026). Which of them have an
//   ICU was not verified. The HA now runs one Hong Kong Island Cluster; PODS keeps Hong Kong West
//   and Hong Kong East as geographic zones because the distance score to Queen Mary uses them.
// Private: all 14 hospital licences in the Department of Health list under Cap. 633
//   (data.gov.hk, PH_Cap.633_20251217_eng.csv), placed in the zone that covers their district.

export type HospitalSector = "public" | "private";

export type Hospital = {
  name: string;
  sector: HospitalSector;
  cluster: Cluster;
};

export const HOSPITALS: Hospital[] = [
  // Hospital Authority (public)
  { name: "Queen Mary Hospital", sector: "public", cluster: "Hong Kong West" },
  { name: "Pamela Youde Nethersole Eastern Hospital", sector: "public", cluster: "Hong Kong East" },
  { name: "Ruttonjee Hospital", sector: "public", cluster: "Hong Kong East" },
  { name: "Queen Elizabeth Hospital", sector: "public", cluster: "Kowloon Central" },
  { name: "Hong Kong Children's Hospital", sector: "public", cluster: "Kowloon Central" },
  { name: "United Christian Hospital", sector: "public", cluster: "Kowloon East" },
  { name: "Tseung Kwan O Hospital", sector: "public", cluster: "Kowloon East" },
  { name: "Princess Margaret Hospital", sector: "public", cluster: "Kowloon West" },
  { name: "Kwong Wah Hospital", sector: "public", cluster: "Kowloon Central" },
  { name: "Caritas Medical Centre", sector: "public", cluster: "Kowloon West" },
  { name: "Yan Chai Hospital", sector: "public", cluster: "Kowloon West" },
  { name: "Prince of Wales Hospital", sector: "public", cluster: "New Territories East" },
  { name: "North District Hospital", sector: "public", cluster: "New Territories East" },
  { name: "Alice Ho Miu Ling Nethersole Hospital", sector: "public", cluster: "New Territories East" },
  { name: "Tuen Mun Hospital", sector: "public", cluster: "New Territories West" },
  { name: "Pok Oi Hospital", sector: "public", cluster: "New Territories West" },
  // Private
  { name: "Gleneagles Hospital Hong Kong", sector: "private", cluster: "Hong Kong West" },
  { name: "Canossa Hospital (Caritas)", sector: "private", cluster: "Hong Kong West" },
  { name: "Matilda and War Memorial Hospital", sector: "private", cluster: "Hong Kong West" },
  { name: "Hong Kong Sanatorium & Hospital", sector: "private", cluster: "Hong Kong East" },
  { name: "St. Paul's Hospital", sector: "private", cluster: "Hong Kong East" },
  { name: "Hong Kong Adventist Hospital – Stubbs Road", sector: "private", cluster: "Hong Kong East" },
  { name: "HKSH Eastern Medical Centre", sector: "private", cluster: "Hong Kong East" },
  { name: "Hong Kong Baptist Hospital", sector: "private", cluster: "Kowloon Central" },
  { name: "St. Teresa's Hospital", sector: "private", cluster: "Kowloon Central" },
  { name: "Evangel Hospital", sector: "private", cluster: "Kowloon Central" },
  { name: "Precious Blood Hospital (Caritas)", sector: "private", cluster: "Kowloon West" },
  { name: "Union Hospital", sector: "private", cluster: "New Territories East" },
  { name: "CUHK Medical Centre", sector: "private", cluster: "New Territories East" },
  { name: "Hong Kong Adventist Hospital – Tsuen Wan", sector: "private", cluster: "Kowloon West" },
];

export function findHospital(name: string): Hospital | undefined {
  return HOSPITALS.find((item) => item.name === name);
}

export function hospitalSector(name: string): HospitalSector {
  return findHospital(name)?.sector ?? "public";
}

export function isPrivateHospital(name: string): boolean {
  return hospitalSector(name) === "private";
}

export const PRIVATE_HOSPITAL_NOTE =
  "Private hospitals refer a minority of donors in Hong Kong. Retrieval needs coordination between the private hospital, the HA organ donation coordinator, and the implant team.";
