import * as XLSX from "xlsx";
import type {
  DayGroup,
  ShiftType,
  ParsedSheet,
  EmployeeRow,
  ColumnMap,
  GuardConfig,
} from "@/types/attendance";
import { SHIFT_CONFIGS, DEFAULT_GUARD_KEYWORDS } from "@/types/attendance";
import { isSecurityGuard } from "./securityGuard";

export interface WorkbookData {
  sheetNames: string[];
  rawSheets: Record<string, unknown[][]>;
}

export function parseWorkbook(buffer: ArrayBuffer): WorkbookData {
  const workbook = XLSX.read(buffer, { type: "array" });
  const rawSheets: Record<string, unknown[][]> = {};
  workbook.SheetNames.forEach((name) => {
    const ws = workbook.Sheets[name];
    rawSheets[name] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  });
  return { sheetNames: workbook.SheetNames, rawSheets };
}

export function autoDetectHeaderRow(rawData: unknown[][]): number {
  const primaryKeywords = ["NIK", "NAMA", "顺序", "工号", "EMPLOYEE NO"];
  const secondaryKeywords = ["NAME", "DEPARTMENT", "POSITION", "LEVEL", "部门", "职位"];

  for (let rowIdx = 0; rowIdx < Math.min(15, rawData.length); rowIdx++) {
    const row = rawData[rowIdx] as unknown[];
    const rowStr = row.map((c) => String(c ?? "").toUpperCase()).join(" ");

    const hasPrimary = primaryKeywords.some((kw) => rowStr.includes(kw));
    if (!hasPrimary) continue;

    const hasSecondary = secondaryKeywords.some((kw) => rowStr.includes(kw));
    if (hasSecondary) {
      return rowIdx;
    }
  }

  for (let rowIdx = 0; rowIdx < Math.min(15, rawData.length); rowIdx++) {
    const row = rawData[rowIdx] as unknown[];
    const rowStr = row.map((c) => String(c ?? "").toUpperCase()).join(" ");
    if (primaryKeywords.some((kw) => rowStr.includes(kw))) {
      return rowIdx;
    }
  }

  return 0;
}

export function autoDetectShiftType(sheetName: string): ShiftType {
  const upper = sheetName.toUpperCase();
  if (upper.includes("SHIFT 1") || upper.includes("SHIFT1") || upper.includes("S1"))
    return "shift1";
  if (upper.includes("SHIFT 2") || upper.includes("SHIFT2") || upper.includes("S2"))
    return "shift2";
  if (upper.includes("SHIFT 3") || upper.includes("SHIFT3") || upper.includes("S3") || upper.includes("NIGHT"))
    return "shift3";
  if (upper.includes("OFFICE") || upper.includes("ADMIN") || upper.includes("STAFF"))
    return "office";
  return "shift1";
}

export function detectColumnMap(
  headerRow: unknown[]
): ColumnMap | null {
  const colMap: Partial<ColumnMap> = {};
  for (let i = 0; i < headerRow.length; i++) {
    const val = String(headerRow[i] ?? "").trim().toUpperCase();
    if (!colMap.nik && (val.includes("NIK") || val.includes("工号") || val === "NO"))
      colMap.nik = i;
    if (!colMap.name && (val.includes("NAMA") || val.includes("NAME") || val.includes("名字")))
      colMap.name = i;
    if (!colMap.department && (val.includes("DEPARTMENT") || val.includes("DEPT") || val.includes("部门")))
      colMap.department = i;
    if (!colMap.position && (val.includes("POSITION") || val.includes("JOB") || val.includes("职位") || val.includes("岗位")))
      colMap.position = i;
  }

  if (!colMap.nik) colMap.nik = 1;
  if (!colMap.name) colMap.name = 2;
  if (!colMap.department) colMap.department = 5;
  if (!colMap.position) colMap.position = 6;

  return colMap as ColumnMap;
}

export function detectDayGroups(headerRow: unknown[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let col = 0;
  while (col < headerRow.length) {
    const val = String(headerRow[col] ?? "").trim();
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 31) {
      const dayStart = col;
      groups.push({
        day: num,
        startCol: dayStart,
        colIn: dayStart + 1,
        colBreakOut1: dayStart + 2,
        colBreakIn1: dayStart + 3,
        colBreakOut2: dayStart + 4,
        colBreakIn2: dayStart + 5,
        colOut: dayStart + 6,
      });
      col += 13;
    } else {
      col++;
    }
  }
  return groups;
}

export function extractEmployeeData(
  rawData: unknown[][],
  headerRowIndex: number,
  dayGroups: DayGroup[],
  guardConfig: GuardConfig
): EmployeeRow[] {
  const headers = rawData[headerRowIndex] as unknown[];
  const colMap = detectColumnMap(headers);
  if (!colMap) return [];

  const dataRows = rawData.slice(headerRowIndex + 1).filter((r) => {
    const row = r as unknown[];
    return (
      row.some((c) => c !== "" && c !== undefined && c !== null) &&
      String(row[0] ?? "").trim() !== ""
    );
  });

  const employees: EmployeeRow[] = [];

  for (const r of dataRows) {
    const row = r as unknown[];
    const nik = String(row[colMap.nik] ?? "").trim();
    const name = String(row[colMap.name] ?? "").trim();

    if (!nik || !name) continue;

    const department = String(row[colMap.department] ?? "").trim();
    const position = String(row[colMap.position] ?? "").trim();
    const isGuard = isSecurityGuard(position, guardConfig.keywords);

    const days = dayGroups.map((dg) => ({
      day: dg.day,
      inTime: String(row[dg.colIn] ?? ""),
      breakOut1: String(row[dg.colBreakOut1] ?? ""),
      breakIn1: String(row[dg.colBreakIn1] ?? ""),
      breakOut2: String(row[dg.colBreakOut2] ?? ""),
      breakIn2: String(row[dg.colBreakIn2] ?? ""),
      outTime: String(row[dg.colOut] ?? ""),
    }));

    employees.push({ nik, name, department, position, isSecurityGuard: isGuard, days });
  }

  return employees;
}

export function parseSheet(
  sheetName: string,
  rawData: unknown[][],
  guardConfig: GuardConfig = { checkColumn: 6, keywords: DEFAULT_GUARD_KEYWORDS }
): ParsedSheet {
  const headerRowIndex = autoDetectHeaderRow(rawData);
  const shiftType = autoDetectShiftType(sheetName);
  const dayGroups = detectDayGroups(rawData[headerRowIndex] as unknown[]);
  const employeeData = extractEmployeeData(rawData, headerRowIndex, dayGroups, guardConfig);
  const columnMap = detectColumnMap(rawData[headerRowIndex] as unknown[]) ?? { nik: 1, name: 2, department: 5, position: 6 };

  return {
    sheetName,
    headerRowIndex,
    shiftType,
    dayGroups,
    employeeData,
    columnMap,
  };
}
