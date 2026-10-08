"use client";

export function RestoreButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
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
