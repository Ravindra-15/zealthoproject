/**
 * ============================================
 * CSV UTILS — shared builder
 * ============================================
 * Plain string-building, no library — same approach already used by
 * progressCsvExport.service.js, generalized here for reuse by any new
 * export (e.g. admin User Directory export).
 * ============================================
 */

const escapeCsvField = (val) => {
  const s = String(val ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (headers, rows) => {
  const lines = [headers.map(escapeCsvField).join(",")];
  rows.forEach((row) => lines.push(row.map(escapeCsvField).join(",")));
  return lines.join("\r\n");
};

module.exports = { escapeCsvField, toCsv };
