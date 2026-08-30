import * as XLSX from "xlsx";
import JSZip from "jszip";

/** `TrinityOS_<Module>_YYYY-MM-DD` — the base filename used everywhere data leaves the app (spec Section 58). */
export function businessFilename(moduleLabel: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const pascal = moduleLabel
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
  return `TrinityOS_${pascal}_${date}`;
}

function autoColumnWidths(rows: Record<string, unknown>[]): { wch: number }[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  return headers.map((h) => {
    const longest = rows.reduce((max, r) => Math.max(max, String(r[h] ?? "").length), h.length);
    return { wch: Math.min(60, Math.max(10, longest + 2)) };
  });
}

/** Generic per-module Excel export — header row, auto-sized columns, frozen header row (spec Section 59). */
export function exportToExcel(rows: Record<string, unknown>[], filename: string, sheetName = "Sheet1") {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = autoColumnWidths(rows);
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/** "Export Everything" — one workbook, one sheet per module (spec Sections 55-56). */
export function exportWorkbook(sheets: { name: string; rows: Record<string, unknown>[] }[], filename: string) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "": "No data" }]);
    ws["!cols"] = autoColumnWidths(rows.length ? rows : [{ "": "No data" }]);
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(workbook, ws, name.slice(0, 31));
  });
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Clean UTF-8 CSV — correctly escapes commas, quotes, and embedded line
 * breaks, and works for Tamil/Hindi/English text (spec Section 57). Adds a
 * UTF-8 BOM so Excel on Windows renders non-Latin scripts correctly instead
 * of mojibake.
 */
export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = val == null ? "" : String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\r\n");
}

export function exportToCsv(rows: Record<string, unknown>[], filename: string) {
  const csv = "\uFEFF" + rowsToCsv(rows); // BOM for correct non-Latin rendering in Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * "Export All to CSV" (spec Sections 53, 61) — CSV has no concept of
 * multiple sheets, so every module becomes its own .csv inside one .zip so
 * the person still gets a single download.
 */
export async function exportAllToCsvZip(sheets: { name: string; rows: Record<string, unknown>[] }[], filename: string) {
  const zip = new JSZip();
  sheets.forEach(({ name, rows }) => {
    zip.file(`${name}.csv`, "\uFEFF" + rowsToCsv(rows));
  });
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportPreviewRow {
  raw: Record<string, string>;
  valid: boolean;
  errors: string[];
}

/** Parse a CSV/XLSX file into raw rows for the import wizard's column-mapping step. */
export async function parseSpreadsheetFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  const headers = json.length ? Object.keys(json[0]) : [];
  return { headers, rows: json };
}
