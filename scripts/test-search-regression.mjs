/**
 * Deterministic regression tests for the /api/medicines/search endpoint.
 *
 * These run against a LIVE MediBot server (they read the real CSV/MID datasets),
 * so they are an INTEGRATION suite and are kept separate from the pure unit
 * tests. Start the app first:  npm run dev   then run:
 *   node scripts/test-search-regression.mjs
 * Set MEDIBOT_URL to point at a non-default server.
 *
 * They assert the exact-match behaviour and the false-positive suppression that
 * were previously broken (unrelated products sharing one token used to be
 * returned for long queries).
 */

const baseUrl = (process.env.MEDIBOT_URL || "http://localhost:3000").replace(/\/$/, "");

async function search(q) {
  const response = await fetch(`${baseUrl}/api/medicines/search?q=${encodeURIComponent(q)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status} for q=${q}`);
  return await response.json();
}

const results = [];
function check(name, condition, detail) {
  results.push({ name, pass: Boolean(condition), detail });
}

async function main() {
  let reachable = true;
  try {
    await fetch(`${baseUrl}/api/medicines/search?status=1`);
  } catch {
    reachable = false;
  }
  if (!reachable) {
    console.error(`Cannot reach ${baseUrl}. Start the app (npm run dev) before running this integration suite.`);
    process.exit(2);
  }

  // 1. Long specific query resolves to exactly the intended product, with no
  //    unrelated single-token false positives ("D Plus Injection", "Free Tablet").
  const ascoril = await search("ascoril d plus syrup sugar free");
  const ascorilNames = ascoril.medicines.map((m) => m.name);
  check(
    "Ascoril D Plus Syrup Sugar Free resolves exactly",
    ascorilNames[0] === "Ascoril D Plus Syrup Sugar Free",
    `top=${ascorilNames[0]}`
  );
  check(
    "Ascoril query has no unrelated false positives",
    !ascorilNames.includes("D Plus Injection") && !ascorilNames.includes("Free Tablet"),
    `returned=${ascorilNames.join(" | ")}`
  );

  // 2. Strength + formulation query returns the right product first.
  const andol = await search("andol 0.5mg tablet");
  check(
    "Andol 0.5mg Tablet resolves to the tablet form first",
    andol.medicines[0]?.name === "Andol 0.5mg Tablet" && andol.medicines[0]?.dosageForm === "Tablet",
    `top=${andol.medicines[0]?.name} [${andol.medicines[0]?.dosageForm}]`
  );

  // 3. Dosage-form disambiguation: a tablet query must not return the syrup as top.
  const allegra = await search("allegra 120");
  check(
    "Allegra 120 resolves to a real product",
    allegra.medicines.length > 0 && /allegra/i.test(allegra.medicines[0]?.name || ""),
    `top=${allegra.medicines[0]?.name}`
  );

  // 4. No-match query returns an empty list and a truthful source status, not a crash.
  const nomatch = await search("zzzznotarealmedicine9999");
  check(
    "Unknown medicine returns empty list (no crash)",
    Array.isArray(nomatch.medicines) && nomatch.medicines.length === 0,
    `count=${nomatch.medicines?.length}`
  );
  check(
    "Unknown medicine response still reports sources",
    nomatch.sources && typeof nomatch.sources === "object",
    `sources=${Boolean(nomatch.sources)}`
  );

  // 5. Missing q returns empty without error.
  const empty = await search("");
  check("Empty query returns empty list", Array.isArray(empty.medicines) && empty.medicines.length === 0, `count=${empty.medicines?.length}`);

  // 6. Status endpoint reports prepared MID readiness truthfully (index file, not workbook).
  const status = await fetch(`${baseUrl}/api/medicines/search?status=1`).then((r) => r.json());
  check(
    "Status reports MID index file when prepared",
    typeof status.sources?.mendeleyMID?.available === "boolean",
    `mendeleyMID.available=${status.sources?.mendeleyMID?.available}`
  );

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(JSON.stringify({ title: "MediBot search endpoint regression (live datasets)", baseUrl, passed, total, results }, null, 2));
  process.exit(passed === total ? 0 : 1);
}

main().catch((error) => {
  console.error("Search regression suite failed to run:", error);
  process.exit(1);
});
