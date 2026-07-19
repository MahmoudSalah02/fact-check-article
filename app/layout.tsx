import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "PulseCheck",
  description: "Evidence-backed fact proofreading with surgical edits.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
