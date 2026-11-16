"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import { Missing, PageIntro } from "@/components/ui";
import { useData } from "@/lib/client";
import { getDocument, getFile } from "@/lib/db";

export default function SignedFilePage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading signed copy…</p>}>
      <SignedFile />
    </Suspense>
  );
}

function SignedFile() {
  const id = useSearchParams().get("id") ?? "";
  const data = useData(`file:${id}`, async () => {
    const document = await getDocument(id);
    const file = document?.signedStoredName ? await getFile(document.signedStoredName) : null;
    return { document, file };
  });
  const url = useObjectUrl(data?.file ?? null);
  if (!data) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading signed copy…</p>;
  const { document, file } = data;
  if (!document || !file) return <Missing what="signed copy" />;
  if (!url) return <p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading signed copy…</p>;
  const name = document.signedFileName ?? document.signedStoredName ?? "signed-copy";
  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <PageIntro
        eyebrow="Signed copy"
        title={name}
        action={
          <div className="flex gap-3 text-sm">
            <a href={url} download={name} className="text-[#0c6b66]">
              Download
            </a>
            <Link href={`/documents/view?id=${document.id}`} className="text-[#0c6b66]">
              Back to document
            </Link>
          </div>
        }
      />
      {file.type === "application/pdf" ? (
        <iframe src={url} title={name} className="h-[80vh] w-full rounded border border-[#d5e0de] bg-white" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="max-w-full rounded border border-[#d5e0de] bg-white" />
      )}
    </main>
  );
}

function useObjectUrl(file: Blob | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return url;
}
