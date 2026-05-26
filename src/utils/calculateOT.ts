export interface OvertimeResult {
  OT1: number;
  OT2: number;
}

export interface Record {
  [key: string]: string | number | undefined;
}

function parseTime(value: string | number | undefined): Date | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    const serial = value;
    const totalSeconds = Math.round((serial - Math.floor(serial)) * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  const str = String(value).trim();

  const excelTimeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
  const match = str.match(excelTimeRegex);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours > 23) return null;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  return null;
}

function diffInMinutes(normal: Date, actual: Date): number {
  return (actual.getTime() - normal.getTime()) / 60000;
}

export function calculateOT(
  normalOut: string | number | undefined,
  actualOut: string | number | undefined
): OvertimeResult {
  const defaultResult: OvertimeResult = { OT1: 0, OT2: 0 };

  const normalDate = parseTime(normalOut);
  const actualDate = parseTime(actualOut);

  if (!normalDate || !actualDate) return defaultResult;

  let diff = diffInMinutes(normalDate, actualDate);

  if (diff < 15) return defaultResult;

  if (diff < 60) return { OT1: 0.5, OT2: 0 };

  if (diff === 60) return { OT1: 1.0, OT2: 0 };

  const OT1 = 1.0;
  const remaining = diff - 60;
  const fullHours = Math.floor(remaining / 60);
  const extra15Units = Math.floor((remaining % 60) / 15);
  const OT2 = fullHours * 1.0 + extra15Units * 0.5;

  return { OT1, OT2 };
}
