import { DEFAULT_GUARD_KEYWORDS } from "@/types/attendance";

export function isSecurityGuard(
  position: string,
  keywords: string[] = DEFAULT_GUARD_KEYWORDS
): boolean {
  if (!position) return false;
  const upper = position.toUpperCase().trim();
  return keywords.some((kw) => upper.includes(kw.toUpperCase().trim()));
}
