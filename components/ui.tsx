import type { ReactNode } from "react";
import type { Factor, FactorGroup } from "@/lib/types";

export function PageIntro({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-[#0c6b66]">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold text-[#143331]">{title}</h1>
        {text ? <p className="mt-1 max-w-3xl text-sm text-[#5c6f6d]">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-[#d5e0de] bg-white p-4">
      {title ? <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#0c6b66]">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Facts({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
          <dt className="text-[#5c6f6d]">{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const groupTitles: Record<FactorGroup, string> = {
  compatibility: "Compatibility",
  survival: "Survival benefit",
  logistics: "Geography and logistics",
};

export function FactorTable({ factors }: { factors: Factor[] }) {
  const groups: FactorGroup[] = ["compatibility", "survival", "logistics"];
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const rows = factors.filter((item) => item.group === group);
        const total = Math.round(rows.reduce((sum, row) => sum + row.points, 0) * 10) / 10;
        return (
          <div key={group}>
            <h3 className="mb-1 text-sm font-semibold text-[#143331]">
              {groupTitles[group]} · {total}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-[#f3f6f5] text-xs uppercase tracking-wide text-[#5c6f6d]">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Factor</th>
                    <th className="px-2 py-1.5 font-medium">Donor</th>
                    <th className="px-2 py-1.5 font-medium">Patient</th>
                    <th className="px-2 py-1.5 font-medium">Rule</th>
                    <th className="px-2 py-1.5 text-right font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-t border-[#d5e0de]">
                      <td className="px-2 py-2 align-top font-medium">{row.label}</td>
                      <td className="px-2 py-2 align-top">{row.donorValue}</td>
                      <td className="px-2 py-2 align-top">{row.recipientValue}</td>
                      <td className="px-2 py-2 align-top text-[#3d524f]">{row.rule}</td>
                      <td className="px-2 py-2 text-right align-top whitespace-nowrap">
                        {row.points} / {row.max}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ClockBadge({ tone, children }: { tone: "ok" | "soon" | "late"; children: ReactNode }) {
  const toneClass =
    tone === "ok" ? "bg-emerald-100 text-emerald-900" : tone === "soon" ? "bg-amber-100 text-amber-950" : "bg-red-100 text-red-900";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${toneClass}`}>{children}</span>;
}

export function Missing({ what }: { what: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <p className="text-sm text-[#5c6f6d]">This {what} was not found in this browser. Restore sample data on the dashboard if it was removed.</p>
    </main>
  );
}

export function PrivateBadge() {
  return (
    <span
      title="Private hospital referral. A minority of donors in Hong Kong."
      className="ml-1.5 inline-block rounded border border-amber-300 bg-amber-50 px-1.5 py-px align-middle text-[11px] font-semibold uppercase tracking-wide text-amber-900"
    >
      Private
    </span>
  );
}

export function PathwayBadge({ pathway }: { pathway: "DBD" | "DCD" }) {
  const dcd = pathway === "DCD";
  return (
    <span
      title={dcd ? "Donation after circulatory death. Not yet practised in Hong Kong." : "Donation after brainstem death."}
      className={`inline-block rounded px-1.5 py-px text-xs font-semibold ${
        dcd ? "border border-amber-300 bg-amber-50 text-amber-900" : "bg-[#e3f1ef] text-[#0c6b66]"
      }`}
    >
      {pathway}
      {dcd ? " · not in HK yet" : ""}
    </span>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1f1d]/55 px-4"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#d5e0de] px-5 py-3">
          <h2 className="text-base font-semibold text-[#143331]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-[#5c6f6d] hover:text-[#143331]">
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
