"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RecipientForm } from "@/components/Forms";
import { Missing, PageIntro } from "@/components/ui";
import { saveRecipient } from "@/lib/actions";
import { useData } from "@/lib/client";
import { getRecipient } from "@/lib/db";

export default function EditRecipientPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading patient…</p>}>
      <EditRecipient />
    </Suspense>
  );
}

function EditRecipient() {
  const id = useSearchParams().get("id") ?? "";
  const recipient = useData(`recipient-edit:${id}`, () => getRecipient(id));
  if (recipient === undefined) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading patient…</p>;
  if (!recipient) return <Missing what="patient" />;
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <PageIntro title={`Edit ${recipient.name}`} />
      <RecipientForm key={recipient.id} action={saveRecipient} recipient={recipient} />
    </main>
  );
}
