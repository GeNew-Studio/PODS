"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Missing, Modal, PathwayBadge, PrivateBadge } from "@/components/ui";
import { openConsent, saveDecision } from "@/lib/actions";
import { ethnicityLabel, pathwayOf } from "@/lib/constants";
import { useData, useNavigateAction } from "@/lib/client";
import { getDonor, getMatch, getRecipient } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { isPrivateHospital } from "@/lib/hospitals";
import { getOrgan } from "@/lib/organs/registry";
import type { DecisionStatus } from "@/lib/types";

// NHSBT offering time for named-patient offers (POL196 2.5.1 liver, POL228 section 12 heart).
const RESPONSE_MINUTES = 45;

export default function OfferPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-4xl px-4 py-6 text-sm">Loading offer…</p>}>
      <OfferDetail />
    </Suspense>
  );
}

function OfferDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";
  const sent = params.get("sent") as DecisionStatus | null;
  const saveDecisionAction = useNavigateAction(saveDecision);
  const openConsentAction = useNavigateAction(openConsent);
  const [confirming, setConfirming] = useState<DecisionStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const data = useData(`offer:${id}`, async () => {
    const match = await getMatch(id);
    if (!match) return { match: null, donor: null, recipient: null };
    const [donor, recipient] = await Promise.all([
      getDonor(match.donorId),
      match.offeredRecipientId ? getRecipient(match.offeredRecipientId) : Promise.resolve(null),
    ]);
    return { match, donor, recipient };
  });
  if (!data) return <p className="mx-auto max-w-4xl px-4 py-6 text-sm">Loading offer…</p>;
  const { match, donor, recipient } = data;
  if (!match) return <Missing what="match" />;
  const row = match.eligible.find((item) => item.recipientId === match.offeredRecipientId);
  if (!match.decisionStatus || !row) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6 text-sm">
        <p>No offer has been made from this match yet.</p>
        <Link href={`/matches/view?id=${match.id}`} className="font-medium text-[#0c6b66] underline">
          Back to the match
        </Link>
      </main>
    );
  }
  const organModule = getOrgan(match.organ);
  const rank = match.eligible.indexOf(row) + 1;
  const reference = `OFF-${match.id.slice(0, 8).toUpperCase()}`;
  const status = match.decisionStatus;
  const closeSent = () => router.replace(`/offers/view?id=${match.id}`);

  const decide = async () => {
    if (!confirming) return;
    setSaving(true);
    const formData = new FormData();
    formData.set("matchId", match.id);
    formData.set("recipientId", row.recipientId);
    formData.set("status", confirming);
    formData.set("note", match.decisionNote);
    await saveDecisionAction(formData);
    setSaving(false);
    setConfirming(null);
  };

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm print:hidden">
        <Link href={`/matches/view?id=${match.id}`} className="text-[#0c6b66]">
          ← Back to the match
        </Link>
        <button type="button" onClick={() => window.print()} className="rounded border border-[#d5e0de] bg-white px-3 py-1.5">
          Print offer
        </button>
      </div>

      <article className="overflow-hidden rounded-md border border-[#c8bda8] bg-[#fbf8f1] text-[#1c2b2a] shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b-4 border-[#0c6b66] bg-white px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0c6b66]">PODS · Platform for Organ Donation Systems</p>
            <h1 className="mt-1 text-2xl font-semibold">Organ offer notice</h1>
            <p className="text-sm text-[#5c6f6d]">Demonstration document. Not a Hospital Authority record.</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono text-base font-semibold">{reference}</p>
            <p className="text-[#5c6f6d]">Issued {match.offeredAt ? formatWhen(match.offeredAt) : formatWhen(match.createdAt)}</p>
            <StatusStamp status={status} />
          </div>
        </header>

        {status === "offered" && match.offeredAt ? <Countdown offeredAt={match.offeredAt} /> : null}
        {status === "accepted" ? (
          <p className="border-b border-emerald-200 bg-emerald-50 px-6 py-3 text-sm text-emerald-900">
            Accepted {match.decidedAt ? formatWhen(match.decidedAt) : ""}. {row.recipientName} is marked Transplanted on the waiting list.
          </p>
        ) : null}
        {status === "declined" ? (
          <p className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-900">
            Declined {match.decidedAt ? formatWhen(match.decidedAt) : ""}. Under NHS rules the organ moves to the next patient in the sequence.
          </p>
        ) : null}

        <div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7a3410]">Organ and donor</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Organ" value={organModule.label} strong />
              <Row label="Donor" value={match.donorName} />
              {donor ? (
                <>
                  <Row label="Blood group" value={donor.bloodType} />
                  <Row label="Age and sex" value={`${donor.age}, ${donor.sex}`} />
                  <Row label="Ethnicity" value={ethnicityLabel(donor.ethnicity)} />
                  <Row
                    label="Donor hospital"
                    value={
                      <>
                        {donor.hospital}
                        {isPrivateHospital(donor.hospital) ? <PrivateBadge /> : null}
                      </>
                    }
                  />
                  <Row label="Cause of death" value={donor.causeOfDeath} />
                  <Row label="Pathway" value={<PathwayBadge pathway={pathwayOf(donor)} />} />
                  <Row label="Cold time at offer" value={`${donor.coldIschaemicHours} h`} />
                </>
              ) : null}
              <Row label="Quality index" value={`${match.qualityIndex} / 100`} />
            </dl>
          </section>
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7a3410]">Offered to</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Patient" value={row.recipientName} strong />
              {recipient ? (
                <>
                  <Row label="Blood group" value={recipient.bloodType} />
                  <Row label="Age and sex" value={`${recipient.age}, ${recipient.sex}`} />
                  <Row label="Primary diagnosis" value={organModule.diagnosis(recipient)} />
                </>
              ) : null}
              <Row label="Transplant centre" value={row.hospital} />
              <Row label="Urgency" value={row.urgencyLabel} />
              {row.tierLabel ? <Row label="NHS tier" value={row.tierLabel} /> : null}
              <Row label="Position" value={`Rank ${rank} of ${match.eligible.length} eligible`} />
              <Row label="Compatibility" value={`${row.score} / 100 (mismatch ${row.mismatch})`} />
              <Row label="Waiting time" value={`${row.daysWaiting} days`} />
            </dl>
          </section>
        </div>

        {match.decisionNote ? (
          <p className="border-t border-[#e4dccb] px-6 py-3 text-sm">
            <span className="font-medium">Note: </span>
            {match.decisionNote}
          </p>
        ) : null}

        <section className="border-t border-[#e4dccb] px-6 py-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7a3410]">Record</h2>
          <ol className="space-y-1 text-sm">
            <li>
              <span className="text-[#5c6f6d]">{formatWhen(match.createdAt)}</span> · Match run, {match.eligible.length} eligible and {match.excluded.length} excluded
            </li>
            {match.offeredAt ? (
              <li>
                <span className="text-[#5c6f6d]">{formatWhen(match.offeredAt)}</span> · Offer sent to {row.recipientName}
              </li>
            ) : null}
            {match.decidedAt && status !== "offered" ? (
              <li>
                <span className="text-[#5c6f6d]">{formatWhen(match.decidedAt)}</span> · Offer {status}
              </li>
            ) : null}
          </ol>
        </section>
      </article>

      <div className="flex flex-wrap gap-2 text-sm print:hidden">
        {status === "offered" ? (
          <>
            <button type="button" onClick={() => setConfirming("accepted")} className="rounded bg-emerald-700 px-4 py-2 font-medium text-white">
              Accept offer
            </button>
            <button type="button" onClick={() => setConfirming("declined")} className="rounded bg-red-700 px-4 py-2 font-medium text-white">
              Decline offer
            </button>
          </>
        ) : null}
        {status === "declined" ? (
          <Link href={`/matches/view?id=${match.id}`} className="rounded bg-[#0c6b66] px-4 py-2 font-medium text-white">
            Offer to the next patient
          </Link>
        ) : null}
        <form action={openConsentAction}>
          <input type="hidden" name="matchId" value={match.id} />
          <input type="hidden" name="recipientId" value={row.recipientId} />
          <button className="rounded border border-[#0c6b66] bg-white px-4 py-2 font-medium text-[#0c6b66]">Recipient consent form</button>
        </form>
        {status === "accepted" ? (
          <Link href="/waitlist" className="rounded border border-[#d5e0de] bg-white px-4 py-2">
            Waiting list
          </Link>
        ) : null}
      </div>

      <Modal open={Boolean(sent)} title={sentTitle(sent)} onClose={closeSent}>
        <div className="space-y-3 text-sm">
          <p>
            {sent === "offered"
              ? `The ${organModule.label.toLowerCase()} from ${match.donorName} has been offered to ${row.recipientName} at ${row.hospital}.`
              : sent === "accepted"
                ? `${row.recipientName} has accepted the ${organModule.label.toLowerCase()} from ${match.donorName}. The patient is now marked Transplanted.`
                : `The offer to ${row.recipientName} was declined. Go back to the match to offer the next patient in order.`}
          </p>
          <p className="rounded bg-[#f3f6f5] px-3 py-2 font-mono">{reference}</p>
          {sent === "offered" ? <p className="text-[#5c6f6d]">Response window: {RESPONSE_MINUTES} minutes from now.</p> : null}
          <div className="flex justify-end">
            <button type="button" onClick={closeSent} className="rounded bg-[#0c6b66] px-4 py-2 font-medium text-white">
              View offer notice
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(confirming)}
        title={confirming === "accepted" ? "Accept this offer?" : "Decline this offer?"}
        onClose={saving ? () => undefined : () => setConfirming(null)}
      >
        <div className="space-y-3 text-sm">
          <p>
            {confirming === "accepted"
              ? `Record that ${row.recipientName} accepts the ${organModule.label.toLowerCase()}. The patient will be marked Transplanted.`
              : `Record that the offer to ${row.recipientName} is declined. The organ goes back to the match for the next patient.`}
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirming(null)} disabled={saving} className="rounded border border-[#d5e0de] px-3 py-2">
              Cancel
            </button>
            <button
              type="button"
              onClick={decide}
              disabled={saving}
              className={`rounded px-3 py-2 font-medium text-white disabled:opacity-60 ${confirming === "accepted" ? "bg-emerald-700" : "bg-red-700"}`}
            >
              {saving ? "Saving…" : confirming === "accepted" ? "Accept" : "Decline"}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

