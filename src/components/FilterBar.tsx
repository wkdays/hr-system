"use client";

import type { ShiftType, FilterState } from "@/types/attendance";
import { SHIFT_CONFIGS } from "@/types/attendance";

interface FilterBarProps {
  filters: FilterState;
  departments: string[];
  onUpdateFilter: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => void;
}

export function FilterBar({ filters, departments, onUpdateFilter }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onUpdateFilter("search", e.target.value)}
          placeholder="Search by NIK, Name, or Department..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <select
        value={filters.shiftFilter}
        onChange={(e) =>
          onUpdateFilter("shiftFilter", e.target.value as ShiftType | "all")
        }
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="all">All Shifts</option>
        {Object.entries(SHIFT_CONFIGS).map(([key, conf]) => (
          <option key={key} value={key}>
            {conf.label}
          </option>
        ))}
      </select>

      <select
        value={filters.departmentFilter}
        onChange={(e) => onUpdateFilter("departmentFilter", e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="all">All Departments</option>
        {departments.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
        <input
          type="checkbox"
          checked={filters.showOTOnly}
          onChange={(e) => onUpdateFilter("showOTOnly", e.target.checked)}
          className="rounded border-slate-300"
        />
        OT Only
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
        <input
          type="checkbox"
          checked={filters.hideSecurityGuards}
          onChange={(e) =>
            onUpdateFilter("hideSecurityGuards", e.target.checked)
          }
          className="rounded border-slate-300"
        />
        Hide Guards
      </label>
    </div>
  );
}
