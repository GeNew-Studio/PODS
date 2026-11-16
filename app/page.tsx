"use client";

import Link from "next/link";
import { Suspense } from "react";
import { RestoreButton } from "@/components/RestoreButton";
import { ClockBadge, PageIntro, Panel } from "@/components/ui";
import { restoreSampleData } from "@/lib/actions";
import { listDonors, listMatches, listRecipients } from "@/lib/db";
import { useData } from "@/lib/client";
import { formatWhen } from "@/lib/format";
import { getOrgan } from "@/lib/organs/registry";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading dashboard…</p>}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const data = useData("dashboard", () => Promise.all([listDonors(), listRecipients(), listMatches()]));
  if (!data) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading dashboard…</p>;
  const [donors, recipients, matches] = data;
  const active = recipients.filter((item) => item.active);
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <PageIntro
        eyebrow="Hong Kong demonstration"
        title="Dashboard"
        text="Heart and lung donors are scored separately. Queen Mary Hospital is the implant site. Grantham Hospital is the listing centre."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Heart waiting" value={String(active.filter((item) => item.organ === "heart").length)} />
        <Stat label="Lung waiting" value={String(active.filter((item) => item.organ === "lung").length)} />
        <Stat label="Saved matches" value={String(matches.length)} />
      </div>
      <Panel title="Donors on the clock">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#5c6f6d]">
              <tr>
                <th className="py-2 pr-3 font-medium">Donor</th>
                <th className="py-2 pr-3 font-medium">Organ</th>
                <th className="py-2 pr-3 font-medium">Hospital</th>
                <th className="py-2 pr-3 font-medium">Cold time</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((donor) => {
                const organModule = getOrgan(donor.organ);
                return (
                  <tr key={donor.id} className="border-t border-[#d5e0de]">
                    <td className="py-2 pr-3">
                      <Link href={`/donors/view?id=${donor.id}`} className="font-medium text-[#0c6b66]">
                        {donor.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{organModule.label}</td>
                    <td className="py-2 pr-3">
                      {donor.hospital}
                      <span className="block text-xs text-[#5c6f6d]">{donor.cluster}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <ClockBadge tone={organModule.clock(donor.coldIschaemicHours)}>
                        {donor.coldIschaemicHours} h · {organModule.clockLabel}
                      </ClockBadge>
                    </td>
                    <td className="py-2 capitalize">{donor.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Recent decisions">
        {matches.length === 0 ? (
          <p className="text-sm text-[#5c6f6d]">No matches have been run yet.</p>
        ) : (
          <ul className="divide-y divide-[#d5e0de] text-sm">
            {matches.slice(0, 6).map((match) => (
              <li key={match.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/matches/view?id=${match.id}`} className="font-medium text-[#0c6b66]">
                  {match.donorName} · {match.organ}
                </Link>
                <span className="text-[#5c6f6d]">
                  {formatWhen(match.createdAt)} · {match.decisionStatus ?? "no decision"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Sample data">
        <p className="mb-3 text-sm text-[#5c6f6d]">
          Edits, new records, and match decisions are saved on this computer. Restore sample data deletes those changes and
          puts the original fake records back.
        </p>
        <RestoreButton action={restoreSampleData} />
      </Panel>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d5e0de] bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[#5c6f6d]">{label}</p>
      <p className="text-2xl font-semibold text-[#143331]">{value}</p>
    </div>
  );
}
