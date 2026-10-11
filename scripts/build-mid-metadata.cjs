const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const dataDir = path.join(process.cwd(), 'data');
const input = path.join(dataDir, 'mid-index.jsonl');
const output = path.join(dataDir, 'mid-index-meta.json');
const tempOutput = `${output}.tmp`;

function cleanText(value, maxLength = 300) {
  const text = String(value ?? '').trim();
  if (!text || /^(?:nan|null|none|n\/a|na|not available)$/i.test(text)) return '';
  return text.slice(0, maxLength);
}

function nameKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/(\d+(?:\.\d+)?)\s*(?:mg|mcg|μg|g|gm|ml|iu)\b/gi, '$1')
    .replace(/\b(?:tablets?|tabs?|capsules?|caps?|syrup|suspension|injections?|solution|drops?|cream|ointment|gel|spray|powder|oral\s+suspension)\b/gi, ' ')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  if (!fs.existsSync(input)) {
    throw new Error(`Prepared MID JSONL not found: ${input}. Run node scripts/build-mid-index.cjs first.`);
  }
  console.log(`Building compact MID metadata from ${input}`);
  console.log('This scans the existing large file once. It does not read MID.xlsx or make an HTTP request.');
  const stream = fs.createReadStream(input, { encoding: 'utf8' });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const byKey = new Map();
  let records = 0;
  let offset = 0;
  let lineNo = 0;

  try {
    for await (const line of lines) {
      lineNo += 1;
      const byteLength = Buffer.byteLength(line, 'utf8');
      if (line.trim()) {
        let parsed;
        try { parsed = JSON.parse(line); }
        catch (error) { throw new Error(`Invalid JSON at line ${lineNo}: ${error.message}`); }
        const name = cleanText(parsed?.name, 300);
        if (name) {
          records += 1;
          const key = nameKey(name);
          if (key) byKey.set(key, [key, name, offset, byteLength]);
        }
      }
      offset += byteLength + 1; // JSONL builder writes one LF byte after each record.
      if (records && records % 25000 === 0) console.log(`Scanned ${records.toLocaleString()} medicine rows...`);
    }

    if (!records || !byKey.size) throw new Error('No valid medicine rows were found in mid-index.jsonl.');
    const payload = JSON.stringify({ version: 1, records, entries: [...byKey.values()] });
    fs.writeFileSync(tempOutput, payload, { encoding: 'utf8' });
    fs.renameSync(tempOutput, output);
    const stat = fs.statSync(output);
    console.log('\nMID metadata completed successfully.');
    console.log(`Rows scanned: ${records.toLocaleString()}`);
    console.log(`Unique normalized medicine names: ${byKey.size.toLocaleString()}`);
    console.log(`Metadata file: ${output}`);
    console.log(`Metadata size: ${(stat.size / (1024 * 1024)).toFixed(1)} MB`);
  } catch (error) {
    try { fs.unlinkSync(tempOutput); } catch {}
    throw error;
  } finally {
    lines.close();
    stream.destroy();
  }
}

main().catch((error) => {
  console.error('\nMID metadata preparation failed:', error?.stack || error);
  process.exitCode = 1;
});
