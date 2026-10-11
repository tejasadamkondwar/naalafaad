import { readFileSync } from "node:fs";
import { join } from "node:path";

// Offline benchmark of the search route's one-time CSV load cost, to quantify
// the cold-start latency that causes first-request timeouts.
const root = join(import.meta.dirname, "..");
const dataDir = join(root, "data");

function forEachCsvRecord(content, onRecord) {
  let headers = null;
  let row = [];
  let field = "";
  let quoted = false;
  const pushField = () => { row.push(field.trim()); field = ""; };
  const pushRow = () => {
    pushField();
    if (!headers) { headers = row.map((h) => h.replace(/^\uFEFF/, "").trim().toLowerCase()); }
    else if (row.some((c) => c.trim() !== "")) {
      const obj = {}; headers.forEach((h, i) => (obj[h] = row[i] ?? "")); onRecord(obj);
    }
    row = [];
  };
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') { if (quoted && content[i + 1] === '"') { field += '"'; i++; } else { quoted = !quoted; } }
    else if (ch === "," && !quoted) { pushField(); }
    else if ((ch === "\n" || ch === "\r") && !quoted) { if (ch === "\r" && content[i + 1] === "\n") i++; pushRow(); }
    else { field += ch; }
  }
  if (field.length > 0 || row.length > 0) pushRow();
}

for (const file of ["A_Z_medicines_dataset_of_India.csv", "medicine_1mg.csv"]) {
  const p = join(dataDir, file);
  const t0 = Date.now();
  const content = readFileSync(p, "utf8");
  const tRead = Date.now();
  let rows = 0;
  forEachCsvRecord(content, () => rows++);
  const tParse = Date.now();
  const mb = (Buffer.byteLength(content, "utf8") / 1048576).toFixed(1);
  console.log(`${file}: ${mb} MB, ${rows} rows | read ${tRead - t0} ms, parse ${tParse - tRead} ms, total ${tParse - t0} ms`);
}
