"use client";

import { useState } from "react";
import { DEFAULT_GUARD_KEYWORDS } from "@/types/attendance";

interface SecurityGuardConfigProps {
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
}

export function SecurityGuardConfig({
  keywords,
  onKeywordsChange,
}: SecurityGuardConfigProps) {
  const [newKeyword, setNewKeyword] = useState("");

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      onKeywordsChange([...keywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => {
    onKeywordsChange(keywords.filter((k) => k !== kw));
  };

  const resetDefaults = () => {
    onKeywordsChange([...DEFAULT_GUARD_KEYWORDS]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Security Guard Detection
        </h3>
        <button
          onClick={resetDefaults}
          className="text-xs text-blue-600 hover:text-blue-700 underline cursor-pointer"
        >
          Reset Defaults
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Employees with positions matching these keywords will be excluded from overtime calculations.
      </p>

      <div className="flex flex-wrap gap-2">
        {keywords.map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200"
          >
            {kw}
            <button
              onClick={() => removeKeyword(kw)}
              className="text-amber-500 hover:text-amber-700 cursor-pointer"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addKeyword()}
          placeholder="Add keyword..."
          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addKeyword}
          className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
        >
          Add
        </button>
      </div>
    </div>
  );
}
