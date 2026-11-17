"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FactorTable, Missing, Modal, PageIntro, Panel } from "@/components/ui";
import { openConsent, saveDecision } from "@/lib/actions";
import { useData, useNavigateAction } from "@/lib/client";
import { getMatch } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { getOrgan } from "@/lib/organs/registry";
import type { DecisionStatus, ExclusionRow, MatchRecord, OrganId, RankedRow } from "@/lib/types";

const POLICY_SOURCE: Record<OrganId, string> = {
  heart: "Offer order follows NHSBT POL228/17 (heart allocation) and POL229/13 (heart selection): super-urgent, then urgent, then non-urgent.",
  liver: "Offer order follows NHSBT POL196/14 (liver allocation) and POL195/21 (liver selection): super-urgent, then split or paediatric offers, then elective patients, with the blood group O priority rule.",
  lung: "Lung ranking uses the PODS score only. It has not yet been aligned to NHSBT lung policy.",
};

const STATUS_WORDS: Record<DecisionStatus, { title: string; button: string; tone: string }> = {
  offered: { title: "Send organ offer", button: "Send offer", tone: "bg-[#0c6b66]" },
  accepted: { title: "Record acceptance", button: "Record acceptance", tone: "bg-emerald-700" },
  declined: { title: "Record decline", button: "Record decline", tone: "bg-red-700" },
};

type Pending = { recipientId: string; status: DecisionStatus; note: string };

export default function MatchPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading match…</p>}>
      <MatchDetail />
    </Suspense>
  );
}

