"use client";

import type { TableStats } from "@/types/attendance";

interface StatsBarProps {
  stats: TableStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const cards = [
    { label: "Employees", value: stats.totalEmployees, color: "text-slate-800" },
    { label: "Total Rows", value: stats.totalRows, color: "text-slate-800" },
    { label: "OT1 Total", value: stats.totalOT1, color: "text-blue-600" },
    { label: "OT2 Total", value: stats.totalOT2, color: "text-blue-600" },
    {
      label: "OT Minutes",
      value: stats.totalOTMinutes,
      color: "text-emerald-600",
    },
    {
      label: "Security Guards",
      value: stats.securityGuardCount,
      color: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white p-3 rounded-lg border border-slate-200"
        >
          <div className="text-xs text-slate-500 mb-1">{card.label}</div>
          <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
