import * as XLSX from "xlsx";
import type { UnifiedRow } from "@/types/attendance";

const ENGLISH_HEADERS: Record<keyof UnifiedRow, string> = {
  sheetName: "Sheet Name",
  shift: "Shift",
  shiftLabel: "Shift Label",
  nik: "NIK",
  name: "Name",
  department: "Department",
  position: "Position",
  isSecurityGuard: "Security Guard",
  day: "Day",
  inTime: "Clock In",
  breakOut1: "Break Out 1",
  breakIn1: "Break In 1",
  breakOut2: "Break Out 2",
  breakIn2: "Break In 2",
  outTime: "Clock Out",
  normalEnd: "Normal End",
  otMinutes: "OT Minutes",
  otHours: "OT Hours",
  ot1: "OT1",
  ot2: "OT2",
};

export function exportToExcel(
  data: UnifiedRow[],
  filename = "OT_Calculation_Results.xlsx",
  options: { excludeGuards?: boolean } = {}
): void {
  const filtered = options.excludeGuards
    ? data.filter((r) => !r.isSecurityGuard)
    : data;

  const exportData = filtered.map((r) => ({
    [ENGLISH_HEADERS.sheetName]: r.sheetName,
    [ENGLISH_HEADERS.shift]: r.shiftLabel,
    [ENGLISH_HEADERS.nik]: r.nik,
    [ENGLISH_HEADERS.name]: r.name,
    [ENGLISH_HEADERS.department]: r.department,
    [ENGLISH_HEADERS.position]: r.position,
    [ENGLISH_HEADERS.isSecurityGuard]: r.isSecurityGuard ? "Yes" : "No",
    [ENGLISH_HEADERS.day]: `Day ${r.day}`,
    [ENGLISH_HEADERS.inTime]: r.inTime,
    [ENGLISH_HEADERS.breakOut1]: r.breakOut1,
    [ENGLISH_HEADERS.breakIn1]: r.breakIn1,
    [ENGLISH_HEADERS.breakOut2]: r.breakOut2,
    [ENGLISH_HEADERS.breakIn2]: r.breakIn2,
    [ENGLISH_HEADERS.outTime]: r.outTime,
    [ENGLISH_HEADERS.normalEnd]: r.normalEnd,
    [ENGLISH_HEADERS.otMinutes]: r.otMinutes,
    [ENGLISH_HEADERS.otHours]: r.otHours,
    [ENGLISH_HEADERS.ot1]: r.ot1,
    [ENGLISH_HEADERS.ot2]: r.ot2,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "OT Results");
  XLSX.writeFile(wb, filename);
}
