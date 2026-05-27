"use client";

import { useState, useMemo, useCallback } from "react";
import type {
  UnifiedRow,
  FilterState,
  PaginationState,
  TableStats,
} from "@/types/attendance";

export function useDataTable(data: UnifiedRow[]) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    shiftFilter: "all",
    departmentFilter: "all",
    showOTOnly: false,
    hideSecurityGuards: false,
  });

  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 50,
    totalRows: 0,
  });

  const departments = useMemo(
    () => [...new Set(data.map((r) => r.department).filter(Boolean))].sort(),
    [data]
  );

  const filtered = useMemo(() => {
    let rows = data;

    if (filters.search.trim()) {
      const search = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.nik.toLowerCase().includes(search) ||
          r.name.toLowerCase().includes(search) ||
          r.department.toLowerCase().includes(search)
      );
    }

    if (filters.shiftFilter !== "all") {
      rows = rows.filter((r) => r.shift === filters.shiftFilter);
    }

    if (filters.departmentFilter !== "all") {
      rows = rows.filter((r) => r.department === filters.departmentFilter);
    }

    if (filters.showOTOnly) {
      rows = rows.filter((r) => r.ot1 > 0 || r.ot2 > 0);
    }

    if (filters.hideSecurityGuards) {
      rows = rows.filter((r) => !r.isSecurityGuard);
    }

    return rows;
  }, [data, filters]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pagination.pageSize)),
    [filtered.length, pagination.pageSize]
  );

  const currentPage = Math.min(pagination.currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pagination.pageSize;
    return filtered.slice(start, start + pagination.pageSize);
  }, [filtered, currentPage, pagination.pageSize]);

  const stats: TableStats = useMemo(() => {
    const totalEmployees = new Set(filtered.map((r) => r.nik)).size;
    const securityGuardCount = filtered.filter((r) => r.isSecurityGuard).length;
    const totalOT1 = filtered.reduce((s, r) => s + r.ot1, 0);
    const totalOT2 = filtered.reduce((s, r) => s + r.ot2, 0);
    const totalOTMinutes = filtered.reduce((s, r) => s + r.otMinutes, 0);

    return {
      totalEmployees,
      totalRows: filtered.length,
      totalOT1,
      totalOT2,
      totalOTMinutes,
      securityGuardCount,
    };
  }, [filtered]);

  const goToPage = useCallback(
    (page: number) => {
      setPagination((prev) => ({
        ...prev,
        currentPage: Math.max(1, Math.min(page, totalPages)),
      }));
    },
    [totalPages]
  );

  const goNext = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);
  const goPrev = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);

  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  return {
    filtered,
    paginated,
    filters,
    updateFilter,
    pagination: { ...pagination, currentPage, totalPages },
    goToPage,
    goNext,
    goPrev,
    stats,
    departments,
  };
}
