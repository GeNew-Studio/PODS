"use client";

import Link from "next/link";
import { Suspense } from "react";
import { PageIntro, Panel } from "@/components/ui";
import { useData } from "@/lib/client";
import { listDocuments } from "@/lib/db";
import { documentKindLabel } from "@/lib/documents";
import { formatWhen } from "@/lib/format";

export default function DocumentsPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading documents…</p>}>
      <DocumentList />
    </Suspense>
  );
}

function DocumentList() {
  const documents = useData("documents", listDocuments);
  if (!documents) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading documents…</p>;
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <PageIntro
        title="Documents"
        text="Family consent, cause of death, and recipient consent forms. A signed copy can be attached to each record."
      />
      <Panel>
        {documents.length === 0 ? (
          <p className="text-sm text-[#5c6f6d]">No documents yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#5c6f6d]">
              <tr>
                <th className="py-2 pr-3 font-medium">Record</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 font-medium">Signed copy</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="border-t border-[#d5e0de]">
                  <td className="py-2 pr-3">
                    <Link href={`/documents/view?id=${document.id}`} className="font-medium text-[#0c6b66]">
                      {document.title}
                    </Link>
                    <span className="block text-xs text-[#5c6f6d]">
                      {document.donorName}
                      {document.recipientName ? ` · ${document.recipientName}` : ""}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{documentKindLabel(document.kind)}</td>
                  <td className="py-2 pr-3">{formatWhen(document.createdAt)}</td>
                  <td className="py-2">{document.signedStoredName ? "Attached" : "Not attached"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </main>
  );
}
