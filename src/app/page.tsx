"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { calculateOTFromMinutes } from "@/utils/calculateOT";
import { isSecurityGuard } from "@/utils/securityGuard";
import {
  type ShiftType,
  SHIFT_CONFIGS,
  DEFAULT_GUARD_KEYWORDS,
} from "@/types/attendance";

const PAGE_SIZE = 50;

function detectShiftType(name: string): ShiftType {
  const u = name.toUpperCase();
  if (u.includes("SHIFT 1") || u.includes("SHIFT1") || u.includes("S1"))
    return "shift1";
  if (u.includes("SHIFT 2") || u.includes("SHIFT2") || u.includes("S2"))
    return "shift2";
  if (u.includes("SHIFT 3") || u.includes("SHIFT3") || u.includes("S3"))
    return "shift3";
  if (u.includes("OFFICE") || u.includes("ADMIN")) return "office";
  return "office";
}

function parseTimeValue(v: unknown): Date | null {
  if (v === undefined || v === null || v === "") return null;
  const str = String(v).trim();
  const m = str.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const d = new Date();
    d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    return d;
  }
  return null;
}

function diffMinutes(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 60000;
}

/* ──────── data processing ──────── */
interface ResultRow {
  sheet: string;
  shift: string;
  employeeId: string;
  name: string;
  department: string;
  date: string;
  [col: string]: string | number;
  total: number;
  ot1: number;
  ot2: number;
  isGuard: string;
}

function processNewFormat(
  sheetName: string,
  raw: unknown[][],
  guardKeywords: string[]
): ResultRow[] {
  if (raw.length < 2) return [];

  const headers = raw[0] as string[];
  const headerUp = headers.map((h) => String(h ?? "").toUpperCase().trim());

  const colEmp =
    headerUp.findIndex(
      (h) =>
        h.includes("EMPLOYEE ID") || h.includes("NIK") || h === "NO" || h === "ID"
    ) ?? 0;
  const colName =
    headerUp.findIndex((h) => h.includes("NAME") || h.includes("NAMA")) ?? 1;
  const colDept =
    headerUp.findIndex(
      (h) => h.includes("DEPARTMENT") || h.includes("DEPT")
    ) ?? 2;
  const colDate =
    headerUp.findIndex(
      (h) => h.includes("DATE") || h.includes("TANGGAL") || h.includes("日期")
    ) ?? 3;

  const colIn = headers.findIndex((h) => String(h).trim() === "1");
  const colOut = headers.findIndex((h) => String(h).trim() === "6");

  const numCols = headers
    .map((h, i) => ({ header: String(h).trim(), index: i }))
    .filter(({ header }) => /^\d+$/.test(header))
    .sort((a, b) => parseInt(a.header) - parseInt(b.header));

  if (colIn === -1 || colOut === -1) return [];

  const shiftType = detectShiftType(sheetName);
  const normalStart = SHIFT_CONFIGS[shiftType].start;
  const normalEnd = SHIFT_CONFIGS[shiftType].normalEnd;
  const shiftLabel = SHIFT_CONFIGS[shiftType].label;

  const out: ResultRow[] = [];

  for (let rIdx = 1; rIdx < raw.length; rIdx++) {
    const row = raw[rIdx] as unknown[];
    const employeeId = String(row[colEmp] ?? "").trim();
    const name = String(row[colName] ?? "").trim();
    if (!employeeId && !name) continue;

    const dept = String(row[colDept] ?? "").trim();
    const date = String(row[colDate] ?? "").trim();
    const isGuard =
      isSecurityGuard(dept, guardKeywords) ||
      isSecurityGuard(name, guardKeywords);

    const displayVals: Record<string, string> = {};
    for (const nc of numCols) {
      displayVals[nc.header] = String(row[nc.index] ?? "");
    }

    let totalOT1 = 0;
    let totalOT2 = 0;

    if (!isGuard) {
      let totalMinutes = 0;

      const actualStart = parseTimeValue(row[colIn]);
      const normStart = parseTimeValue(normalStart);
      if (actualStart && normStart) {
        const early = diffMinutes(actualStart, normStart);
        if (early >= 15) totalMinutes += early;
      }

      const actualEnd = parseTimeValue(row[colOut]);
      const normEnd = parseTimeValue(normalEnd);
      if (actualEnd && normEnd) {
        const late = diffMinutes(normEnd, actualEnd);
        if (late >= 15) totalMinutes += late;
      }

      const res = calculateOTFromMinutes(Math.round(totalMinutes));
      totalOT1 = res.OT1;
      totalOT2 = res.OT2;
    }

    out.push({
      sheet: sheetName,
      shift: shiftLabel,
      employeeId,
      name,
      department: dept,
      date,
      ...displayVals,
      total: Math.round((totalOT1 + totalOT2) * 60),
      ot1: parseFloat(totalOT1.toFixed(2)),
      ot2: parseFloat(totalOT2.toFixed(2)),
      isGuard: isGuard ? "Yes" : "No",
    });
  }

  return out;
}

