import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "考勤加班计算工具",
  description: "印尼工厂考勤加班 OT1 / OT2 计算工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
