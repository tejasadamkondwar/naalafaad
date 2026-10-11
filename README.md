# MediBot

**Team DOOMSDAY** · A safety-first medicine information assistant for India.

MediBot answers questions about medicines using local datasets, but its core design goal is **harm prevention**: it blocks prescription-only (Schedule H) drug queries, refuses personalized treatment advice, escalates serious symptoms, attaches a medical disclaimer to every response, and **never invents prices** when no live pharmacy feed is available.

Built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS 4.

---

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- The three medicine datasets in `data/` (see [Datasets](#datasets)) — they are **not** committed to this repository because they exceed GitHub's file size limits

### Installation

```bash
git clone https://github.com/tejasadamkondwar/NalaFaad.git
cd NalaFaad
npm install
```

Place the dataset files in `data/`:

```
data/
├── A_Z_medicines_dataset_of_India.csv   # A–Z medicines of India (~31 MB)
├── medicine_1mg.csv                     # 1mg catalogue dump (~85 MB)
├── MID.xlsx                             # Mendeley Medicine Information Dataset (~187 MB)
├── mid-index.jsonl                      # Generated MID index (~413 MB) — see scripts/build-mid-index.cjs
└── mid-index-meta.json                  # Generated MID metadata — see scripts/build-mid-metadata.cjs
```

### Run

```bash
npm run dev        # http://localhost:3000
```

### Test & evaluate (with the dev server running in another terminal)

```bash
npm run evaluate       # Full requirements evaluation → artifacts/*.json
npm run test:assistant # Assistant unit tests (safety guard, disclaimers, schema)
npm run test:search    # Search regression tests
npm run bench:csv      # CSV load benchmark
npm run lint           # ESLint
```

Latest requirements evaluation: **25/25 checks passed (100%)** — see [`artifacts/`](./artifacts).

---

## Architecture

```
Browser (Next.js UI: chat + medicine search + reminders)
   │
   ├── GET  /api/medicines/search?q=…      → catalogue search over local CSV/JSONL datasets
   │
   └── POST /api/assistant                 → safety-first answer pipeline
            │
            ├─ 1. Intent classification   (greeting, health education, price, alternatives,
            │                              comparison, treatment request, serious symptom)
            ├─ 2. Safety guard (hard gates, in priority order)
            │      • Schedule H / restricted-ingredient interception → exact warning,
            │        no prices, no substitutes, no composition details
            │      • Personalized treatment request → refusal
            │      • Serious symptom → emergency escalation
            │      • Prescription status "Unverified" → purchase/substitute queries blocked
            ├─ 3. Catalogue lookup        (curated verified entries + dataset matches)
            ├─ 4. Substitutes             (composition-equivalent, curated catalogue only)
            ├─ 5. Partner prices          (only from a configured live feed — otherwise
            │                              status "not measurable"; offers are NEVER fabricated)
            └─ 6. Response                (structured JSON + mandatory disclaimer on every reply)
```

Key files:

| Path | Role |
|------|------|
| `app/page.tsx` | Main UI (chat, search, reminders) |
| `app/api/assistant/route.ts` | Assistant pipeline: intent → safety guard → answer |
| `app/api/medicines/search/route.ts` | Dataset-backed medicine search |
| `app/data/*.ts` | Curated verified medicine catalogue (Schedule H flags, compositions) |
| `app/lib/partner-prices.ts` | Live pharmacy price adapter (empty unless configured) |
| `scripts/` | Evaluation, unit tests, benchmarks, dataset index builders |
| `artifacts/` | Timestamped evaluation reports |

### Response contract (`POST /api/assistant`)

```jsonc
{
  "answer": "…",
  "intent": "medicine_comparison | price_comparison | health_education | …",
  "safety_guard": {
    "blocked": false,
    "reason": "none | known_schedule_h | restricted_ingredient_alias | prescription_status_unverified | personalized_treatment | serious_symptom",
    "detected_medications": [],
    "message": null
  },
  "detected_medication": null,
  "substitutes": [],
  "partner_price_comparison": [],
  "price_data_status": { "status": "not_requested", "message": "…" },
  "disclaimer": "MediBot is an informational tool. It does not diagnose medical conditions or prescribe medications. Users must always consult a qualified medical professional before taking any medication.",
  "sources": null,
  "catalog_matches": []
}
```

## Datasets

| Source | File | Used for |
|--------|------|----------|
| A–Z Medicines Dataset of India | `A_Z_medicines_dataset_of_India.csv` | Broad medicine name coverage |
| Kaggle 1mg catalogue | `medicine_1mg.csv` | Prices/compositions reference |
| Mendeley Medicine Information Dataset (MID) | `mid-index.jsonl` (built from `MID.xlsx`) | Structured medicine information |

Rebuild the MID index after obtaining `MID.xlsx`:

```bash
node scripts/build-mid-index.cjs
node scripts/build-mid-metadata.cjs
```

## Safety & Limitations

- MediBot is an **informational tool**, not a doctor. It does not diagnose or prescribe.
- Every response carries an explicit medical disclaimer.
- Schedule H and other restricted drugs are intercepted with an exact prescription warning — no prices, no substitutes.
- No live pharmacy partner is configured by default, so price queries honestly report that live prices are **not measurable** rather than showing sample values as real quotes.
- Evaluation is finite deterministic prototype testing (`artifacts/`), **not** clinical validation.

## Submitted as a hackathon project solution by Team DOOMSDAY.
