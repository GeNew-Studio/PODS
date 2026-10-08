import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FactorTable, PageIntro, Panel } from "@/components/ui";
import { openConsent, saveDecision } from "@/lib/actions";
import { getMatch } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { getOrgan } from "@/lib/organs/registry";
import type { ExclusionRow, RankedRow } from "@/lib/types";

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading match…</p>}>
      <MatchDetail params={params} />
    </Suspense>
  );
}

async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();
  const organModule = getOrgan(match.organ);
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <PageIntro
        eyebrow={`${organModule.label} offered · ${formatWhen(match.createdAt)}`}
        title={match.donorName}
        text={`Quality index ${match.qualityIndex}. Compatibility is the total score out of 100. A lower mismatch is the safer override. Click a patient to produce a consent form.`}
        action={
          <Link href={`/donors/${match.donorId}`} className="text-sm text-[#0c6b66]">
            Donor record
          </Link>
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
                <OfferCard key={row.recipientId} row={row} rank={index + 1} organLabel={organModule.label} matchId={match.id} />
              ))}
            </div>
          )}
        </Panel>
      )}
      {match.eligible.length > 3 ? (
        <Panel title={`${organModule.label} offered · other eligible patients`}>
          <p className="mb-3 text-sm text-[#5c6f6d]">
            Use this list to override the top 3. Lower mismatch means lower risk.
          </p>
          <div className="space-y-3">
            {match.eligible.slice(3).map((row) => (
              <OfferCard key={row.recipientId} row={row} organLabel={organModule.label} matchId={match.id} />
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
              Current decision: {match.decisionStatus}
              {match.decisionNote ? ` — ${match.decisionNote}` : ""}
            </p>
          ) : null}
          <form action={saveDecision} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="matchId" value={match.id} />
            <label className="text-sm">
              Patient
              <select name="recipientId" defaultValue={match.offeredRecipientId ?? match.eligible[0]?.recipientId} className="mt-1 w-full rounded border border-[#d5e0de] px-2 py-1.5">
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
    </main>
  );
}

function OfferCard({
  row,
  rank,
  organLabel,
  matchId,
}: {
  row: RankedRow;
  rank?: number;
  organLabel: string;
  matchId: string;
}) {
  return (
    <article className="rounded border border-[#d5e0de]">
      <div className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0c6b66]">
            {organLabel} offered{rank ? ` · rank ${rank}` : ""}
          </p>
          <form action={openConsent}>
            <input type="hidden" name="matchId" value={matchId} />
            <input type="hidden" name="recipientId" value={row.recipientId} />
            <button className="text-left text-lg font-semibold text-[#0c6b66] underline">{row.recipientName}</button>
          </form>
          <p className="text-sm text-[#5c6f6d]">
            {row.urgencyLabel} · blood group {row.bloodType} · {row.hospital} · waited {row.daysWaiting} days
          </p>
          {row.steering ? <p className="mt-2 text-sm text-[#7a3410]">{row.steering}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-[#5c6f6d]">Compatibility</p>
          <p className="text-3xl font-semibold text-[#0c6b66]">
            {row.score} / 100
          </p>
          <p className="text-sm text-[#143331]">Mismatch {row.mismatch}</p>
          <p className="text-xs text-[#5c6f6d]">
            Compatibility {row.subtotals.compatibility} · Survival {row.subtotals.survival} · Logistics {row.subtotals.logistics}
          </p>
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