/* ──────── component ──────── */
export default function Home() {
  const [data, setData] = useState<ResultRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState<ShiftType | "all">("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showOTOnly, setShowOTOnly] = useState(false);
  const [hideGuards, setHideGuards] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [guardKeywords] = useState<string[]>([...DEFAULT_GUARD_KEYWORDS]);

  // day column names from first row
  const dayHeaders = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(
      (k) => !["sheet", "shift", "employeeId", "name", "department", "date", "total", "ot1", "ot2", "isGuard"].includes(k)
    );
  }, [data]);

  const departments = useMemo(
    () => [...new Set(data.map((r) => r.department).filter(Boolean))].sort(),
    [data]
  );

  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((v) => String(v).toLowerCase().includes(q))
      );
    }
    if (shiftFilter !== "all")
      rows = rows.filter((r) => r.shift === SHIFT_CONFIGS[shiftFilter].label);
    if (deptFilter !== "all") rows = rows.filter((r) => r.department === deptFilter);
    if (showOTOnly) rows = rows.filter((r) => r.ot1 > 0 || r.ot2 > 0);
    if (hideGuards) rows = rows.filter((r) => r.isGuard !== "Yes");
    return rows;
  }, [data, search, shiftFilter, deptFilter, showOTOnly, hideGuards]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    return {
      employees: new Set(filtered.map((r) => r.employeeId)).size,
      rows: filtered.length,
      ot1: filtered.reduce((s, r) => s + r.ot1, 0),
      ot2: filtered.reduce((s, r) => s + r.ot2, 0),
      totalMin: filtered.reduce((s, r) => s + r.total, 0),
      guards: filtered.filter((r) => r.isGuard === "Yes").length,
    };
  }, [filtered]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFileName(f.name);
      setError("");
      setProcessing(true);
      setData([]);
      setPage(1);

      try {
        const buffer = await f.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const all: ResultRow[] = [];

        wb.SheetNames.forEach((name) => {
          const ws = wb.Sheets[name];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
          if (raw.length < 2) return;

          const rows = processNewFormat(name, raw, guardKeywords);
          if (rows.length) all.push(...rows);
        });

        if (all.length === 0) {
          setError("No valid attendance data found. Expected headers: Employee ID, Name, Department, Date, and day columns (1,2,3...).");
        }
        setData(all);
      } catch {
        setError("Failed to read file.");
      } finally {
        setProcessing(false);
      }
    },
    [guardKeywords]
  );

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ["Sheet", "Shift", "Employee ID", "Name", "Department", "Date", ...dayHeaders, "Total (min)", "OT1", "OT2"];
    const exportData = filtered.map((r) => {
      const row: Record<string, string | number> = {
        Sheet: r.sheet,
        Shift: r.shift,
        "Employee ID": r.employeeId,
        Name: r.name,
        Department: r.department,
        Date: r.date,
      };
      dayHeaders.forEach((d) => (row[d] = r[d] as string));
      row["Total (min)"] = r.total;
      row.OT1 = r.ot1;
      row.OT2 = r.ot2;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OT Results");
    XLSX.writeFile(wb, "OT_Results.xlsx");
  };

  const goPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Attendance OT Calculator</h1>
            <p className="text-sm text-slate-500">Upload Excel → Auto-calculate OT</p>
          </div>
          {data.length > 0 && (
            <button
              onClick={() => { setData([]); setFileName(""); setSearch(""); setPage(1); }}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
        {/* Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all">
            <div className="flex flex-col items-center justify-center py-6">
              <svg className="w-8 h-8 mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {fileName ? (
                <>
                  <p className="text-sm font-medium text-slate-700">{fileName}</p>
                  <p className="text-xs text-slate-400 mt-1">Click to upload another file</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500">Click to upload Excel file</p>
                  <p className="text-xs text-slate-400 mt-1">.xlsx, .xls</p>
                </>
              )}
            </div>
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
          </label>
          {processing && <div className="mt-4 text-center text-sm text-slate-500">Processing...</div>}
          {error && <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{error}</div>}
        </div>

        {/* Results */}
        {data.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Employees", value: stats.employees },
                { label: "Rows", value: stats.rows },
                { label: "OT1 Total", value: stats.ot1 },
                { label: "OT2 Total", value: stats.ot2 },
                { label: "Total Minutes", value: stats.totalMin },
                { label: "Guards", value: stats.guards },
              ].map((c) => (
                <div key={c.label} className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">{c.label}</div>
                  <div className="text-lg font-bold text-slate-800">{c.value}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Fuzzy search all columns..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 cursor-pointer whitespace-nowrap">
                  Export Excel
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select value={shiftFilter} onChange={(e) => { setShiftFilter(e.target.value as ShiftType | "all"); setPage(1); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                  <option value="all">All Shifts</option>
                  {Object.entries(SHIFT_CONFIGS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
                </select>
                <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                  <option value="all">All Departments</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={showOTOnly} onChange={(e) => { setShowOTOnly(e.target.checked); setPage(1); }} className="rounded" />
                  OT Only
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={hideGuards} onChange={(e) => { setHideGuards(e.target.checked); setPage(1); }} className="rounded" />
                  Hide Guards
                </label>
                {(search || shiftFilter !== "all" || deptFilter !== "all" || showOTOnly || hideGuards) && (
                  <button onClick={() => { setSearch(""); setShiftFilter("all"); setDeptFilter("all"); setShowOTOnly(false); setHideGuards(false); setPage(1); }} className="text-sm text-blue-600 hover:text-blue-700 underline cursor-pointer">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr>
                      {["Sheet", "Shift", "Employee ID", "Name", "Department", "Date", ...dayHeaders, "Total (min)", "OT1", "OT2"].map((h) => (
                        <th key={h} className="px-2 py-2 text-left font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((row, i) => (
                      <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50 transition-colors ${row.isGuard === "Yes" ? "bg-amber-50/40" : ""}`}>
                        <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{row.sheet}</td>
                        <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">{row.shift}</td>
                        <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap font-mono">{row.employeeId}</td>
                        <td className="px-2 py-1.5 text-slate-700 whitespace-nowrap">{row.name}</td>
                        <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{row.department}</td>
                        <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{row.date}</td>
                        {dayHeaders.map((d) => (
                          <td key={d} className="px-2 py-1.5 text-slate-600 whitespace-nowrap">{row[d] as string || "-"}</td>
                        ))}
                        <td className="px-2 py-1.5 text-slate-700 whitespace-nowrap font-medium">{row.total > 0 ? row.total : "-"}</td>
                        <td className="px-2 py-1.5 text-blue-700 whitespace-nowrap font-semibold">{row.ot1 > 0 ? row.ot1 : "-"}</td>
                        <td className="px-2 py-1.5 text-blue-700 whitespace-nowrap font-semibold">{row.ot2 > 0 ? row.ot2 : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <div className="text-sm text-slate-500">
                  {filtered.length > 0 ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1} to ${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}` : "No records"}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => goPage(currentPage - 1)} disabled={currentPage <= 1} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer">Prev</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) p = i + 1;
                    else if (currentPage <= 3) p = i + 1;
                    else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                    else p = currentPage - 2 + i;
                    return (
                      <button key={p} onClick={() => goPage(p)} className={`px-3 py-1.5 text-sm rounded-lg cursor-pointer ${p === currentPage ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>{p}</button>
                    );
                  })}
                  <button onClick={() => goPage(currentPage + 1)} disabled={currentPage >= totalPages} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer">Next</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
