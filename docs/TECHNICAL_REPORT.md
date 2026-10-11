# MediBot — Technical Report

**Team:** DOOMSDAY (3 members)
**Submission:** Hackathon project solution — safety-first medicine information assistant

---

## 1. Problem & Scope

Health Q&A bots routinely fail in two dangerous ways: they give personalized medical advice they are not qualified to give, and they fabricate information (including prices) with confident-sounding answers. MediBot is a prototype built around the opposite principle — **a correct refusal is better than a plausible hallucination**.

Scope of the prototype:

- Medicine information lookup over three local Indian medicine datasets
- Structured comparison of two products and composition-equivalent substitutes
- Live price comparison **only** when a real pharmacy feed is configured; otherwise an explicit "not measurable" status
- Hard safety gates for prescription-only drugs, treatment requests, and serious symptoms

Out of scope: diagnosis, prescribing, symptom assessment, clinical validation.

## 2. Requirements → Implementation Map

| ID | Requirement | Implementation | Evaluation |
|----|-------------|----------------|------------|
| A1 | Restricted drug interception | Schedule H / restricted-ingredient alias hard gate returns the exact prescription warning with empty `substitutes` and `partner_price_comparison` | 9/9 passed |
| A2 | No false positives on ordinary queries | Negative controls (general health questions, greetings) must not be blocked | 5/5 passed |
| A3 | Disclaimer coverage | Exact required disclaimer attached to every sampled response | 5/5 passed |
| B1/B2 | Price honesty | No live feed ⇒ `price_data_status.status ≠ "live"`, zero offers; paired price comparison never invents offers | 3/3 passed |
| B3 | Substitute guard | Substitutes limited to composition-equivalent entries from the curated verified catalogue, each with evidence fields | 1/1 passed |
| C1 | Structured comparison | `intent: "medicine_comparison"` with both products described + safety footer | 1/1 passed |
| — | API contract | Required response keys present on every response | passed |
| — | Dataset availability | A–Z, Kaggle 1mg, MID sources detected | passed |

**Latest run: 25/25 checks, 100%** (`artifacts/medibot-requirements-evaluation-*.json`).
*Disclaimer: finite deterministic prototype checks only; not clinical validation.*

## 3. Architecture

```
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4

UI (app/page.tsx)
 ├─ GET  /api/medicines/search  → dataset-backed catalogue search
 └─ POST /api/assistant         → pipeline:
      1. Intent classification
      2. Safety guard (hard gates, priority order)
      3. Catalogue lookup (curated + dataset matches)
      4. Substitutes (verified composition match only)
      5. Partner prices (live adapter or explicit "not measurable")
      6. Structured response + mandatory disclaimer
```

### 3.1 Safety guard priority order

1. **Restricted drugs (Schedule H / ingredient aliases)** — exact warning; no price, substitute, composition, or purchase pathway. Educational questions about antibiotic resistance are deliberately preserved (avoiding over-blocking).
2. **Personalized treatment requests** — refused.
3. **Serious symptoms** — escalation to emergency services, no assessment attempted.
4. **Unverified prescription status** — dataset entries whose product identity/prescription status are not verified cannot trigger purchase comparisons or substitute suggestions.

### 3.2 Data layer

| Source | File | Role |
|--------|------|------|
| A–Z Medicines Dataset of India | `A_Z_medicines_dataset_of_India.csv` (~31 MB) | Broad name coverage |
| Kaggle 1mg catalogue | `medicine_1mg.csv` (~85 MB) | Compositions / pricing reference |
| Mendeley MID | `MID.xlsx` → generated `mid-index.jsonl` (~413 MB) | Structured medicine information |

A small **curated verified catalogue** (`app/data/*.ts`) acts as the trust anchor: safety flags (Schedule H), verified compositions, and strength/dosage-form evidence come from here, not from raw scraped rows.

Datasets are excluded from the repository (individual files exceed GitHub's 100 MB hard limit); the README documents how to rebuild the MID index with `scripts/build-mid-index.cjs`.


## 4. Key Design Trade-offs

| Decision | Alternative rejected | Why |
|----------|----------------------|-----|
| Hard-rule safety gates before answering | LLM-style "answer then filter" | Blocking must be deterministic and testable; filter-after-generate leaks restricted content in the generated text |
| Empty offers when no live feed | Show sample prices labelled "sample" | Sample values get screenshotted and quoted as real prices; "not measurable" is honest |
| Curated catalogue as trust anchor for substitutes | Accept dataset-claimed substitutes | Source-listed substitute names are not proof of equivalent ingredients |
| Exact fixed disclaimer string | Variable disclaimer wording | Enables exact-match regression testing (A3) |
| Regex/keyword intent classification | Model-based intent router | Fully deterministic, offline, zero inference cost; adequate for the bounded intent set |
| Datasets out of Git, rebuild scripts in Git | Commit data | GitHub file-size limits; reproducibility via scripts |

## 5. Evaluation

Scripts (dev server running):

```bash
npm run evaluate        # requirements evaluation → artifacts/
npm run test:assistant  # guard / disclaimer / schema unit tests
npm run test:search     # search regression
npm run bench:csv       # CSV load benchmark
```

Results (latest, `artifacts/`): A1 9/9 · A2 5/5 · A3 5/5 · B1/B2 3/3 · B3 1/1 · C1 1/1 · contract 1/1 · datasets 1/1 — **25/25 (100%)**.

## 6. Limitations & Next Steps

- Intent classification is keyword/rule based; adversarial phrasings outside the test set are not guaranteed to be caught — a model-based classifier with the same hard gates would widen coverage.
- No live pharmacy partner is integrated; the adapter (`app/lib/partner-prices.ts`) is ready for one.
- Price data in the Kaggle 1mg dump is a snapshot, not a live quote, and is surfaced as reference data only.
- Evaluation is finite and deterministic — **not** clinical validation; no claim of medical accuracy is made.
- Next: multilingual (Hindi/Marathi) queries, drug-interaction checks from verified data, deployed demo.

## 7. Team

**DOOMSDAY** — 3 members (builder, safety/eval, design/demo).
Repository: https://github.com/tejasadamkondwar/NalaFaad
