"use client";

import { exportToExcel } from "@/utils/exportExcel";
import type { UnifiedRow } from "@/types/attendance";

interface ExportButtonProps {
  data: UnifiedRow[];
}

export function ExportButton({ data }: ExportButtonProps) {
  if (!data.length) return null;

  return (
    <button
      onClick={() => exportToExcel(data)}
      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      Export to Excel
    </button>
  );
}
