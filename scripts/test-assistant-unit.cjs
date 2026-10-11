#!/usr/bin/env node
/**
 * Fast logic-level checks for the structured assistant API. This loads the TS
 * route in a small VM with a deterministic, in-memory search stub; it does not
 * replace the live API tests in evaluate-requirements.mjs.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = process.cwd();
const appRoot = path.join(root, "app");
const disclaimer = "MediBot is an informational tool. It does not diagnose medical conditions or prescribe medications. Users must always consult a qualified medical professional before taking any medication.";

function loadTypeScript(filename, mocks = {}) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (specifier.startsWith("node:")) return import(specifier);
    if (specifier === "xlsx") throw new Error("xlsx should be mocked for this unit test");
    const resolvedTs = path.resolve(path.dirname(filename), `${specifier}.ts`);
    if (fs.existsSync(resolvedTs)) return loadTypeScript(resolvedTs).default ?? loadTypeScript(resolvedTs);
    throw new Error(`Unexpected test import ${specifier} from ${filename}`);
  };
  const factory = vm.runInThisContext(`(function(require, module, exports, __filename, __dirname) { ${compiled}\n})`, { filename });
  factory(localRequire, module, module.exports, filename, path.dirname(filename));
  return module.exports;
}

function loadData(filename, mocks = {}) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const factory = vm.runInThisContext(`(function(require, module, exports, __filename, __dirname) { ${compiled}\n})`, { filename });
  factory((specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    throw new Error(`Unexpected data import ${specifier}`);
  }, module, module.exports, filename, path.dirname(filename));
  return module.exports;
}

const baseData = loadData(path.join(appRoot, "data", "medicines.ts"));
const extraData = loadData(path.join(appRoot, "data", "medibot-additional-medicines.ts"));
const catalog = [...baseData.medicines, ...extraData.additionalMedicines];
const unverified = {
  name: "Ascoril D Plus Syrup Sugar Free", composition: "", category: "Dataset entry", schedule: "Unverified", mrp: 0,
  alternatives: [], activeIngredients: [], strength: "Unverified", dosageForm: "Syrup", compositionVerified: false, priceComparison: [],
  datasetPrice: 121, manufacturer: "Demo source company", packSize: "100 ml", datasetSource: "A–Z test fixture",
};

const normal = (x) => String(x).toLowerCase().replace(/(\d+(?:\.\d+)?)\s+(mg|mcg|μg|g|gm|ml|iu)\b/gi, "$1$2").replace(/[^a-z0-9.]+/g, " ").replace(/\s+/g, " ").trim();
const mockSearch = {
  GET: async (request) => {
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const q = normal(query);
    const matches = [...catalog, unverified].filter((item) => q.includes(normal(item.name)) || normal(item.name).includes(q));
    return Response.json({
      medicines: matches,
      sources: {
        aToZ: { available: true, records: 253973, file: "A_Z_medicines_dataset_of_India.csv" },
        kaggle250k: { available: false, records: 0, file: "medicine_1mg.csv" },
        mendeleyMID: { available: false, records: 0, file: "MID.xlsx" },
      },
    });
  },
};
const mockPrices = { lookupPartnerPrices: async () => ({ status: "not_configured", offers: [], message: "No live pharmacy partner feed is configured." }) };
const assistantModule = loadTypeScript(path.join(appRoot, "api", "assistant", "route.ts"), {
  "../../data/medicines": baseData,
  "../../data/medibot-additional-medicines": extraData,
  "../medicines/search/route": mockSearch,
  "../../lib/partner-prices": mockPrices,
});
const POST = assistantModule.POST;

async function ask(query, contextMedicineName) {
  const response = await POST(new Request("http://localhost/api/assistant", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, ...(contextMedicineName ? { contextMedicineName } : {}) }),
  }));
  return { status: response.status, body: await response.json() };
}

async function main() {
const tests = [];
const add = (name, pass, details = "") => tests.push({ name, pass: Boolean(pass), details });
const restrictedQueries = [
  "What is Alprazolam 0.5mg?",
  "What is Alprazolam?",
  "Price of Alprazolam 0.5 mg",
  "Alternatives to Augmentin 625",
  "Compare Moxikind-CV 625 with Crocin 650",
  "what about its price?",
];
for (let i = 0; i < restrictedQueries.length; i++) {
  const q = restrictedQueries[i];
  const ctx = i === restrictedQueries.length - 1 ? "Augmentin 625 Duo" : undefined;
  const { status, body } = await ask(q, ctx);
  add(`Schedule H interception: ${q}`, status === 200 && body.safety_guard?.blocked === true && body.safety_guard?.reason === "known_schedule_h" && body.answer === "This medication requires a valid prescription. Please consult your doctor." && body.partner_price_comparison?.length === 0 && body.substitutes?.length === 0, `HTTP ${status}; guard=${body.safety_guard?.reason}`);
}
for (const q of ["What is fever?", "What is a headache?", "Hello", "What is Crocin 650?"]) {
  const { status, body } = await ask(q);
  add(`False-positive control: ${q}`, status === 200 && body.safety_guard?.blocked === false && body.disclaimer === disclaimer, `HTTP ${status}; intent=${body.intent}`);
}
const ingredientGuard = await ask("What is amoxicillin?");
add("Generic restricted-ingredient alias guard", ingredientGuard.body.safety_guard?.blocked === true && ingredientGuard.body.safety_guard?.reason === "restricted_ingredient_alias" && ingredientGuard.body.answer === "This medication requires a valid prescription. Please consult your doctor.", ingredientGuard.body.safety_guard?.reason);
const treatment = await ask("What medicine should I take for a cold?");
add("Personal-treatment request refused", treatment.body.safety_guard?.blocked === true && treatment.body.safety_guard?.reason === "personalized_treatment", treatment.body.intent);
const alternative = await ask("Alternatives to Crocin 650");
add("Alternatives constrained to curated verified data", alternative.body.substitutes?.length > 0 && alternative.body.substitutes.every((item) => item.composition_verified === true && item.strength && item.dosage_form && item.active_ingredients?.length), `returned=${alternative.body.substitutes?.length ?? 0}`);
const unverifiedPrice = await ask("Price of Ascoril D Plus Syrup Sugar Free");
add("Unverified dataset entry cannot trigger purchase price quote", unverifiedPrice.body.safety_guard?.reason === "prescription_status_unverified" && unverifiedPrice.body.partner_price_comparison?.length === 0, unverifiedPrice.body.price_data_status?.status);
const comparison = await ask("Compare Crocin 650 and Dolo 650");
add("Two-product factual comparison", comparison.body.intent === "medicine_comparison" && /Crocin 650/.test(comparison.body.answer) && /Dolo 650/.test(comparison.body.answer) && comparison.body.safety_guard?.blocked === false, comparison.body.intent);
const priceComparison = await ask("Compare prices of Crocin 650 and Dolo 650");
add("Two-product price comparison never invents offers", priceComparison.body.intent === "price_comparison" && Array.isArray(priceComparison.body.partner_price_comparison) && priceComparison.body.partner_price_comparison.length === 0 && priceComparison.body.price_data_status?.status !== "live", priceComparison.body.price_data_status?.status);
const schema = await ask("What is fever?");
add("Required schema fields and exact disclaimer", ["safety_guard", "detected_medication", "substitutes", "partner_price_comparison", "disclaimer"].every((key) => Object.hasOwn(schema.body, key)) && schema.body.disclaimer === disclaimer, "schema keys present");

const failed = tests.filter((test) => !test.pass);
console.log(JSON.stringify({ title: "MediBot structured assistant unit test (in-memory source fixtures)", passed: tests.length - failed.length, total: tests.length, limitation: "Unit fixtures do not validate the real 1mg or MID files, real partner quotes, production routing, or clinical safety.", tests }, null, 2));
if (failed.length) process.exitCode = 1;

}

main().catch((error) => { console.error(error); process.exitCode = 1; });
