import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RecipientForm } from "@/components/Forms";
import { PageIntro } from "@/components/ui";
import { saveRecipient } from "@/lib/actions";
import { getRecipient } from "@/lib/db";

export default function EditRecipientPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading patient…</p>}>
      <EditRecipient params={params} />
    </Suspense>
  );
}

async function EditRecipient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipient = await getRecipient(id);
  if (!recipient) notFound();
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <PageIntro title={`Edit ${recipient.name}`} />
      <RecipientForm action={saveRecipient} recipient={recipient} />
    </main>
  );
}
