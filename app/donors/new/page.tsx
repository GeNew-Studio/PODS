import { DonorForm } from "@/components/Forms";
import { PageIntro } from "@/components/ui";
import { saveDonor } from "@/lib/actions";

export default function NewDonorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <PageIntro title="Add donor" text="Shared facts are on every organ. The last section comes from the selected organ module." />
      <DonorForm action={saveDonor} />
    </main>
  );
}
