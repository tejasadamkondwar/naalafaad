MediBot missing assistant API files

WHY
The unit test error means scripts/test-assistant-unit.cjs was copied but app/api/assistant/route.ts was not. The assistant API route also imports app/lib/partner-prices.ts.

APPLY
1. Extract this ZIP into your project root: C:\Users\ACER\c language\medibot (the folder containing package.json).
2. Merge folders. It adds only these paths:
   app/api/assistant/route.ts
   app/lib/partner-prices.ts
3. Do not extract into app/ itself; avoid creating app/app.
4. Confirm app/data/medibot-additional-medicines.ts exists, because the route imports it.
5. Run: node scripts/test-assistant-unit.cjs
6. After that, run: npm run build

The unit test uses in-memory sample fixtures. Passing tests do not prove real dataset loading, clinical safety, live prices, or partner integration. The partner-price adapter intentionally returns no live offers until an authorised API endpoint and approved pharmacy host allowlist are configured.
