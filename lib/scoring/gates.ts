import type { Donor, Recipient } from "@/lib/types";
import { aboCompatible, virtualCrossmatch } from "@/lib/scoring/abo";

export function sharedDonorGates(donor: Donor): string[] {
  const reasons: string[] = [];
  if (!donor.brainDead || donor.circulatoryDeath) {
    reasons.push(
      "Heart and lung allocation in this demonstration uses brain-dead donors only. This donor is not certified brain dead, or the pathway is donation after circulatory death.",
    );
  }
  if (!donor.familyConsent) {
    reasons.push("Family consent has not been recorded. In Hong Kong the family decision stands.");
  }
  if (donor.hiv) reasons.push("Active HIV is an absolute contraindication.");
  if (donor.cjd) reasons.push("CJD is an absolute contraindication.");
  if (donor.uncontrolledSepsis) reasons.push("Uncontrolled sepsis is an absolute contraindication.");
  if (donor.metastaticCancer || donor.lymphNodeMetastasis) {
    reasons.push(
      "Metastatic or non-curable malignant disease, including lymph-node metastasis, excludes organ donation.",
    );
  }
  if (donor.melanomaHistory) reasons.push("A history of melanoma excludes donation.");
  if (donor.choriocarcinomaHistory) reasons.push("A history of choriocarcinoma excludes donation.");
  return reasons;
}

export function sharedPairGates(donor: Donor, recipient: Recipient): string[] {
  const reasons: string[] = [];
  if (donor.organ !== recipient.organ) reasons.push("Organ does not match.");
  if (!aboCompatible(donor.bloodType, recipient.bloodType)) {
    reasons.push(
      `ABO incompatible. Donor blood group ${donor.bloodType} cannot be allocated to recipient blood group ${recipient.bloodType}.`,
    );
  }
  if (virtualCrossmatch(donor, recipient) === "positive") {
    reasons.push(
      "Predicted positive virtual crossmatch. The recipient has a donor-specific antibody against a donor HLA antigen.",
    );
  }
  if (recipient.cancerStatus === "active") {
    reasons.push("Recipient has active extra-thoracic cancer.");
  }
  return reasons;
}

export function matchCanStart(donor: Donor): string | null {
  if (!donor.brainDead || donor.circulatoryDeath) {
    return "A match cannot start until the donor is certified brain dead. Circulatory-death donors are not allocated a heart or lung in this demonstration.";
  }
  if (!donor.familyConsent) {
    return "A match cannot start until family consent is recorded.";
  }
  return null;
}
