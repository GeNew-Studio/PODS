"use client";

import { useNavigateAction } from "@/lib/client";

export function RestoreButton({ action }: { action: () => Promise<string> }) {
  const run = useNavigateAction(action);
  return (
    <form action={run}>
      <button
        className="rounded border border-[#7f1d1d] px-3 py-1.5 text-sm text-[#7f1d1d]"
        onClick={(event) => {
          if (!window.confirm("Replace every local donor, patient, and match with the original sample records?")) {
            event.preventDefault();
          }
        }}
      >
        Restore sample data
      </button>
    </form>
  );
}
