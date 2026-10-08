"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/donors", label: "Donors" },
  { href: "/waitlist", label: "Waiting list" },
  { href: "/history", label: "History" },
  { href: "/documents", label: "Documents" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="bg-[#0c6b66] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/">
          <p className="text-lg font-semibold tracking-[0.18em]">PODS</p>
          <p className="text-xs text-[#d5efed]">Local organ matching</p>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded px-3 py-1.5 ${active ? "bg-white text-[#0c6b66]" : "text-white hover:bg-white/10"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
