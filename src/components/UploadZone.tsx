"use client";

interface UploadZoneProps {
  file: File | null;
  error: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadZone({ file, error, onFileChange }: UploadZoneProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700">
        Upload Excel File
      </label>
      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all duration-200">
        <div className="flex flex-col items-center justify-center py-6">
          <svg
            className="w-10 h-10 mb-3 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          {file ? (
            <>
              <p className="text-sm font-medium text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Click or drag to upload Excel
              </p>
              <p className="text-xs text-slate-400 mt-1">
                .xlsx, .xls, .csv
              </p>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={onFileChange}
        />
      </label>
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
