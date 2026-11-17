"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageIntro, Panel } from "@/components/ui";
import { ethnicityLabel, outcomeLabel } from "@/lib/constants";
import { useData } from "@/lib/client";
import { listDonors, listMatches, listRecipients } from "@/lib/db";
import { getOrgan, isOrganId } from "@/lib/organs/registry";
import type { Donor, OutcomeStatus, Recipient } from "@/lib/types";

// Columns follow the patient profile agreed with the clinical team: age, sex, ethnicity,
// blood group, primary diagnosis, height, weight, waiting time, and outcome status. Transplanted
// patients also show donor age, sex, blood group, cold storage time, and tissue match.

export default function WaitlistPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading waiting list…</p>}>
      <Waitlist />
    </Suspense>
  );
}

const OUTCOME_ORDER: OutcomeStatus[] = [
  "waiting",
  "suspended",
  "transplanted",
  "removed_deteriorated",
  "removed_improved",
  "died_waiting",
];

function Waitlist() {
  const queryOrgan = useSearchParams().get("organ");
  const organ = queryOrgan && isOrganId(queryOrgan) ? queryOrgan : undefined;
  const data = useData(`waitlist:${organ ?? "all"}`, () =>
    Promise.all([listRecipients(organ), listMatches(), listDonors()]),
  );
  if (!data) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading waiting list…</p>;
  const [recipients, matches, donors] = data;
  const rows = [...recipients].sort(
    (a, b) =>
      OUTCOME_ORDER.indexOf(a.outcome) - OUTCOME_ORDER.indexOf(b.outcome) ||
      a.organ.localeCompare(b.organ) ||
      b.daysWaiting - a.daysWaiting,
  );
  const donorById = new Map(donors.map((item) => [item.id, item]));
  const transplants = matches
    .filter((match) => match.decisionStatus === "accepted" && match.offeredRecipientId)
    .map((match) => ({
      match,
      donor: donorById.get(match.donorId),
      recipient: recipients.find((item) => item.id === match.offeredRecipientId),
    }))
    .filter((item): item is { match: typeof item.match; donor: Donor; recipient: Recipient } =>
      Boolean(item.donor && item.recipient),
    );

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <PageIntro
        title="Waiting list"
        text="One row per patient profile. Only patients with outcome Active – waiting are included in a new match."
        action={
          <Link href="/waitlist/new" className="rounded bg-[#0c6b66] px-3 py-2 text-sm font-medium text-white">
            Add patient
          </Link>
        }
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <Filter href="/waitlist" label="All" active={!organ} />
        <Filter href="/waitlist?organ=heart" label="Heart" active={organ === "heart"} />
        <Filter href="/waitlist?organ=liver" label="Liver" active={organ === "liver"} />
        <Filter href="/waitlist?organ=lung" label="Lung" active={organ === "lung"} />
      </div>
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#5c6f6d]">
              <tr>
                <Th>Patient</Th>
                <Th>Organ</Th>
                <Th>Age</Th>
                <Th>Sex</Th>
                <Th>Ethnicity</Th>
                <Th>Blood</Th>
                <Th>Primary diagnosis</Th>
                <Th>Height</Th>
                <Th>Weight</Th>
                <Th>Urgency</Th>
                <Th>Waiting time</Th>
                <Th last>Outcome status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((recipient) => {
                const organModule = getOrgan(recipient.organ);
                return (
                  <tr key={recipient.id} className="border-t border-[#d5e0de] align-top">
                    <Td>
                      <Link href={`/waitlist/edit?id=${recipient.id}`} className="font-medium text-[#0c6b66]">
                        {recipient.name}
                      </Link>
                      <span className="block text-xs text-[#5c6f6d]">{recipient.hospital}</span>
                    </Td>
                    <Td>{organModule.label}</Td>
                    <Td>{recipient.age}</Td>
                    <Td className="capitalize">{recipient.sex}</Td>
                    <Td>{ethnicityLabel(recipient.ethnicity)}</Td>
                    <Td>{recipient.bloodType}</Td>
                    <Td>{organModule.diagnosis(recipient)}</Td>
                    <Td>{recipient.heightCm} cm</Td>
                    <Td>{recipient.weightKg} kg</Td>
                    <Td>{organModule.urgency(recipient)}</Td>
                    <Td>{waitingTime(recipient.daysWaiting)}</Td>
                    <Td last>
                      <OutcomePill outcome={recipient.outcome} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Transplanted patients">
        {transplants.length === 0 ? (
          <p className="text-sm text-[#5c6f6d]">
            No transplants recorded yet. Accepting an offer on a match marks the patient Transplanted and adds the donor and
            transplant details here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#5c6f6d]">
                <tr>
                  <Th>Patient</Th>
                  <Th>Organ</Th>
                  <Th>Donor age</Th>
                  <Th>Donor sex</Th>
                  <Th>Donor blood</Th>
                  <Th>Cold storage time</Th>
                  <Th>Tissue match</Th>
                  <Th>Graft outcome</Th>
                  <Th last>Patient outcome</Th>
                </tr>
              </thead>
              <tbody>
                {transplants.map(({ match, donor, recipient }) => (
                  <tr key={match.id} className="border-t border-[#d5e0de]">
                    <Td>
                      <Link href={`/matches/view?id=${match.id}`} className="font-medium text-[#0c6b66]">
                        {recipient.name}
                      </Link>
                    </Td>
                    <Td>{getOrgan(recipient.organ).label}</Td>
                    <Td>{donor.age}</Td>
                    <Td className="capitalize">{donor.sex}</Td>
                    <Td>{donor.bloodType}</Td>
                    <Td>{donor.coldIschaemicHours} h</Td>
                    <Td>{hlaMismatch(donor, recipient)}</Td>
                    <Td className="text-[#5c6f6d]">Follow-up pending</Td>
                    <Td last className="text-[#5c6f6d]">
                      Follow-up pending
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </main>
  );
}

function waitingTime(days: number): string {
  if (days < 60) return `${days} days`;
  const months = Math.floor(days / 30.4);
  return `${days} days (${months} mo)`;
}

function hlaMismatch(donor: Donor, recipient: Recipient): string {
  if (!donor.hlaComplete || !recipient.hlaComplete || donor.hlaAntigens.length === 0) return "HLA incomplete";
  const own = new Set(recipient.hlaAntigens.map((item) => item.toUpperCase()));
  const mismatched = donor.hlaAntigens.filter((item) => !own.has(item.toUpperCase())).length;
  return `${mismatched}/${donor.hlaAntigens.length} HLA mismatched`;
}

function OutcomePill({ outcome }: { outcome: OutcomeStatus }) {
  const tone: Record<OutcomeStatus, string> = {
    waiting: "bg-[#e3f1ef] text-[#0c6b66]",
    suspended: "bg-amber-50 text-amber-900",
    transplanted: "bg-[#e6edf8] text-[#1a3a6b]",
    removed_deteriorated: "bg-[#f1f1f1] text-[#5c6f6d]",
    removed_improved: "bg-[#f1f1f1] text-[#5c6f6d]",
    died_waiting: "bg-red-50 text-red-800",
  };
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tone[outcome]}`}>{outcomeLabel(outcome)}</span>;
}

function Th({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return <th className={`py-2 font-medium ${last ? "" : "pr-3"}`}>{children}</th>;
}

function Td({ children, last, className = "" }: { children: React.ReactNode; last?: boolean; className?: string }) {
  return <td className={`py-2 ${last ? "" : "pr-3"} ${className}`}>{children}</td>;
}

function Filter({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`rounded px-3 py-1 ${active ? "bg-[#0c6b66] text-white" : "bg-white text-[#143331]"}`}>
      {label}
    </Link>
  );
}
