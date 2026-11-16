"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DonorForm } from "@/components/Forms";
import { Missing, PageIntro } from "@/components/ui";
import { saveDonor } from "@/lib/actions";
import { useData } from "@/lib/client";
import { getDonor } from "@/lib/db";

export default function EditDonorPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading donor…</p>}>
      <EditDonor />
    </Suspense>
  );
}

function EditDonor() {
  const id = useSearchParams().get("id") ?? "";
  const donor = useData(`donor-edit:${id}`, () => getDonor(id));
  if (donor === undefined) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading donor…</p>;
  if (!donor) return <Missing what="donor" />;
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <PageIntro title={`Edit ${donor.name}`} />
      <DonorForm key={donor.id} action={saveDonor} donor={donor} />
    </main>
  );
}
