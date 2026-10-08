import { RecipientForm } from "@/components/Forms";
import { PageIntro } from "@/components/ui";
import { saveRecipient } from "@/lib/actions";

export default function NewRecipientPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <PageIntro title="Add patient" text="Urgency fields change with the organ module. Kidney and liver scores are not part of this version." />
      <RecipientForm action={saveRecipient} />
    </main>
  );
}
