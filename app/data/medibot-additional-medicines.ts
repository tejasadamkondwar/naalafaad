import type { Medicine } from "./medicines";

/**
 * Starter/demo catalog additions for MediBot.
 * These entries are intentionally NOT composition-verified, so the alternative
 * matcher will never recommend them as composition-equivalent substitutions.
 * MRP is set to 0 to mean "not verified"; prices below are illustrative sample
 * data and are not live pharmacy quotes. Verify each real product label and local
 * prescription classification before using this catalog beyond a demo.
 */
export const additionalMedicines: Medicine[] = [
  {
    name: "Paracetamol 500 mg Tablet",
    composition: "Paracetamol 500 mg; generic starter record — confirm the exact product label.",
    category: "Analgesic / antipyretic (general information only)",
    schedule: "OTC",
    mrp: 0,
    alternatives: [],
    activeIngredients: ["paracetamol"],
    strength: "500 mg",
    dosageForm: "tablet",
    compositionVerified: false,
    priceComparison: [
      { platform: "Tata 1mg (demo)", price: 12, inStock: true, delivery: "2–3 days (demo)" },
      { platform: "PharmEasy (demo)", price: 14, inStock: true, delivery: "2–4 days (demo)" },
      { platform: "Apollo 24|7 (demo)", price: 11, inStock: true, delivery: "1–3 days (demo)" },
    ],
  },
  {
    name: "ORS Powder (Oral Rehydration Salts)",
    composition: "Oral rehydration salts powder; ingredients, sachet size, and mixing instructions vary by product—follow the packet label.",
    category: "Oral rehydration salts",
    schedule: "OTC",
    mrp: 0,
    alternatives: [],
    activeIngredients: ["glucose", "sodium chloride", "potassium chloride", "trisodium citrate dihydrate"],
    strength: "Product-specific; check sachet label",
    dosageForm: "powder for oral solution",
    compositionVerified: false,
    priceComparison: [
      { platform: "Tata 1mg (demo)", price: 22, inStock: true, delivery: "2–3 days (demo)" },
      { platform: "PharmEasy (demo)", price: 25, inStock: true, delivery: "2–4 days (demo)" },
      { platform: "Apollo 24|7 (demo)", price: 20, inStock: true, delivery: "1–3 days (demo)" },
    ],
  },
  {
    name: "Calamine Lotion",
    composition: "Calamine-based topical lotion; additional ingredients and concentrations vary by manufacturer.",
    category: "Topical skin protectant",
    schedule: "OTC",
    mrp: 0,
    alternatives: [],
    activeIngredients: ["calamine"],
    strength: "Product-specific; check label",
    dosageForm: "lotion",
    compositionVerified: false,
    priceComparison: [
      { platform: "Tata 1mg (demo)", price: 48, inStock: true, delivery: "2–3 days (demo)" },
      { platform: "PharmEasy (demo)", price: 52, inStock: true, delivery: "2–4 days (demo)" },
      { platform: "Apollo 24|7 (demo)", price: 45, inStock: true, delivery: "1–3 days (demo)" },
    ],
  },
  {
    name: "Povidone-Iodine 10% Solution",
    composition: "Povidone-iodine 10% topical solution; confirm the exact formulation and intended use on the product label.",
    category: "Topical antiseptic",
    schedule: "OTC",
    mrp: 0,
    alternatives: [],
    activeIngredients: ["povidone-iodine"],
    strength: "10%",
    dosageForm: "topical solution",
    compositionVerified: false,
    priceComparison: [
      { platform: "Tata 1mg (demo)", price: 39, inStock: true, delivery: "2–3 days (demo)" },
      { platform: "PharmEasy (demo)", price: 43, inStock: true, delivery: "2–4 days (demo)" },
      { platform: "Apollo 24|7 (demo)", price: 37, inStock: true, delivery: "1–3 days (demo)" },
    ],
  },
  {
    name: "Zinc Oxide Ointment",
    composition: "Zinc-oxide-based ointment; concentration and additional ingredients vary by manufacturer.",
    category: "Topical skin protectant",
    schedule: "OTC",
    mrp: 0,
    alternatives: [],
    activeIngredients: ["zinc oxide"],
    strength: "Product-specific; check label",
    dosageForm: "ointment",
    compositionVerified: false,
    priceComparison: [
      { platform: "Tata 1mg (demo)", price: 32, inStock: true, delivery: "2–3 days (demo)" },
      { platform: "PharmEasy (demo)", price: 35, inStock: true, delivery: "2–4 days (demo)" },
      { platform: "Apollo 24|7 (demo)", price: 30, inStock: true, delivery: "1–3 days (demo)" },
    ],
  },
  {
    name: "Sodium Chloride 0.65% Nasal Spray",
    composition: "Sodium chloride 0.65% nasal spray; check the individual product label for the complete formulation.",
    category: "Nasal saline product",
    schedule: "OTC",
    mrp: 0,
    alternatives: [],
    activeIngredients: ["sodium chloride"],
    strength: "0.65%",
    dosageForm: "nasal spray",
    compositionVerified: false,
    priceComparison: [
      { platform: "Tata 1mg (demo)", price: 68, inStock: true, delivery: "2–3 days (demo)" },
      { platform: "PharmEasy (demo)", price: 72, inStock: true, delivery: "2–4 days (demo)" },
      { platform: "Apollo 24|7 (demo)", price: 65, inStock: true, delivery: "1–3 days (demo)" },
    ],
  },
  {
    name: "Vitamin C 500 mg Tablet",
    composition: "Ascorbic acid (vitamin C) 500 mg; generic starter record — check the exact product label.",
    category: "Vitamin supplement",
    schedule: "OTC",
    mrp: 0,
    alternatives: [],
    activeIngredients: ["ascorbic acid"],
    strength: "500 mg",
    dosageForm: "tablet",
    compositionVerified: false,
    priceComparison: [
      { platform: "Tata 1mg (demo)", price: 34, inStock: true, delivery: "2–3 days (demo)" },
      { platform: "PharmEasy (demo)", price: 37, inStock: true, delivery: "2–4 days (demo)" },
      { platform: "Apollo 24|7 (demo)", price: 31, inStock: true, delivery: "1–3 days (demo)" },
    ],
  },
];
