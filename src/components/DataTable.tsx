"use client";

import type { UnifiedRow } from "@/types/attendance";

interface DataTableProps {
  data: UnifiedRow[];
}

export function DataTable({ data }: DataTableProps) {
  if (!data.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        No data to display
      </div>
    );
  }

  const headers = [
    { key: "shiftLabel", label: "Shift", w: "w-20" },
    { key: "nik", label: "NIK", w: "w-20" },
    { key: "name", label: "Name", w: "w-40" },
    { key: "department", label: "Department", w: "w-28" },
    { key: "day", label: "Day", w: "w-12" },
    { key: "inTime", label: "Clock In", w: "w-16" },
    { key: "breakOut1", label: "Break Out 1", w: "w-20" },
    { key: "breakIn1", label: "Break In 1", w: "w-20" },
    { key: "breakOut2", label: "Break Out 2", w: "w-20" },
    { key: "breakIn2", label: "Break In 2", w: "w-20" },
    { key: "outTime", label: "Clock Out", w: "w-16" },
    { key: "normalEnd", label: "Normal End", w: "w-20" },
    { key: "otMinutes", label: "OT Min", w: "w-16" },
    { key: "otHours", label: "OT Hrs", w: "w-16" },
    { key: "ot1", label: "OT1", w: "w-12" },
    { key: "ot2", label: "OT2", w: "w-12" },
  ];

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-100">
            {headers.map((h) => (
              <th
                key={h.key}
                className={`px-2 py-2 text-left font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200 ${h.w}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-slate-100 hover:bg-blue-50 transition-colors ${
                row.isSecurityGuard ? "bg-amber-50/50" : ""
              }`}
            >
              <td className="px-2 py-2 text-slate-600 whitespace-nowrap">
                {row.shiftLabel}
              </td>
              <td className="px-2 py-2 text-slate-600 whitespace-nowrap font-mono">
                {row.nik}
              </td>
              <td className="px-2 py-2 text-slate-700 whitespace-nowrap">
                {row.name}
              </td>
              <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                {row.department}
              </td>
              <td className="px-2 py-2 text-slate-600 whitespace-nowrap text-center">
                {row.day}
              </td>
              <td className="px-2 py-2 text-slate-600 whitespace-nowrap">
                {row.inTime || "-"}
              </td>
              <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                {row.breakOut1 || "-"}
              </td>
              <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                {row.breakIn1 || "-"}
              </td>
              <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                {row.breakOut2 || "-"}
              </td>
              <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                {row.breakIn2 || "-"}
              </td>
              <td className="px-2 py-2 text-slate-600 whitespace-nowrap">
                {row.outTime || "-"}
              </td>
              <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                {row.normalEnd}
              </td>
              <td className="px-2 py-2 text-slate-700 whitespace-nowrap font-medium">
                {row.otMinutes > 0 ? row.otMinutes : "-"}
              </td>
              <td className="px-2 py-2 text-slate-700 whitespace-nowrap font-medium">
                {row.otHours > 0 ? row.otHours : "-"}
              </td>
              <td className="px-2 py-2 text-blue-700 whitespace-nowrap font-semibold">
                {row.ot1 > 0 ? row.ot1 : "-"}
              </td>
              <td className="px-2 py-2 text-blue-700 whitespace-nowrap font-semibold">
                {row.ot2 > 0 ? row.ot2 : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
