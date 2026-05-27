"use client";

import { useState, useCallback } from "react";
import { parseWorkbook } from "@/utils/excelParser";
import type { WorkbookData } from "@/utils/excelParser";

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      setError("");

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const buffer = ev.target?.result as ArrayBuffer;
          const wb = parseWorkbook(buffer);
          setWorkbook(wb);
        } catch {
          setError("Failed to read file. Please ensure it is a valid Excel file.");
        }
      };
      reader.readAsArrayBuffer(f);
    },
    []
  );

  const reset = useCallback(() => {
    setFile(null);
    setWorkbook(null);
    setError("");
  }, []);

  return { file, workbook, error, handleFileChange, reset };
}
