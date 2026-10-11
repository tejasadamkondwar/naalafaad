# MediBot — MID Offline Index Fix

## Why this version is safer

The raw `MID.xlsx` workbook is about 196 MB and has very long text fields. Parsing the whole workbook inside the medicine-search HTTP request caused the request to exceed its 120-second timeout. This version **does not parse `MID.xlsx` during a live API request**.

Instead, `scripts/build-mid-index.cjs` streams the workbook once and creates `data/mid-index.jsonl`. The API then loads only medicine names and byte offsets into memory, and reads detailed text only for medicines returned by a search.

## Apply these two files

1. Back up `app/api/medicines/search/route.ts`.
2. Copy the replacement `app/api/medicines/search/route.ts` into your project at the same path.
3. Copy `scripts/build-mid-index.cjs` into your project's `scripts` folder. Create `scripts` if it does not exist.
4. Do **not** copy the whole `MediBot_MID_Streaming_Parser_Fix` folder into your project. Copy only the two files above to their matching paths.

ExcelJS must be installed in the project. You already ran `npm install exceljs`, so do not reinstall it unless Node reports that the module is missing.

## Build the MID index offline

From the project root (the folder containing `package.json`), run:

```powershell
node .\scripts\build-mid-index.cjs
```

This can take several minutes. It should print progress every 10,000 medicine rows and write `data\mid-index.jsonl`. Let it finish; do not start a second copy of the script at the same time.

If it succeeds, run:

```powershell
npm run build
```

Then start MediBot:

```powershell
npm run dev
```

## Verify

In a second PowerShell terminal, check dataset status:

```powershell
Invoke-RestMethod "http://127.0.0.1:3000/api/medicines/search?status=1" | ConvertTo-Json -Depth 5
```

`mendeleyMID.available` should be `true` only when the prepared JSONL exists. Then run:

```powershell
$r = Invoke-RestMethod "http://127.0.0.1:3000/api/medicines/search?q=Andol%200.5mg%20Tablet" -TimeoutSec 30
$r.sources.mendeleyMID | ConvertTo-Json -Depth 5
$r.medicines | Select-Object -First 5 name, datasetSource, composition | Format-List
```

The source's `records` value should be nonzero if rows were prepared. The matching result might also contain entries from A–Z or Kaggle; the data source labels show which source contributed to each result.

## Important data and safety notes

- `CONTAINS` is source-provided composition text, not independently verified ingredient equivalence.
- MID entries remain `Unverified` unless the curated catalogue has an established classification.
- Source substitute text is not treated as verified therapeutic equivalence.
- The MID workbook is not a live pharmacy-price feed. This patch does not create or claim real-time prices.
- The index preserves only bounded text fields needed for search and general medicine information; `HOW_TO_USE` is intentionally not imported as dosing advice.
