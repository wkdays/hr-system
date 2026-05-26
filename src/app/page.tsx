"use client";

import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { calculateOT } from "@/utils/calculateOT";

type ShiftType = "shift1" | "shift2" | "shift3" | "office";

const SHIFT_CONFIG: Record<ShiftType, { label: string; normalEnd: string }> = {
  shift1: { label: "Shift 1 (06:00-14:00)", normalEnd: "14:00" },
  shift2: { label: "Shift 2 (14:00-22:00)", normalEnd: "22:00" },
  shift3: { label: "Shift 3 (22:00-06:00)", normalEnd: "06:00" },
  office: { label: "Office (07:30-17:00)", normalEnd: "17:00" },
};

interface SheetConfig {
  sheetName: string;
  headerRow: number;
  shiftType: ShiftType;
  outColumn: string;
  columnNames: string[];
}

interface ProcessedRow {
  sheet: string;
  shift: string;
  nik: string;
  nama: string;
  normalOut: string;
  actualOut: string;
  OT1: number;
  OT2: number;
  raw: Record<string, unknown>;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [rawPreview, setRawPreview] = useState<string[][]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [columnNames, setColumnNames] = useState<string[]>([]);
  const [shiftType, setShiftType] = useState<ShiftType>("shift1");
  const [outColumn, setOutColumn] = useState("");
  const [configs, setConfigs] = useState<SheetConfig[]>([]);
  const [results, setResults] = useState<ProcessedRow[]>([]);
  const [previewRows, setPreviewRows] = useState<ProcessedRow[]>([]);
  const [processed, setProcessed] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<
    "upload" | "config" | "done"
  >("upload");
  const rawDataRef = useRef<Record<string, unknown[][]>>({});

