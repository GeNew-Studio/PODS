import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DonorForm } from "@/components/Forms";
import { PageIntro } from "@/components/ui";
import { saveDonor } from "@/lib/actions";
import { getDonor } from "@/lib/db";

export default function EditDonorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading donor…</p>}>
      <EditDonor params={params} />
    </Suspense>
  );
}

async function EditDonor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donor = await getDonor(id);
  if (!donor) notFound();
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <PageIntro title={`Edit ${donor.name}`} />
      <DonorForm action={saveDonor} donor={donor} />
    </main>
  );
}
