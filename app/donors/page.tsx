"use client";

import Link from "next/link";
import { Suspense } from "react";
import { ClockBadge, PageIntro, Panel } from "@/components/ui";
import { useData } from "@/lib/client";
import { listDonors } from "@/lib/db";
import { getOrgan } from "@/lib/organs/registry";

export default function DonorsPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading donors…</p>}>
      <DonorList />
    </Suspense>
  );
}

function DonorList() {
  const donors = useData("donors", listDonors);
  if (!donors) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading donors…</p>;
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <PageIntro
        title="Donors"
        text="Heart and lung donors are separate cases. Open a donor to run a match."
        action={
          <Link href="/donors/new" className="rounded bg-[#0c6b66] px-3 py-2 text-sm font-medium text-white">
            Add donor
          </Link>
        }
      />
      <Panel>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[#5c6f6d]">
            <tr>
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Organ</th>
              <th className="py-2 pr-3 font-medium">Blood</th>
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
                    <span className="block text-xs text-[#5c6f6d]">{donor.hospital}</span>
                  </td>
                  <td className="py-2 pr-3">{organModule.label}</td>
                  <td className="py-2 pr-3">{donor.bloodType}</td>
                  <td className="py-2 pr-3">
                    <ClockBadge tone={organModule.clock(donor.coldIschaemicHours)}>{donor.coldIschaemicHours} h</ClockBadge>
                  </td>
                  <td className="py-2 capitalize">{donor.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </main>
  );
}
