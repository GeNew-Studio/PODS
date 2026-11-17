"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ClockBadge, PageIntro, Panel, PathwayBadge, PrivateBadge } from "@/components/ui";
import { pathwayOf } from "@/lib/constants";
import { useData } from "@/lib/client";
import { listDonors } from "@/lib/db";
import { PRIVATE_HOSPITAL_NOTE, isPrivateHospital } from "@/lib/hospitals";
import { getOrgan } from "@/lib/organs/registry";

export default function DonorsPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading donors…</p>}>
      <DonorList />
    </Suspense>
  );
}

function DonorList() {
  const sector = useSearchParams().get("sector");
  const donors = useData("donors", listDonors);
  if (!donors) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading donors…</p>;
  const privateCount = donors.filter((donor) => isPrivateHospital(donor.hospital)).length;
  const shown = donors.filter((donor) => {
    if (sector === "private") return isPrivateHospital(donor.hospital);
    if (sector === "public") return !isPrivateHospital(donor.hospital);
    return true;
  });
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <PageIntro
        title="Donors"
        text="Each donor organ is a separate case. Donor hospitals are Hospital Authority public hospitals unless marked Private. Open a donor to run a match."
        action={
          <Link href="/donors/new" className="rounded bg-[#0c6b66] px-3 py-2 text-sm font-medium text-white">
            Add donor
          </Link>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Filter href="/donors" label={`All (${donors.length})`} active={!sector} />
        <Filter href="/donors?sector=public" label={`Public (${donors.length - privateCount})`} active={sector === "public"} />
        <Filter href="/donors?sector=private" label={`Private (${privateCount})`} active={sector === "private"} />
      </div>
      {privateCount > 0 ? (
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="font-semibold">
            {privateCount} private hospital {privateCount === 1 ? "referral" : "referrals"}.
          </span>{" "}
          {PRIVATE_HOSPITAL_NOTE}
        </p>
      ) : null}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#5c6f6d]">
              <tr>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Donor hospital</th>
                <th className="py-2 pr-3 font-medium">Organ</th>
                <th className="py-2 pr-3 font-medium">Blood</th>
                <th className="py-2 pr-3 font-medium">Pathway</th>
                <th className="py-2 pr-3 font-medium">Cold time</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((donor) => {
                const organModule = getOrgan(donor.organ);
                const isPrivate = isPrivateHospital(donor.hospital);
                return (
                  <tr
                    key={donor.id}
                    className={`border-t border-[#d5e0de] ${isPrivate ? "bg-amber-50/70 shadow-[inset_3px_0_0_#f59e0b]" : ""}`}
                  >
                    <td className="py-2 pl-2 pr-3">
                      <Link href={`/donors/view?id=${donor.id}`} className="font-medium text-[#0c6b66]">
                        {donor.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      {donor.hospital}
                      {isPrivate ? <PrivateBadge /> : null}
                      <span className="block text-xs text-[#5c6f6d]">{donor.cluster}</span>
                    </td>
                    <td className="py-2 pr-3">{organModule.label}</td>
                    <td className="py-2 pr-3">{donor.bloodType}</td>
                    <td className="py-2 pr-3">
                      <PathwayBadge pathway={pathwayOf(donor)} />
                    </td>
                    <td className="py-2 pr-3">
                      <ClockBadge tone={organModule.clock(donor.coldIschaemicHours)}>{donor.coldIschaemicHours} h</ClockBadge>
                    </td>
                    <td className="py-2 capitalize">{donor.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </main>
  );
}

function Filter({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`rounded px-3 py-1 ${active ? "bg-[#0c6b66] text-white" : "bg-white text-[#143331]"}`}>
      {label}
    </Link>
  );
}
