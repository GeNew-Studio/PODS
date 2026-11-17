"use client";

import Link from "next/link";
import { Suspense } from "react";
import { PageIntro, Panel } from "@/components/ui";
import { useData } from "@/lib/client";
import { listMatches } from "@/lib/db";
import { formatWhen } from "@/lib/format";

export default function HistoryPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading history…</p>}>
      <History />
    </Suspense>
  );
}

function History() {
  const matches = useData("matches", listMatches);
  if (!matches) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading history…</p>;
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <PageIntro title="History" text="Each run keeps the score that was shown at the time. Later edits do not rewrite it." />
      <Panel>
        {matches.length === 0 ? (
          <p className="text-sm text-[#5c6f6d]">No matches yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#5c6f6d]">
              <tr>
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Donor</th>
                <th className="py-2 pr-3 font-medium">Top score</th>
                <th className="py-2 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-t border-[#d5e0de]">
                  <td className="py-2 pr-3">{formatWhen(match.createdAt)}</td>
                  <td className="py-2 pr-3">
                    <Link href={`/matches/view?id=${match.id}`} className="font-medium text-[#0c6b66]">
                      {match.donorName}
                    </Link>
                    <span className="block text-xs capitalize text-[#5c6f6d]">{match.organ}</span>
                  </td>
                  <td className="py-2 pr-3">{match.top[0]?.score ?? "—"}</td>
                  <td className="py-2 capitalize">
                    {match.decisionStatus ? (
                      <Link href={`/offers/view?id=${match.id}`} className="font-medium text-[#0c6b66] underline">
                        {match.decisionStatus}
                      </Link>
                    ) : (
                      "None"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </main>
  );
}
