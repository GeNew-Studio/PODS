import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PODS | Platform for Organ Donation Systems",
  description: "Platform for Organ Donation Systems. Hong Kong demonstration for heart, liver, and lung matching.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="bg-[#7f1d1d] text-sm text-white">
          <p className="mx-auto max-w-6xl px-4 py-2">
            Demonstration only. Not for clinical use. Not an official Hospital Authority allocation policy.
          </p>
        </div>
        <Suspense fallback={<div className="h-16 bg-[#0c6b66]" />}>
          <SiteHeader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
