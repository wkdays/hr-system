export type ShiftType = "shift1" | "shift2" | "shift3" | "office";

export interface ShiftConfig {
  key: ShiftType;
  label: string;
  normalEnd: string;
  start: string;
}

export const SHIFT_CONFIGS: Record<ShiftType, ShiftConfig> = {
  shift1: { key: "shift1", label: "Shift 1", normalEnd: "14:00", start: "06:00" },
  shift2: { key: "shift2", label: "Shift 2", normalEnd: "22:00", start: "14:00" },
  shift3: { key: "shift3", label: "Shift 3", normalEnd: "06:00", start: "22:00" },
  office: { key: "office", label: "Office", normalEnd: "17:00", start: "07:30" },
};

export interface DayGroup {
  day: number;
  startCol: number;
  colIn: number;
  colBreakOut1: number;
  colBreakIn1: number;
  colBreakOut2: number;
  colBreakIn2: number;
  colOut: number;
}

export interface SheetConfig {
  sheetName: string;
  headerRowIndex: number;
  shiftType: ShiftType;
  enabled: boolean;
  autoDetectedShift: boolean;
}

export interface GuardConfig {
  checkColumn: number;
  keywords: string[];
}

export const DEFAULT_GUARD_KEYWORDS = [
  "SECURITY",
  "GUARD",
  "SATPAM",
  "保安",
  "SECURITY GUARD",
  "PENGAMAN",
];

export interface ParsedSheet {
  sheetName: string;
  headerRowIndex: number;
  shiftType: ShiftType;
  dayGroups: DayGroup[];
  employeeData: EmployeeRow[];
  columnMap: ColumnMap;
}

export interface ColumnMap {
  nik: number;
  name: number;
  department: number;
  position: number;
}

export interface EmployeeRow {
  nik: string;
  name: string;
  department: string;
  position: string;
  isSecurityGuard: boolean;
  days: DayRecord[];
}

export interface DayRecord {
  day: number;
  inTime: string;
  breakOut1: string;
  breakIn1: string;
  breakOut2: string;
  breakIn2: string;
  outTime: string;
}

export interface UnifiedRow {
  sheetName: string;
  shift: ShiftType;
  shiftLabel: string;
  nik: string;
  name: string;
  department: string;
  position: string;
  isSecurityGuard: boolean;
  day: number;
  inTime: string;
  breakOut1: string;
  breakIn1: string;
  breakOut2: string;
  breakIn2: string;
  outTime: string;
  normalEnd: string;
  otMinutes: number;
  otHours: number;
  ot1: number;
  ot2: number;
}

export interface FilterState {
  search: string;
  shiftFilter: ShiftType | "all";
  departmentFilter: string;
  showOTOnly: boolean;
  hideSecurityGuards: boolean;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalRows: number;
}

export interface TableStats {
  totalEmployees: number;
  totalRows: number;
  totalOT1: number;
  totalOT2: number;
  totalOTMinutes: number;
  securityGuardCount: number;
}
