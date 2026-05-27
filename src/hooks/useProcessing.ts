"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  UnifiedRow,
  SheetConfig,
  GuardConfig,
} from "@/types/attendance";
import { SHIFT_CONFIGS } from "@/types/attendance";
import { parseSheet } from "@/utils/excelParser";
import { calculateOT } from "@/utils/calculateOT";

export function useProcessing(
  rawSheets: Record<string, unknown[][]>,
  sheetConfigs: SheetConfig[],
  guardConfig: GuardConfig
) {
  const [results, setResults] = useState<UnifiedRow[]>([]);
  const [processing, setProcessing] = useState(false);

  const processAll = useCallback(() => {
    if (!Object.keys(rawSheets).length || !sheetConfigs.length) return;

    setProcessing(true);

    const allRows: UnifiedRow[] = [];

    for (const cfg of sheetConfigs) {
      if (!cfg.enabled) continue;

      const raw = rawSheets[cfg.sheetName];
      if (!raw) continue;

      const parsed = parseSheet(cfg.sheetName, raw, guardConfig);
      const shift = parsed.shiftType;
      const normalEnd = SHIFT_CONFIGS[shift].normalEnd;
      const shiftLabel = SHIFT_CONFIGS[shift].label;

      for (const emp of parsed.employeeData) {
        for (const day of emp.days) {
          const result = calculateOT(normalEnd, day.outTime);

          const hasData =
            day.inTime ||
            day.outTime ||
            day.breakOut1 ||
            day.breakIn1 ||
            day.breakOut2 ||
            day.breakIn2;

          const ot1 = emp.isSecurityGuard ? 0 : result.OT1;
          const ot2 = emp.isSecurityGuard ? 0 : result.OT2;
          const otTotal = ot1 + ot2;

          allRows.push({
            sheetName: cfg.sheetName,
            shift,
            shiftLabel,
            nik: emp.nik,
            name: emp.name,
            department: emp.department,
            position: emp.position,
            isSecurityGuard: emp.isSecurityGuard,
            day: day.day,
            inTime: day.inTime,
            breakOut1: day.breakOut1,
            breakIn1: day.breakIn1,
            breakOut2: day.breakOut2,
            breakIn2: day.breakIn2,
            outTime: day.outTime,
            normalEnd,
            otMinutes: hasData ? Math.round(otTotal * 60) : 0,
            otHours: hasData ? parseFloat(otTotal.toFixed(2)) : 0,
            ot1,
            ot2,
          });
        }
      }
    }

    setResults(allRows);
    setProcessing(false);
  }, [rawSheets, sheetConfigs, guardConfig]);

  return { results, processing, processAll };
}
