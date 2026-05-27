"use client";

import type { SheetConfig, ShiftType } from "@/types/attendance";
import { SHIFT_CONFIGS } from "@/types/attendance";

interface SheetConfigPanelProps {
  configs: SheetConfig[];
  onUpdateConfig: (sheetName: string, updates: Partial<SheetConfig>) => void;
  onToggleSheet: (sheetName: string) => void;
}

export function SheetConfigPanel({
  configs,
  onUpdateConfig,
  onToggleSheet,
}: SheetConfigPanelProps) {
  if (!configs.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">
        Sheet Configuration ({configs.length} sheets found)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configs.map((cfg) => (
          <div
            key={cfg.sheetName}
            className={`p-4 rounded-lg border transition-all ${
              cfg.enabled
                ? "bg-white border-slate-200"
                : "bg-slate-50 border-slate-200 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-800 text-sm">
                {cfg.sheetName}
              </h4>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={() => onToggleSheet(cfg.sheetName)}
                  className="rounded border-slate-300"
                />
                <span className="text-xs text-slate-500">
                  {cfg.enabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>

            {cfg.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Shift Type
                  </label>
                  <select
                    value={cfg.shiftType}
                    onChange={(e) =>
                      onUpdateConfig(cfg.sheetName, {
                        shiftType: e.target.value as ShiftType,
                      })
                    }
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {Object.entries(SHIFT_CONFIGS).map(([key, conf]) => (
                      <option key={key} value={key}>
                        {conf.label} ({conf.normalEnd})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Header Row
                  </label>
                  <input
                    type="number"
                    value={cfg.headerRowIndex}
                    onChange={(e) =>
                      onUpdateConfig(cfg.sheetName, {
                        headerRowIndex: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={0}
                  />
                </div>

                {cfg.autoDetectedShift && (
                  <p className="text-xs text-blue-600">
                    Shift type auto-detected from sheet name
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