function MatchDetail() {
  const id = useSearchParams().get("id") ?? "";
  const saveDecisionAction = useNavigateAction(saveDecision);
  const match = useData(`match:${id}`, () => getMatch(id));
  const [pending, setPending] = useState<Pending | null>(null);
  const [saving, setSaving] = useState(false);
  if (match === undefined) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading match…</p>;
  if (!match) return <Missing what="match" />;
  const organModule = getOrgan(match.organ);
  const offerTo = (recipientId: string) => setPending({ recipientId, status: "offered", note: "" });

  const confirm = async () => {
    if (!pending) return;
    setSaving(true);
    const formData = new FormData();
    formData.set("matchId", match.id);
    formData.set("recipientId", pending.recipientId);
    formData.set("status", pending.status);
    formData.set("note", pending.note);
    await saveDecisionAction(formData);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <PageIntro
        eyebrow={`${organModule.label} offered · ${formatWhen(match.createdAt)}`}
        title={match.donorName}
        text={`${POLICY_SOURCE[match.organ]} Inside a tier, patients are ordered by time waiting where the policy says so, or by the PODS compatibility score where the policy leaves the choice to the centre. Quality index ${match.qualityIndex}. Click a patient's name to produce a consent form.`}
        action={
          <div className="flex flex-wrap gap-2 text-sm">
            {match.offeredRecipientId ? (
              <Link href={`/offers/view?id=${match.id}`} className="rounded bg-[#0c6b66] px-3 py-2 font-medium text-white">
                View current offer
              </Link>
            ) : null}
            <Link href={`/donors/view?id=${match.donorId}`} className="rounded border border-[#0c6b66] px-3 py-2 text-[#0c6b66]">
              Donor record
            </Link>
          </div>
        }
      />
      <Panel title="Quality index at the time of the run">
        <ul className="space-y-1 text-sm">
          {match.qualityLines.map((line) => (
            <li key={`${line.label}-${line.detail}`}>
              <span className="font-medium">{line.label}.</span> {line.detail}
            </li>
          ))}
        </ul>
      </Panel>
      {match.donorBlock.length > 0 ? (
        <Panel title="No ranking">
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-800">
            {match.donorBlock.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Panel>
      ) : (
        <Panel title={`${organModule.label} offered · top ${match.top.length}`}>
          {match.top.length === 0 ? (
            <p className="text-sm">No patient passed the safety gates.</p>
          ) : (
            <div className="space-y-3">
              {match.top.map((row, index) => (
                <OfferCard key={row.recipientId} row={row} rank={index + 1} match={match} onOffer={offerTo} />
              ))}
            </div>
          )}
        </Panel>
      )}
      {match.eligible.length > 3 ? (
        <Panel title={`${organModule.label} offered · other eligible patients`}>
          <p className="mb-3 text-sm text-[#5c6f6d]">Offered in this order if the patients above decline. Lower mismatch means lower risk.</p>
          <div className="space-y-3">
            {match.eligible.slice(3).map((row, index) => (
              <OfferCard key={row.recipientId} row={row} rank={index + 4} match={match} onOffer={offerTo} />
            ))}
          </div>
        </Panel>
      ) : null}
      <Panel title={`Excluded · ${match.excluded.length}`}>
        {match.excluded.length === 0 ? (
          <p className="text-sm text-[#5c6f6d]">No active patient was excluded.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {groupReasons(match.excluded).map(([reason, names]) => (
              <li key={reason}>
                <p className="font-medium">{reason}</p>
                <p className="text-[#5c6f6d]">
                  {names.length} patient{names.length === 1 ? "" : "s"}: {names.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {match.eligible.length > 0 ? (
        <Panel title="Decision">
          {match.decisionStatus ? (
            <p className="mb-3 text-sm">
              Current decision: <span className="font-medium capitalize">{match.decisionStatus}</span> for{" "}
              {match.eligible.find((row) => row.recipientId === match.offeredRecipientId)?.recipientName ?? "a patient"}
              {match.decisionNote ? `: ${match.decisionNote}` : ""}.{" "}
              <Link href={`/offers/view?id=${match.id}`} className="font-medium text-[#0c6b66] underline">
                Open the offer
              </Link>
            </p>
          ) : null}
          <form
            key={`${match.offeredRecipientId}-${match.decisionStatus}-${match.decisionNote}`}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              setPending({
                recipientId: String(data.get("recipientId")),
                status: String(data.get("status")) as DecisionStatus,
                note: String(data.get("note") ?? ""),
              });
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <label className="text-sm">
              Patient
              <select
                name="recipientId"
                defaultValue={match.offeredRecipientId ?? match.eligible[0]?.recipientId}
                className="mt-1 w-full rounded border border-[#d5e0de] px-2 py-1.5"
              >
                {match.eligible.map((row) => (
                  <option key={row.recipientId} value={row.recipientId}>
                    {row.recipientName} · mismatch {row.mismatch}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Status
              <select name="status" defaultValue={match.decisionStatus ?? "offered"} className="mt-1 w-full rounded border border-[#d5e0de] px-2 py-1.5">
                <option value="offered">Offered</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              Note
              <textarea name="note" defaultValue={match.decisionNote} maxLength={500} className="mt-1 min-h-20 w-full rounded border border-[#d5e0de] px-2 py-1.5" />
            </label>
            <button className="w-fit rounded bg-[#0c6b66] px-4 py-2 text-sm font-medium text-white">Save decision</button>
          </form>
        </Panel>
      ) : null}
      <ConfirmOffer match={match} pending={pending} saving={saving} onCancel={() => setPending(null)} onConfirm={confirm} />
    </main>
  );
}

function ConfirmOffer({
  match,
  pending,
  saving,
  onCancel,
  onConfirm,
}: {
  match: MatchRecord;
  pending: Pending | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const row = pending ? match.eligible.find((item) => item.recipientId === pending.recipientId) : undefined;
  const rank = row ? match.eligible.indexOf(row) + 1 : 0;
  const words = pending ? STATUS_WORDS[pending.status] : STATUS_WORDS.offered;
  const skipped = pending?.status === "offered" && rank > 1 ? rank - 1 : 0;
  return (
    <Modal open={Boolean(pending && row)} title={words.title} onClose={saving ? () => undefined : onCancel}>
      {row && pending ? (
        <div className="space-y-3 text-sm">
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-[#5c6f6d]">Organ</dt>
            <dd>
              {getOrgan(match.organ).label} from {match.donorName}
            </dd>
            <dt className="text-[#5c6f6d]">Patient</dt>
            <dd className="font-medium">{row.recipientName}</dd>
            <dt className="text-[#5c6f6d]">Position</dt>
            <dd>
              Rank {rank} of {match.eligible.length}
              {row.tierLabel ? ` · NHS tier ${row.tierLabel}` : ""}
            </dd>
            <dt className="text-[#5c6f6d]">Urgency</dt>
            <dd>{row.urgencyLabel}</dd>
            <dt className="text-[#5c6f6d]">Compatibility</dt>
            <dd>
              {row.score} / 100 · mismatch {row.mismatch}
            </dd>
            {pending.note ? (
              <>
                <dt className="text-[#5c6f6d]">Note</dt>
                <dd>{pending.note}</dd>
              </>
            ) : null}
          </dl>
          {skipped > 0 ? (
            <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
              This skips {skipped} higher-ranked patient{skipped === 1 ? "" : "s"}. NHS policy expects the order to be honoured unless those above decline. Add the reason in the note.
            </p>
          ) : null}
          {pending.status === "offered" ? (
            <p className="text-[#5c6f6d]">The transplant team will have 45 minutes to respond, the NHSBT offering time for named-patient offers.</p>
          ) : null}
          {pending.status === "accepted" ? (
            <p className="text-[#5c6f6d]">Accepting marks the patient Transplanted and takes them off the active waiting list.</p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onCancel} disabled={saving} className="rounded border border-[#d5e0de] px-3 py-2 disabled:opacity-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              className={`rounded px-3 py-2 font-medium text-white disabled:opacity-60 ${words.tone}`}
            >
              {saving ? "Saving…" : words.button}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function OfferCard({
  row,
  rank,
  match,
  onOffer,
}: {
  row: RankedRow;
  rank: number;
  match: MatchRecord;
  onOffer: (recipientId: string) => void;
}) {
  const openConsentAction = useNavigateAction(openConsent);
  const organLabel = getOrgan(match.organ).label;
  const isCurrent = match.offeredRecipientId === row.recipientId && Boolean(match.decisionStatus);
  return (
    <article className={`rounded border ${isCurrent ? "border-[#0c6b66] ring-1 ring-[#0c6b66]" : "border-[#d5e0de]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0c6b66]">
            {organLabel} offered · rank {rank}
            {isCurrent ? <span className="ml-2 rounded bg-[#0c6b66] px-1.5 py-px normal-case text-white">{match.decisionStatus}</span> : null}
          </p>
          <form action={openConsentAction}>
            <input type="hidden" name="matchId" value={match.id} />
            <input type="hidden" name="recipientId" value={row.recipientId} />
            <button className="text-left text-lg font-semibold text-[#0c6b66] underline">{row.recipientName}</button>
          </form>
          {row.tierLabel ? (
            <p className="mt-1 inline-block rounded bg-[#e3f1ef] px-2 py-0.5 text-xs font-medium text-[#0c6b66]">
              NHS tier {row.tierLabel} · ordered by {row.sortBasis === "waiting" ? "time waiting" : "PODS score"}
            </p>
          ) : null}
          <p className="text-sm text-[#5c6f6d]">
            {row.urgencyLabel} · blood group {row.bloodType} · {row.hospital} · waited {row.daysWaiting} days
          </p>
          {row.steering ? <p className="mt-2 text-sm text-[#7a3410]">{row.steering}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-[#5c6f6d]">Compatibility</p>
          <p className="text-3xl font-semibold text-[#0c6b66]">{row.score} / 100</p>
          <p className="text-sm text-[#143331]">Mismatch {row.mismatch}</p>
          <p className="text-xs text-[#5c6f6d]">
            Compatibility {row.subtotals.compatibility} · Survival {row.subtotals.survival} · Logistics {row.subtotals.logistics}
          </p>
          {isCurrent ? (
            <Link href={`/offers/view?id=${match.id}`} className="mt-2 inline-block rounded border border-[#0c6b66] px-3 py-1.5 text-sm font-medium text-[#0c6b66]">
              View offer
            </Link>
          ) : (
            <button type="button" onClick={() => onOffer(row.recipientId)} className="mt-2 rounded bg-[#0c6b66] px-3 py-1.5 text-sm font-medium text-white">
              Make offer
            </button>
          )}
        </div>
      </div>
      <details className="border-t border-[#d5e0de] px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-[#0c6b66]">Show the calculation</summary>
        <div className="pt-3">
          <FactorTable factors={row.factors} />
        </div>
      </details>
    </article>
  );
}

function groupReasons(excluded: ExclusionRow[]): [string, string[]][] {
  const grouped = new Map<string, string[]>();
  for (const row of excluded) {
    for (const reason of row.reasons) {
      const names = grouped.get(reason) ?? [];
      names.push(row.recipientName);
      grouped.set(reason, names);
    }
  }
  return [...grouped.entries()];
}