function sentTitle(sent: DecisionStatus | null): string {
  if (sent === "accepted") return "Offer accepted";
  if (sent === "declined") return "Offer declined";
  return "Offer sent";
}

function StatusStamp({ status }: { status: DecisionStatus }) {
  const tone =
    status === "accepted"
      ? "border-emerald-700 text-emerald-800"
      : status === "declined"
        ? "border-red-700 text-red-800"
        : "border-[#0c6b66] text-[#0c6b66]";
  const text = status === "offered" ? "Awaiting response" : status;
  return (
    <span className={`mt-2 inline-block rotate-[-3deg] rounded border-2 px-2 py-0.5 text-xs font-bold uppercase tracking-widest ${tone}`}>
      {text}
    </span>
  );
}

function Countdown({ offeredAt }: { offeredAt: string }) {
  const deadline = new Date(offeredAt).getTime() + RESPONSE_MINUTES * 60 * 1000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const left = Math.max(0, deadline - now);
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  const share = left / (RESPONSE_MINUTES * 60 * 1000);
  const expired = left === 0;
  return (
    <div className={`border-b px-6 py-3 ${expired ? "border-red-200 bg-red-50" : "border-[#d5e0de] bg-[#eef6f5]"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className={expired ? "font-medium text-red-900" : "text-[#143331]"}>
          {expired
            ? "Response window has passed. Under NHS rules a centre that does not respond is treated as declining."
            : `Response due by ${formatWhen(new Date(deadline).toISOString())} (NHSBT ${RESPONSE_MINUTES}-minute offering time)`}
        </span>
        {!expired ? (
          <span className="font-mono text-xl font-semibold text-[#0c6b66]">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        ) : null}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-white">
        <div className="h-full bg-[#0c6b66] transition-[width]" style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2">
      <dt className="text-[#5c6f6d]">{label}</dt>
      <dd className={strong ? "font-semibold" : ""}>{value}</dd>
    </div>
  );
}
