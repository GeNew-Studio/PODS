import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageIntro, Panel } from "@/components/ui";
import { attachSigned } from "@/lib/actions";
import { getDocument } from "@/lib/db";
import { documentKindLabel } from "@/lib/documents";
import { formatWhen } from "@/lib/format";

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading document…</p>}>
      <DocumentDetail params={params} />
    </Suspense>
  );
}

async function DocumentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getDocument(id);
  if (!document) notFound();
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <PageIntro
        eyebrow={documentKindLabel(document.kind)}
        title={document.title}
        text="Demonstration copy. Not a hospital record."
        action={
          <Link href="/documents" className="text-sm text-[#0c6b66]">
            All documents
          </Link>
        }
      />
      <article className="rounded-md border border-[#c8bda8] bg-[#f7f3ea] p-6 text-[#1c2b2a] shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-[#7a3410]">Scanned copy</p>
        <h2 className="mt-2 text-xl font-semibold">{documentKindLabel(document.kind)}</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Donor" value={document.donorName} />
          <Row label="Organ" value={document.organ} />
          <Row label="Donor blood group" value={document.donorBlood} />
          <Row label="Donor hospital" value={document.hospital} />
          <Row label="Recorded" value={formatWhen(document.createdAt)} />
          {document.kind === "cause_of_death" ? <Row label="Cause of death" value={document.causeOfDeath} /> : null}
          {document.kind === "family_consent" ? (
            <Row
              label="Statement"
              value="The family has recorded consent for donation of the named organ after brain death. This page stands in for the scanned consent form."
            />
          ) : null}
          {document.recipientName ? <Row label="Recipient" value={document.recipientName} /> : null}
          {document.recipientBlood ? <Row label="Recipient blood group" value={document.recipientBlood} /> : null}
          {document.score != null ? <Row label="Compatibility" value={`${document.score} / 100`} /> : null}
          {document.mismatch != null ? <Row label="Mismatch" value={String(document.mismatch)} /> : null}
        </dl>
        {document.kind === "recipient_consent" ? (
          <p className="mt-4 text-sm leading-6">
            {document.recipientName} is offered the {document.organ} from {document.donorName}. This consent form was produced
            when the nurse opened the patient on the match.
          </p>
        ) : null}
      </article>
      <Panel title="Signed copy">
        {document.signedStoredName ? (
          <p className="mb-3 text-sm">
            A signed copy is attached.{" "}
            <Link href={`/documents/${document.id}/file`} className="font-medium text-[#0c6b66] underline">
              {document.signedFileName ?? "Open signed copy"}
            </Link>
          </p>
        ) : (
          <p className="mb-3 text-sm text-[#5c6f6d]">No signed copy is attached yet.</p>
        )}
        <form action={attachSigned} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="documentId" value={document.id} />
          <label className="text-sm">
            Attach a signed PDF or image
            <input name="signed" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required className="mt-1 block text-sm" />
          </label>
          <button className="rounded bg-[#0c6b66] px-3 py-2 text-sm font-medium text-white">Attach signed form</button>
        </form>
      </Panel>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[11rem_1fr] gap-2">
      <dt className="text-[#5c6f6d]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
