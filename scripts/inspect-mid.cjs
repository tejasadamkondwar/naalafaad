/**
 * Stream-inspect a large MID.xlsx workbook without loading worksheet XML
 * into a single giant string. Run from the MediBot project root:
 *   node scripts/inspect-mid.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const workbookPath = path.resolve(process.cwd(), 'data', 'MID.xlsx');
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found: ${workbookPath}`);
  }

  let ExcelJS;
  try {
    ExcelJS = require('exceljs');
  } catch {
    throw new Error('Missing dependency. From your project root run: npm install exceljs');
  }

  console.log(`Streaming workbook: ${workbookPath}`);
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(workbookPath, {
    worksheets: 'emit',
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'ignore',
  });

  let worksheetCount = 0;
  for await (const worksheet of reader) {
    worksheetCount += 1;
    console.log(`\nWorksheet ${worksheetCount}: ${worksheet.name}`);
    let shown = 0;
    for await (const row of worksheet) {
      const values = Array.isArray(row.values) ? row.values : [];
      const clean = values.map((value) => {
        if (value && typeof value === 'object') {
          if (typeof value.text === 'string') return value.text;
          if (value.richText) return value.richText.map((part) => part.text || '').join('');
          if (value.result !== undefined) return value.result;
          return JSON.stringify(value);
        }
        return value ?? '';
      });
      console.log(`Row ${row.number}: ${JSON.stringify(clean.slice(0, 50))}`);
      shown += 1;
      if (shown >= 3) break;
    }
    // We only need one worksheet's first three rows for column discovery.
    break;
  }
  if (!worksheetCount) {
    throw new Error('The streaming reader did not emit any worksheet. The file may be malformed or use an unsupported Excel feature.');
  }
}

main().catch((error) => {
  console.error('\nMID inspection failed:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
