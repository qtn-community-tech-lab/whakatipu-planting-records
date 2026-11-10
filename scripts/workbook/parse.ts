/**
 * Minimal RFC 4180 CSV parser: quoted fields, escaped quotes ("") and
 * newlines inside quotes. No dependency, because the inputs are small (< 1 MB)
 * and fully known.
 */
export interface CsvTable<Row extends Record<string, string | undefined> = Record<string, string>> {
  header: string[];
  /** Each row keyed by header name. */
  rows: Row[];
  /** 1-based source line of each row (for error messages). */
  lines: number[];
}

export function parseCsv(text: string): CsvTable {
  const records: string[][] = [];
  const recordLines: number[] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let line = 1;
  let recordStart = 1;
  // strip BOM
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const c = src.charAt(i);
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (c === "\n") line++;
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      record.push(field);
      field = "";
      records.push(record);
      recordLines.push(recordStart);
      record = [];
      line++;
      recordStart = line;
    } else {
      field += c;
    }
  }
  if (inQuotes) throw new Error(`Unterminated quoted field starting near line ${recordStart}`);
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
    recordLines.push(recordStart);
  }

  // drop fully blank trailing lines
  while (records.at(-1)?.every((f) => f === "")) {
    records.pop();
    recordLines.pop();
  }
  const first = records[0];
  if (!first) return { header: [], rows: [], lines: [] };

  const header = first.map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  const lines: number[] = [];
  for (const [r, rec] of records.entries()) {
    if (r === 0) continue;
    if (rec.length === 1 && rec[0] === "") continue;
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = rec[idx] ?? "";
    });
    if (rec.length !== header.length) {
      obj.__fieldCount = String(rec.length);
    }
    rows.push(obj);
    lines.push(recordLines[r] ?? 1);
  }
  return { header, rows, lines };
}
