import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Headless runner for the REAL in-page 55-case evaluator (runMediBotEvaluation)
 * that lives inside app/page.tsx. It extracts the pure assistant logic region
 * (no React / no DOM), transpiles it with the project's TypeScript, and executes
 * it. This lets us reproduce the exact UI evaluation score offline, after code
 * changes, without a browser.
 *
 * Usage: node scripts/evaluate-client-logic.mjs
 */

const root = join(import.meta.dirname, "..");
const pagePath = join(root, "app", "page.tsx");
const medicinesPath = join(root, "app", "data", "medicines.ts");
const additionalPath = join(root, "app", "data", "medibot-additional-medicines.ts");

function transpileToJs(source, fileName) {
  const out = transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ModuleKind.ESNext,
      target: ScriptTarget.ES2020,
      jsx: "react-jsx",
      esModuleInterop: true,
      isolatedModules: true,
    },
  });
  return out.outputText;
}

// Extract the pure-logic region between the catalog seed and the end marker.
const pageSource = readFileSync(pagePath, "utf8");
const startMarker = "// Keep the user's existing dataset and append unique starter records only.";
const endMarker = "/* ================= End medicine matching helpers ================= */";
const startIdx = pageSource.indexOf(startMarker);
const endIdx = pageSource.indexOf(endMarker);
if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
  console.error("Could not locate the assistant-logic region inside app/page.tsx.");
  process.exit(2);
}
const logicRegion = pageSource.slice(startIdx, endIdx);

const tmp = mkdtempSync(join(tmpdir(), "medibot-eval-"));
try {
  const medicinesJs = transpileToJs(readFileSync(medicinesPath, "utf8"), "medicines.ts");
  const additionalJs = transpileToJs(readFileSync(additionalPath, "utf8"), "medibot-additional-medicines.ts");

  // Rewrite the two data imports the logic region expects, then append exports
  // for the functions the harness needs to exercise.
  const header =
    'import { medicines } from "./medicines.mjs";\n' +
    'import { additionalMedicines } from "./medibot-additional-medicines.mjs";\n' +
    'import { Medicine } from "./medicines.mjs";\n';
  const footer =
    "\nexport { runMediBotEvaluation, getBotReply, findMedicine, findVerifiedAlternatives, " +
    "sameActiveIngredients, isTreatmentRequest, upsertDatasetMedicines, medicineCatalog };\n" +
    "export const __catalog = () => medicineCatalog;\n";

  const logicJs = transpileToJs(header + logicRegion + footer, "logic.ts");

  writeFileSync(join(tmp, "medicines.mjs"), medicinesJs);
  writeFileSync(join(tmp, "medibot-additional-medicines.mjs"), additionalJs);
  writeFileSync(join(tmp, "logic.mjs"), logicJs);

  const mod = await import(pathToFileURL(join(tmp, "logic.mjs")).href);
  const categories = mod.runMediBotEvaluation();

  let passed = 0;
  let total = 0;
  const summary = categories.map((c) => {
    passed += c.passed;
    total += c.total;
    return { key: c.key, title: c.title, passed: c.passed, total: c.total, value: c.value };
  });

  console.log(JSON.stringify({ summary, passed, total, percent: total ? Math.round((passed / total) * 100) : 0 }, null, 2));

  // Print any failing cases with the actual reply, for diagnosis.
  const failures = categories.flatMap((c) =>
    c.tests.filter((t) => !t.passed).map((t) => ({ category: c.title, query: t.query, actual: t.actual }))
  );
  if (failures.length) {
    console.log("\n=== FAILING CASES ===");
    for (const f of failures) {
      console.log(`\n[${f.category}] ${f.query}\n  -> ${JSON.stringify(f.actual)}`);
    }
  }
  process.exit(0);
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
}
