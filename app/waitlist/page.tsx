import Link from "next/link";
import { Suspense } from "react";
import { PageIntro, Panel } from "@/components/ui";
import { listRecipients } from "@/lib/db";
import { bmi } from "@/lib/format";
import { getOrgan, isOrganId } from "@/lib/organs/registry";

export default function WaitlistPage({ searchParams }: { searchParams: Promise<{ organ?: string }> }) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading waiting list…</p>}>
      <Waitlist searchParams={searchParams} />
    </Suspense>
  );
}

async function Waitlist({ searchParams }: { searchParams: Promise<{ organ?: string }> }) {
  const query = await searchParams;
  const organ = query.organ && isOrganId(query.organ) ? query.organ : undefined;
  const recipients = await listRecipients(organ);
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <PageIntro
        title="Waiting list"
        text="Heart and lung patients are listed separately. Inactive patients are kept but left out of a new match."
        action={
          <Link href="/waitlist/new" className="rounded bg-[#0c6b66] px-3 py-2 text-sm font-medium text-white">
            Add patient
          </Link>
        }
      />
      <div className="mb-3 flex gap-2 text-sm">
        <Filter href="/waitlist" label="All" active={!organ} />
        <Filter href="/waitlist?organ=heart" label="Heart" active={organ === "heart"} />
        <Filter href="/waitlist?organ=lung" label="Lung" active={organ === "lung"} />
      </div>
      <Panel>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[#5c6f6d]">
            <tr>
              <th className="py-2 pr-3 font-medium">Patient</th>
              <th className="py-2 pr-3 font-medium">Organ</th>
              <th className="py-2 pr-3 font-medium">Blood</th>
              <th className="py-2 pr-3 font-medium">Urgency</th>
              <th className="py-2 pr-3 font-medium">Wait</th>
              <th className="py-2 font-medium">List</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((recipient) => {
              const organModule = getOrgan(recipient.organ);
              const sample = organModule.summariseRecipient(recipient)[0];
              return (
                <tr key={recipient.id} className="border-t border-[#d5e0de]">
                  <td className="py-2 pr-3">
                    <Link href={`/waitlist/${recipient.id}/edit`} className="font-medium text-[#0c6b66]">
                      {recipient.name}
                    </Link>
                    <span className="block text-xs text-[#5c6f6d]">
                      {recipient.age} years · BMI {bmi(recipient.heightCm, recipient.weightKg)}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{organModule.label}</td>
                  <td className="py-2 pr-3">{recipient.bloodType}</td>
                  <td className="py-2 pr-3">{sample?.value}</td>
                  <td className="py-2 pr-3">{recipient.daysWaiting} d</td>
                  <td className="py-2">{recipient.active ? "Active" : "Inactive"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
