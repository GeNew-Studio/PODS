# NHS policy sources used in PODS (heart and liver)

All four documents are from the NHSBT ODT policies page: https://www.odt.nhs.uk/transplantation/tools-policies-and-guidance/policies-and-guidance/

| Document | Version | Effective |
| --- | --- | --- |
| POL229 Heart Transplantation: Selection Criteria and Recipient Registration | POL229/13 | 17 Jun 2026 |
| POL228 Heart Transplantation: Organ Allocation | POL228/17 | 20 Sep 2024 |
| POL195 Liver Transplantation: Selection Criteria and Recipient Registration | POL195/21 | 31 Jul 2026 |
| POL196 Deceased Donor Liver Distribution and Allocation | POL196/14 | 3 Aug 2026 |

## Heart: what PODS takes from the NHS

- **Three tiers.** The tiers are super-urgent (SUHAS), urgent (UHAS), and non-urgent (NUHAS), each with the NHS category codes (POL229 Tables 2 to 5). The code is in `lib/organs/heart.ts`.
- **Patient categories.** Adult is 16 or over, paediatric is under 16, and small adult is 16 or over and 30 kg or less (POL229 4.1 to 4.3).
- **Offer order for a DBD adult donor** (POL228 Figure 1):
  1. Super-urgent adult
  2. Urgent adult
  3. Super-urgent paediatric or small adult
  4. Urgent paediatric or small adult
  5. Non-urgent (centre choice)
  
  A paediatric donor reverses this, with paediatric and small adult patients first (Figure 3).
- **Order inside the super-urgent and urgent tiers.** Patients are ordered by time waiting in the tier (POL228 6 and 7). For an O donor, urgent adult O and B patients come before A and AB (POL228 5.3 and 7.1).
- **ABO and size.** Only blood group compatible patients get offers (POL228 Table 2). Each patient has the minimum and maximum donor weight the centre registered (POL228 6 and 7).
- **Non-urgent tier.** This is a centre offer. The NHS lists crossmatch, size, logistics, and physiology as the factors to weigh (POL228 9). PODS uses its compatibility score here.

## Liver: what PODS takes from the NHS

- **Elective listing.**
  - Chronic liver disease needs UKELD 49 or more (POL195 3.2.1), and UKELD below 49 means de-selection (3.9).
  - UKELD = 5.395 ln(INR) + 1.485 ln(creatinine µmol/L) + 3.13 ln(bilirubin µmol/L) − 81.565 ln(sodium mmol/L) + 435. This formula is from Barber et al., Transplantation 2011. The NHS policy names the inputs but does not print the formula.
  - Input bounds: values below 1.0 are set to 1.0, creatinine is capped at 400 µmol/L, and sodium is kept between 112 and 150 mmol/L. Formula and bounds were checked against the published table (PMC3305837, Table 1) and the transplantr R package.
- **HCC.** Patients must meet one of these (POL195 3.2.1 and 3.9):
  - a single tumour of 5 cm or less
  - up to 5 tumours, each 3 cm or less
  - a single tumour of 5 to 7 cm that has been stable for 6 months
  
  AFP over 1,000 is an absolute contraindication.
- **Super-urgent.** POL195 3.5.2 lists categories 1 to 11 and 20. Patients are ordered by blood group, then time on the list (POL196 3.2).
- **Patient categories** (POL196 2.1):
  - paediatric: 16 or under
  - adult: 17 or over
  - small adult: 17 or over and 40 kg or less
  - large paediatric: 16 or under and 40 kg or more
  
  An adult donor is 16 or over and over 40 kg.
- **Split criteria** (POL196 2.9.1). The donor must be DBD, under 45, under 90 kg or BMI under 30, ALT under 200 U/L, and bilirubin under 30 µmol/L. A left lateral segment from such a donor goes to paediatric and small adult patients first.
- **Blood group O and B rule** (POL196 2.6). O livers go to O patients, then B or AB, then A. B livers go to B, then AB. Children under 2 may accept incompatible livers (3.2.2 and 2.6.6).
- **Elective offer order.** Chronic liver disease and HCC patients are ranked by the Transplant Benefit Score (TBS), and only patients within ±20 kg of the donor weight are included. Variant syndrome patients are ranked by waiting time, within ±10 kg (POL196 4.3).

## Where PODS still uses its own numbers (not NHS)

- **Transplant Benefit Score.** POL196 4.3 lists its 16 recipient and 6 donor inputs but not its coefficients, so PODS uses its own score as a stand-in.
- **Donor acceptance.** The NHS leaves donor acceptance to the surgeon (POL196 2.4.3 and 4.4.2), so PODS no longer excludes livers on steatosis, cold time, or donor age. The quality index and the cold-time points are a PODS heuristic.
- **Heart donor gates.** The heart cold-time limit (2 hours), the donor age bound (under 70), and the LVEF limit come from the team's Hong Kong sources, not from POL228/229.
- **Lung.** Lung ranking is not yet aligned to NHS policy. POL230 and POL231 would be the sources.
