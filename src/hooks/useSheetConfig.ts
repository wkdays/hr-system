"use client";

import { useState, useCallback } from "react";
import type { SheetConfig, ShiftType } from "@/types/attendance";
import { autoDetectShiftType, autoDetectHeaderRow } from "@/utils/excelParser";

export function useSheetConfig(sheetNames: string[], rawSheets: Record<string, unknown[][]>) {
  const [configs, setConfigs] = useState<SheetConfig[]>(() => {
    if (!sheetNames.length) return [];
    return sheetNames.map((name) => {
      const raw = rawSheets[name];
      const headerRow = raw ? autoDetectHeaderRow(raw) : 0;
      const shiftType = autoDetectShiftType(name);
      return {
        sheetName: name,
        headerRowIndex: headerRow,
        shiftType,
        enabled: true,
        autoDetectedShift: true,
      };
    });
  });

  const updateConfig = useCallback(
    (sheetName: string, updates: Partial<SheetConfig>) => {
      setConfigs((prev) =>
        prev.map((c) => (c.sheetName === sheetName ? { ...c, ...updates } : c))
      );
    },
    []
  );

  const toggleSheet = useCallback((sheetName: string) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.sheetName === sheetName ? { ...c, enabled: !c.enabled } : c
      )
    );
  }, []);

  const enabledConfigs = configs.filter((c) => c.enabled);

  return { configs, enabledConfigs, updateConfig, toggleSheet };
}