  const SHIFT_KEYS: ShiftType[] = ["shift1", "shift2", "shift3", "office"];

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      setError("");
      setProcessed(false);
      setResults([]);
      setConfigs([]);
      setStep("upload");

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const buffer = ev.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: "array" });
          const names = workbook.SheetNames;
          setSheets(names);

          const allRaw: Record<string, unknown[][]> = {};
          names.forEach((name) => {
            const ws = workbook.Sheets[name];
            const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, {
              header: 1,
              defval: "",
            });
            allRaw[name] = raw;
          });
          rawDataRef.current = allRaw;

          if (names.length > 0) {
            setSelectedSheet(names[0]);
            loadSheetPreview(allRaw, names[0]);
          }
        } catch {
          setError("无法读取文件内容");
        }
      };
      reader.readAsArrayBuffer(f);
    },
    []
  );

  const loadSheetPreview = (allRaw: Record<string, unknown[][]>, name: string) => {
    const raw = allRaw[name];
    if (!raw) return;
    const sample = raw.slice(0, 15).map((r) =>
      (r as unknown[]).map((c) => String(c))
    );
    setRawPreview(sample);
    setHeaderRow(0);
    setColumnNames([]);
    setOutColumn("");
    setShiftType("shift1");
  };

  const handleSheetChange = (name: string) => {
    setSelectedSheet(name);
    loadSheetPreview(rawDataRef.current, name);
    setStep("upload");
  };

  const handleApplyHeaderRow = useCallback(() => {
    const allRaw = rawDataRef.current;
    const raw = allRaw[selectedSheet];
    if (!raw || raw.length === 0) return;

    if (headerRow < 0 || headerRow >= raw.length) {
      setError(`行号 ${headerRow} 超出范围 (0-${raw.length - 1})`);
      return;
    }

    const headers = raw[headerRow] as unknown[];
    const unique = headers.map((h, i) => {
      const label = String(h ?? "").trim();
      return label ? `${label}[${i}]` : `Col_${i}`;
    });
    setColumnNames(unique);
    setOutColumn("");
    setError("");
    setStep("config");
  }, [selectedSheet, headerRow]);

  const handleAddConfig = useCallback(() => {
    if (!outColumn) {
      setError("请选择下班打卡时间列");
      return;
    }
    if (!selectedSheet) {
      setError("请选择数据表");
      return;
    }

    const exists = configs.find(
      (c) => c.sheetName === selectedSheet && c.shiftType === shiftType
    );
    if (exists) {
      setError(`表 "${selectedSheet}" 的 ${SHIFT_CONFIG[shiftType].label} 已添加`);
      return;
    }

    setConfigs((prev) => [
      ...prev,
      {
        sheetName: selectedSheet,
        headerRow,
        shiftType,
        outColumn,
        columnNames,
      },
    ]);
    setError("");
  }, [outColumn, selectedSheet, shiftType, configs, headerRow, columnNames]);

  const handleRemoveConfig = (idx: number) => {
    setConfigs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProcess = useCallback(async () => {
    if (configs.length === 0) {
      setError("请至少添加一个班次配置");
      return;
    }

    try {
      const allResults: ProcessedRow[] = [];

      for (const cfg of configs) {
        const raw = rawDataRef.current[cfg.sheetName];
        if (!raw) continue;

        const headers = raw[cfg.headerRow] as unknown[];
        const colKeys = headers.map((h, i) => {
          const label = String(h ?? "").trim();
          return label || `Col_${i}`;
        });

        const outIdx = cfg.columnNames.indexOf(cfg.outColumn);
        if (outIdx === -1) continue;

        const dataRows = raw.slice(cfg.headerRow + 1).filter((r) => {
          const row = r as unknown[];
          return (
            row.some((c) => c !== "" && c !== undefined && c !== null) &&
            String(row[0] ?? "").trim() !== ""
          );
        });

        const normalEnd = SHIFT_CONFIG[cfg.shiftType].normalEnd;

        for (const r of dataRows) {
          const row = r as unknown[];
          const actualVal = row[outIdx] as string | number | undefined;

          const result = calculateOT(normalEnd, actualVal);

          const record: Record<string, unknown> = {};
          colKeys.forEach((key, i) => {
            record[key] = row[i] ?? "";
          });

          allResults.push({
            sheet: cfg.sheetName,
            shift: SHIFT_CONFIG[cfg.shiftType].label,
            nik: String(row[1] ?? ""),
            nama: String(row[2] ?? ""),
            normalOut: normalEnd,
            actualOut: String(actualVal ?? ""),
            OT1: result.OT1,
            OT2: result.OT2,
            raw: record,
          });
        }
      }

      setResults(allResults);
      setPreviewRows(allResults.slice(0, 10));
      setProcessed(true);
      setStep("done");
      setError("");
    } catch {
      setError("处理失败，请检查配置");
    }
  }, [configs]);

  const handleDownload = useCallback(() => {
    if (results.length === 0) return;

    const exportData = results.map((r) => ({
      班次: r.shift,
      NIK: r.nik,
      姓名: r.nama,
      正常下班: r.normalOut,
      实际打卡: r.actualOut,
      OT1: r.OT1,
      OT2: r.OT2,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OT Results");
    XLSX.writeFile(wb, "OT_calculation_results.xlsx");
  }, [results]);

  const totalRows = results.length;
  const totalOT1 = results.reduce((s, r) => s + r.OT1, 0);
  const totalOT2 = results.reduce((s, r) => s + r.OT2, 0);

  return (
    <main className="min-h-screen flex items-start justify-center pt-6 px-4 pb-12">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-semibold text-slate-800 mb-2">
          考勤加班计算工具
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          支持多班次（Shift 1 / Shift 2 / Shift 3 / Office）
        </p>

        <div className="space-y-6">
          {/* Step 1: Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ① 选择文件
            </label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex flex-col items-center justify-center">
                <svg
                  className="w-7 h-7 mb-1 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-sm text-slate-500">
                  {file ? file.name : "点击上传 Excel"}
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {sheets.length > 0 && (
            <>
              {/* Sheet selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ② 选择数据表
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {sheets.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleSheetChange(name)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                        selectedSheet === name
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {/* Raw preview + header row */}
                {rawPreview.length > 0 && step !== "done" && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ③ 设置标题行（选择哪一行作为列名）
                    </label>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm text-slate-500">
                        标题行号：
                      </span>
                      <input
                        type="number"
                        value={headerRow}
                        onChange={(e) =>
                          setHeaderRow(Number(e.target.value))
                        }
                        className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={0}
                        max={rawPreview.length - 1}
                      />
                      <span className="text-xs text-slate-400">
                        （0 ~ {rawPreview.length - 1}）
                      </span>
                      <button
                        onClick={handleApplyHeaderRow}
                        className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        应用
                      </button>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-48">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-2 py-1 text-left font-medium text-slate-500 border-r border-slate-200 w-12">
                              #
                            </th>
                            {rawPreview[0]
                              ?.slice(0, 12)
                              .map((_, ci) => (
                                <th
                                  key={ci}
                                  className="px-2 py-1 text-left font-medium text-slate-500 whitespace-nowrap border-r border-slate-200"
                                >
                                  {ci}
                                </th>
                              ))}
                            {rawPreview[0]?.length > 12 && (
                              <th className="px-2 py-1 text-left font-medium text-slate-400">
                                ...
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {rawPreview.map((row, ri) => (
                            <tr
                              key={ri}
                              className={`border-b border-slate-100 ${
                                ri === headerRow
                                  ? "bg-blue-50 font-semibold"
                                  : ""
                              }`}
                            >
                              <td className="px-2 py-1 text-slate-400 border-r border-slate-200">
                                {ri}
                              </td>
                              {row.slice(0, 12).map((cell, ci) => (
                                <td
                                  key={ci}
                                  className="px-2 py-1 text-slate-600 whitespace-nowrap border-r border-slate-200 max-w-40 truncate"
                                >
                                  {cell}
                                </td>
                              ))}
                              {row.length > 12 && (
                                <td className="px-2 py-1 text-slate-400">
                                  ...
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Step: config */}
              {step === "config" && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 mb-3">
                    ④ 配置班次
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        班次类型
                      </label>
                      <select
                        value={shiftType}
                        onChange={(e) =>
                          setShiftType(e.target.value as ShiftType)
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {SHIFT_KEYS.map((key) => (
                          <option key={key} value={key}>
                            {SHIFT_CONFIG[key].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        下班打卡时间列
                      </label>
                      <select
                        value={outColumn}
                        onChange={(e) => setOutColumn(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">-- 请选择 --</option>
                        {columnNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddConfig}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        添加到处理队列
                      </button>
                    </div>
                  </div>

                  {/* Config queue */}
                  {configs.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-slate-700 mb-2">
                        已配置（{configs.length} 个班次）
                      </h3>
                      <div className="space-y-1">
                        {configs.map((cfg, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm"
                          >
                            <span>
                              <strong>{cfg.sheetName}</strong> →{" "}
                              {SHIFT_CONFIG[cfg.shiftType].label}
                              <span className="text-slate-400 ml-2">
                                (下班列: {cfg.outColumn})
                              </span>
                            </span>
                            <button
                              onClick={() => handleRemoveConfig(i)}
                              className="text-red-500 hover:text-red-700 text-xs cursor-pointer"
                            >
                              移除
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {configs.length > 0 && (
                    <button
                      onClick={handleProcess}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      开始计算（{configs.length} 个班次）
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Results */}
          {processed && step === "done" && (
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-semibold text-slate-700">
                    计算结果（共 {totalRows} 条）
                  </h2>
                  <span className="text-xs text-slate-500">
                    OT1 合计:{" "}
                    <strong className="text-blue-600">{totalOT1}</strong>
                  </span>
                  <span className="text-xs text-slate-500">
                    OT2 合计:{" "}
                    <strong className="text-blue-600">{totalOT2}</strong>
                  </span>
                </div>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg font-medium hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  下载计算结果 (Excel)
                </button>
              </div>

              {/* Summary by shift */}
              {SHIFT_KEYS.map((key) => {
                const rows = results.filter((r) =>
                  r.shift.includes(SHIFT_CONFIG[key].label)
                );
                if (rows.length === 0) return null;
                const sOT1 = rows.reduce((s, r) => s + r.OT1, 0);
                const sOT2 = rows.reduce((s, r) => s + r.OT2, 0);
                return (
                  <div
                    key={key}
                    className="text-xs text-slate-500 mb-2 bg-slate-50 px-3 py-1.5 rounded-lg"
                  >
                    {SHIFT_CONFIG[key].label}: {rows.length} 人 · OT1={sOT1}{" "}
                    · OT2={sOT2}
                  </div>
                );
              })}

              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-96">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap border-b border-slate-200">
                        班次
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap border-b border-slate-200">
                        NIK
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap border-b border-slate-200">
                        姓名
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap border-b border-slate-200">
                        正常下班
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap border-b border-slate-200">
                        实际打卡
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap border-b border-slate-200">
                        OT1
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap border-b border-slate-200">
                        OT2
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {row.shift}
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {row.nik}
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {row.nama}
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {row.normalOut}
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {row.actualOut}
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap font-medium text-blue-600">
                          {row.OT1}
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap font-medium text-blue-600">
                          {row.OT2}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => {
                  setStep("upload");
                  setProcessed(false);
                  setResults([]);
                  setPreviewRows([]);
                  setConfigs([]);
                }}
                className="mt-4 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                重新开始
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
