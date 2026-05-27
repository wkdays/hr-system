import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Attendance OT Calculator",
  description: "Multi-shift attendance and overtime calculation tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
