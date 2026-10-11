const baseUrl = (process.env.MEDIBOT_URL || "http://localhost:3000").replace(/\/$/, "");
const requireAll = process.argv.includes("--require-all");

async function main() {
  const statusResponse = await fetch(`${baseUrl}/api/medicines/search?status=1`);
  if (!statusResponse.ok) throw new Error(`Status endpoint returned HTTP ${statusResponse.status}`);
  const status = await statusResponse.json();
  console.log("Dataset file presence:");
  for (const [key, source] of Object.entries(status.sources || {})) {
    console.log(`- ${key}: ${source.available ? "FOUND" : "MISSING"} (${source.file || "unknown file"})`);
  }

  const searchResponse = await fetch(`${baseUrl}/api/medicines/search?q=${encodeURIComponent("Ascoril D Plus Syrup Sugar Free")}`);
  if (!searchResponse.ok) throw new Error(`Search endpoint returned HTTP ${searchResponse.status}`);
  const search = await searchResponse.json();
  if (search.error) throw new Error(search.error);
  const record = (search.medicines || []).find((item) => item.name.toLowerCase() === "ascoril d plus syrup sugar free");
  if (!record) throw new Error("A–Z smoke test failed: Ascoril D Plus Syrup Sugar Free was not returned.");
  console.log("\nA–Z search smoke test: PASS");
  console.log(`Medicine: ${record.name}`);
  console.log(`Reference price: ${record.datasetPrice == null ? "not listed" : `₹${record.datasetPrice} (not live)`}`);
  console.log(`Manufacturer: ${record.manufacturer || "not listed"}`);
  console.log(`Product type: ${record.datasetType || "not listed"}`);
  console.log(`Pack size: ${record.packSize || "not listed"}`);
  console.log(`Prescription status: ${record.schedule}`);
  console.log("\nLoaded source rows:");
  for (const [key, source] of Object.entries(search.sources || {})) {
    console.log(`- ${key}: ${source.available ? `${source.records ?? "unknown"} rows` : `not loaded${source.error ? ` — ${source.error}` : ""}`}`);
  }

  const missing = Object.entries(search.sources || {}).filter(([, source]) => !source.available).map(([key]) => key);
  if (missing.length) {
    console.warn(`\nMissing dataset source(s): ${missing.join(", ")}. See README_DATASET_INTEGRATION.md for downloads and expected filenames.`);
  }
  if (requireAll && missing.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Dataset integration check failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
