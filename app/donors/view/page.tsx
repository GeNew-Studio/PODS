"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ClockBadge, Facts, Missing, PageIntro, Panel, PathwayBadge, PrivateBadge } from "@/components/ui";
import { runMatch } from "@/lib/actions";
import { useData, useNavigateAction } from "@/lib/client";
import { DCD_NOTE, PATHWAY_LABELS, ethnicityLabel, pathwayOf } from "@/lib/constants";
import { PRIVATE_HOSPITAL_NOTE, isPrivateHospital } from "@/lib/hospitals";
import { getDonor, listDonorDocuments } from "@/lib/db";
import { documentKindLabel } from "@/lib/documents";
import { bmi } from "@/lib/format";
import { getOrgan } from "@/lib/organs/registry";
import { matchCanStart } from "@/lib/scoring/gates";

export default function DonorPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading donor…</p>}>
      <DonorDetail />
    </Suspense>
  );
}

function DonorDetail() {
  const id = useSearchParams().get("id") ?? "";
  const runMatchAction = useNavigateAction(runMatch);
  const data = useData(`donor:${id}`, async () => {
    const donor = await getDonor(id);
    return { donor, documents: donor ? await listDonorDocuments(donor.id) : [] };
  });
  if (!data) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading donor…</p>;
  const { donor, documents } = data;
  if (!donor) return <Missing what="donor" />;
  const organModule = getOrgan(donor.organ);
  const quality = organModule.quality(donor);
  const block = matchCanStart(donor);
  const donorBlock = organModule.donorBlock(donor);
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <PageIntro
        eyebrow={organModule.label}
        title={donor.name}
        text={`${donor.hospital}, ${donor.cluster}. Listing centre ${organModule.listingCentre}. Implant site ${organModule.implantSite}.`}
        action={
          <Link href={`/donors/edit?id=${donor.id}`} className="rounded border border-[#0c6b66] px-3 py-2 text-sm text-[#0c6b66]">
            Edit
          </Link>
        }
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <ClockBadge tone={organModule.clock(donor.coldIschaemicHours)}>
          {donor.coldIschaemicHours} h cold time · {organModule.clockLabel}
        </ClockBadge>
        <span className="rounded bg-white px-2 py-0.5 capitalize">{donor.status}</span>
        <span className="rounded bg-white px-2 py-0.5">Quality index {quality.value}</span>
        <PathwayBadge pathway={pathwayOf(donor)} />
        {isPrivateHospital(donor.hospital) ? <PrivateBadge /> : null}
      </div>
      {isPrivateHospital(donor.hospital) ? (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{PRIVATE_HOSPITAL_NOTE}</p>
      ) : null}
      {donor.circulatoryDeath ? (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{DCD_NOTE}</p>
      ) : null}
      <Panel title="Consent and death documents">
        <ul className="space-y-2 text-sm">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-3">
              <span>{documentKindLabel(document.kind)}</span>
              <Link href={`/documents/view?id=${document.id}`} className="font-medium text-[#0c6b66] underline">
                Click here
              </Link>
              {document.signedStoredName ? (
                <Link href={`/documents/file?id=${document.id}`} className="text-[#5c6f6d]">
                  Signed copy attached
                </Link>
              ) : (
                <span className="text-[#5c6f6d]">No signed copy yet</span>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Shared record">
        <Facts
          items={[
            { label: "Blood group", value: donor.bloodType },
            { label: "HLA", value: donor.hlaAntigens.join(", ") || "Not recorded" },
            { label: "HLA complete", value: donor.hlaComplete ? "Yes" : "No" },
            { label: "Age", value: String(donor.age) },
            { label: "Sex", value: donor.sex },
            { label: "Ethnicity", value: ethnicityLabel(donor.ethnicity) },
            { label: "BMI", value: String(bmi(donor.heightCm, donor.weightKg)) },
            { label: "Cause of death", value: donor.causeOfDeath },
            { label: "Donation pathway", value: PATHWAY_LABELS[pathwayOf(donor)] },
            { label: "Lymph-node metastasis", value: donor.lymphNodeMetastasis ? "Yes" : "No" },
            { label: "Medicines", value: donor.medicines.join(", ") || "None recorded" },
            { label: "Alcohol", value: donor.alcohol },
            { label: "Cold ischaemic time", value: `${donor.coldIschaemicHours} h` },
            { label: "Warm ischaemic time", value: `${donor.warmIschaemicMinutes} min` },
            { label: "Perfusion", value: donor.perfusionDevice },
            { label: "Expected operative time", value: `${donor.expectedOperativeHours} h` },
            { label: "Brainstem death certified", value: donor.brainDead ? "Yes" : "No" },
            { label: "Family consent", value: donor.familyConsent ? "Yes" : "No" },
            { label: "Hepatitis carrier", value: donor.hepatitisCarrier ? "Risk flag" : "No" },
            { label: "Primary brain tumour", value: donor.primaryBrainTumour ? "Recorded, not an exclusion by itself" : "No" },
          ]}
        />
        <p className="mt-3 text-xs text-[#5c6f6d]">
          Routine medicines do not change the score. Warm ischaemic time applies to DCD donors and is recorded only.
        </p>
      </Panel>
      <Panel title={`${organModule.label} module`}>
        <Facts items={organModule.summariseDonor(donor)} />
      </Panel>
      <Panel title="Quality index">
        <p className="mb-2 text-sm">Score {quality.value} of 100. This changes who receives survival points. It is not added on top of the match score.</p>
        <ul className="space-y-1 text-sm">
          {quality.lines.map((line) => (
            <li key={line.label}>
              <span className="font-medium">{line.label}.</span> {line.detail}
            </li>
          ))}
        </ul>
      </Panel>
      {donorBlock.length > 0 ? (
        <Panel title="Allocation block">
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-800">
            {donorBlock.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <Panel title="Run match">
        {block ? <p className="mb-3 text-sm text-red-800">{block}</p> : null}
        <form action={runMatchAction}>
          <input type="hidden" name="donorId" value={donor.id} />
          <button
            disabled={Boolean(block)}
            className="rounded bg-[#0c6b66] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Run match
          </button>
        </form>
      </Panel>
    </main>
  );
}
