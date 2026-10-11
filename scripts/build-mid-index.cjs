const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const ExcelJS = require('exceljs');

const root = process.cwd();
const dataDir = path.join(root, 'data');
const input = [
  path.join(dataDir, 'MID.xlsx'),
  path.join(dataDir, 'MID (1).xlsx'),
  path.join(dataDir, 'Medicines Information Dataset.xlsx'),
].find((file) => fs.existsSync(file));
const outputPath = path.join(dataDir, 'mid-index.jsonl');
const tempOutput = `${outputPath}.tmp`;

if (!input) {
  console.error('Could not find MID.xlsx in the project data folder.');
  process.exit(1);
}

function cellText(value, maxLength = 300) {
  if (value == null) return '';
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return cleanText(value.text, maxLength);
    if (Array.isArray(value.richText)) {
      return cleanText(value.richText.map((part) => String(part?.text ?? '')).join(''), maxLength);
    }
    if (value.result !== undefined) return cellText(value.result, maxLength);
    if (value.hyperlink && value.text) return cleanText(value.text, maxLength);
    return '';
  }
  return cleanText(value, maxLength);
}

function cleanText(value, maxLength) {
  const text = String(value ?? '').trim();
  if (!text || /^(?:nan|null|none|n\/a|na|not available)$/i.test(text)) return '';
  return text.slice(0, maxLength);
}

function headerKey(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findColumn(headers, aliases) {
  const normalized = headers.map(headerKey);
  for (const alias of aliases) {
    const index = normalized.findIndex((header) => header === headerKey(alias));
    if (index >= 0) return index;
  }
  return -1;
}

function valueAt(values, index, maxLength) {
  return index < 0 ? '' : cellText(values[index], maxLength);
}

function columnsFor(headers) {
  return {
    name: findColumn(headers, ['name', 'medicine name', 'drug name']),
    composition: findColumn(headers, ['contains', 'salt composition', 'composition', 'active ingredient', 'active ingredients']),
    introduction: findColumn(headers, ['introduction', 'description', 'drug introduction']),
    uses: findColumn(headers, ['uses', 'indications', 'use']),
    benefits: findColumn(headers, ['benefits']),
    sideEffects: findColumn(headers, ['side effect', 'side_effect', 'side effects', 'side_effects', 'sideeffects']),
    howItWorks: findColumn(headers, ['how works', 'how_works', 'how the drug works', 'how drug works', 'how it works', 'mechanism of action']),
    quickTips: findColumn(headers, ['quick tips', 'quick_tips']),
    chemicalClass: findColumn(headers, ['chemical class', 'chemical_class']),
    therapeuticClass: findColumn(headers, ['therapeutic class', 'therapeutic_class']),
    actionClass: findColumn(headers, ['action class', 'action_class']),
    habitForming: findColumn(headers, ['habit forming', 'habit_forming']),
    alcoholSafety: findColumn(headers, ['safety advice to alcohol', 'alcohol safety']),
    drivingSafety: findColumn(headers, ['safety advice to driving', 'driving safety']),
    pregnancySafety: findColumn(headers, ['safety advice to pregnancy', 'pregnancy safety']),
    breastfeedingSafety: findColumn(headers, ['safety advice to breast feeding', 'safety advice to breastfeeding', 'breastfeeding safety']),
    kidneySafety: findColumn(headers, ['safety advice to kidney', 'kidney safety']),
    liverSafety: findColumn(headers, ['safety advice to liver', 'safety advice to the liver', 'liver safety']),
  };
}

async function writeLine(stream, value) {
  if (!stream.write(`${JSON.stringify(value)}\n`)) await once(stream, 'drain');
}

async function main() {
  console.log(`Reading source workbook: ${input}`);
  console.log('The first load may take several minutes. This is an offline preparation step, not a website request.');
  const writer = fs.createWriteStream(tempOutput, { encoding: 'utf8', flags: 'w' });
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(input, {
    worksheets: 'emit',
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'ignore',
  });

  let headers = null;
  let columns = null;
  let records = 0;
  let missingNames = 0;
  try {
    for await (const worksheet of reader) {
      console.log(`Reading worksheet: ${worksheet.name}`);
      for await (const row of worksheet) {
        const values = Array.isArray(row.values) ? row.values : [];
        if (!headers) {
          // ExcelJS row.values uses one-based cell positions; index 0 is blank.
          headers = values.map((value) => cellText(value, 200));
          columns = columnsFor(headers);
          if (columns.name < 0) {
            throw new Error(`Could not find the medicine name column. Headers: ${headers.map((v) => v || '(blank)').join(', ')}`);
          }
          console.log('Found medicine name column. Starting index generation...');
          continue;
        }

        const name = valueAt(values, columns.name, 300);
        if (!name) {
          missingNames += 1;
          continue;
        }
        const details = {
          composition: valueAt(values, columns.composition, 400),
          introduction: valueAt(values, columns.introduction, 250),
          uses: valueAt(values, columns.uses, 350),
          benefits: valueAt(values, columns.benefits, 250),
          sideEffects: valueAt(values, columns.sideEffects, 350),
          howItWorks: valueAt(values, columns.howItWorks, 250),
          quickTips: valueAt(values, columns.quickTips, 150),
          chemicalClass: valueAt(values, columns.chemicalClass, 100),
          therapeuticClass: valueAt(values, columns.therapeuticClass, 100),
          actionClass: valueAt(values, columns.actionClass, 100),
          habitForming: valueAt(values, columns.habitForming, 80),
          alcoholSafety: valueAt(values, columns.alcoholSafety, 120),
          drivingSafety: valueAt(values, columns.drivingSafety, 120),
          pregnancySafety: valueAt(values, columns.pregnancySafety, 120),
          breastfeedingSafety: valueAt(values, columns.breastfeedingSafety, 120),
          kidneySafety: valueAt(values, columns.kidneySafety, 120),
          liverSafety: valueAt(values, columns.liverSafety, 120),
        };
        await writeLine(writer, { name, details });
        records += 1;
        if (records % 10000 === 0) console.log(`Prepared ${records.toLocaleString()} medicine rows...`);
      }
      // The supplied MID workbook uses a single worksheet.
      break;
    }
  } catch (error) {
    writer.destroy();
    try { fs.unlinkSync(tempOutput); } catch {}
    throw error;
  }

  writer.end();
  await once(writer, 'finish');
  if (!records) {
    try { fs.unlinkSync(tempOutput); } catch {}
    throw new Error('No medicine rows were written; refusing to publish an empty MID index.');
  }
  // Publish atomically only after the full workbook has been indexed, so an
  // interrupted run can never leave a truncated mid-index.jsonl behind.
  fs.renameSync(tempOutput, outputPath);
  const stat = fs.statSync(outputPath);
  console.log('\nMID index preparation completed.');
  console.log(`Medicine rows: ${records.toLocaleString()}`);
  console.log(`Rows without a medicine name (skipped): ${missingNames.toLocaleString()}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Output size: ${(stat.size / (1024 * 1024)).toFixed(1)} MB`);
  console.log('You can now restart MediBot; live medicine searches will use the prepared index.');
}

main().catch((error) => {
  console.error('\nMID index preparation failed:', error?.stack || error);
  process.exitCode = 1;
});
