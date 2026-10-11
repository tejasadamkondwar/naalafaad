export type PharmacyPrice = {

  platform: string;

  price: number;

  inStock: boolean;

  delivery: string;

};




export type Medicine = {
  name: string;
  composition: string;
  category: string;
  schedule: "OTC" | "Schedule H" | "Unverified";
  mrp: number;
  alternatives: string[];
  activeIngredients: string[];
  strength: string;
  dosageForm: string;
  compositionVerified: boolean;
  priceComparison: PharmacyPrice[];

  // Dataset reference information — not live pharmacy data
  datasetPrice?: number;
  datasetComposition?: string;
  datasetType?: string;
  manufacturer?: string;
  packSize?: string;
  datasetSource?: string;

  // Additional medicine information from source datasets
  datasetUses?: string;
  datasetBenefits?: string;
  datasetIntroduction?: string;
  datasetSideEffects?: string;
  datasetHowItWorks?: string;
  datasetQuickTips?: string;

  // Safety information from source datasets
  datasetSafetyPregnancy?: string;
  datasetSafetyBreastfeeding?: string;
  datasetSafetyKidney?: string;
  datasetSafetyLiver?: string;
  datasetSafetyAlcohol?: string;
  datasetSafetyDriving?: string;
  datasetHabitForming?: string;

  // Medicine classifications
  datasetChemicalClass?: string;
  datasetTherapeuticClass?: string;
  datasetActionClass?: string;

  // Source-listed substitutes are candidates, not verified equivalents
  datasetListedSubstitutes?: string[];
};




export const medicines: Medicine[] = [

  {

    name: "Crocin 650",

    composition: "Paracetamol 650mg",

    category: "Analgesic / Fever Reducer",

    schedule: "OTC",

    mrp: 30,

    alternatives: ["Dolo 650"],

    activeIngredients: ["Paracetamol"],

    strength: "650mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 30, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 28, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 32, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 29, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Dolo 650",

    composition: "Paracetamol 650mg",

    category: "Analgesic / Fever Reducer",

    schedule: "OTC",

    mrp: 30,

    alternatives: ["Crocin 650"],

    activeIngredients: ["Paracetamol"],

    strength: "650mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 29, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 31, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 33.5, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 27, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Allegra 120",

    composition: "Fexofenadine 120mg",

    category: "Antihistamine",

    schedule: "OTC",

    mrp: 180,

    alternatives: [],

    activeIngredients: ["Fexofenadine"],

    strength: "120mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 178, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 172, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 185, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 169, inStock: false, delivery: "3-5 days" },

    ],

  },



  {

    name: "Augmentin 625 Duo",

    composition: "Amoxicillin 500mg + Clavulanic Acid 125mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 223.5,

    alternatives: ["Moxikind-CV 625", "Clavam 625"],

    activeIngredients: ["Amoxicillin", "Clavulanic Acid"],

    strength: "500mg + 125mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 223.5, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 215, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 220, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 218, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Moxikind-CV 625",

    composition: "Amoxicillin 500mg + Clavulanic Acid 125mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 151.2,

    alternatives: ["Augmentin 625 Duo", "Clavam 625"],

    activeIngredients: ["Amoxicillin", "Clavulanic Acid"],

    strength: "500mg + 125mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 151.2, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 145, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 149, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 147, inStock: false, delivery: "3-5 days" },

    ],

  },



  {

    name: "Clavam 625",

    composition: "Amoxicillin 500mg + Clavulanic Acid 125mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 168,

    alternatives: ["Augmentin 625 Duo", "Moxikind-CV 625"],

    activeIngredients: ["Amoxicillin", "Clavulanic Acid"],

    strength: "500mg + 125mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 168, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 162, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 165, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 160, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Alprazolam 0.5mg",

    composition: "Alprazolam 0.5mg",

    category: "Anxiolytic",

    schedule: "Schedule H",

    mrp: 85,

    alternatives: [],

    activeIngredients: ["Alprazolam"],

    strength: "0.5mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 85, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 82, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 84, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 80, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Calpol 650",

    composition: "Paracetamol 650mg",

    category: "Analgesic / Fever Reducer",

    schedule: "OTC",

    mrp: 30,

    alternatives: ["Crocin 650", "Dolo 650"],

    activeIngredients: ["Paracetamol"],

    strength: "650mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 30, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 28, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 32, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 29, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Combiflam",

    composition: "Ibuprofen 400mg + Paracetamol 325mg",

    category: "Analgesic / Anti-inflammatory",

    schedule: "OTC",

    mrp: 44,

    alternatives: [],

    activeIngredients: ["Ibuprofen", "Paracetamol"],

    strength: "400mg + 325mg",

    dosageForm: "Tablet",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 44, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 42, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 46, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 43, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Saridon",

    composition: "Paracetamol 300mg + Propyphenazone 150mg + Caffeine 50mg",

    category: "Analgesic",

    schedule: "OTC",

    mrp: 32,

    alternatives: [],

    activeIngredients: ["Paracetamol", "Propyphenazone", "Caffeine"],

    strength: "300mg + 150mg + 50mg",

    dosageForm: "Tablet",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 32, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 30, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 34, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 31, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Brufen 400",

    composition: "Ibuprofen 400mg",

    category: "NSAID / Analgesic",

    schedule: "OTC",

    mrp: 39,

    alternatives: ["Ibugesic 400"],

    activeIngredients: ["Ibuprofen"],

    strength: "400mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 39, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 37, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 41, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 38, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Ibugesic 400",

    composition: "Ibuprofen 400mg",

    category: "NSAID / Analgesic",

    schedule: "OTC",

    mrp: 37,

    alternatives: ["Brufen 400"],

    activeIngredients: ["Ibuprofen"],

    strength: "400mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 37, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 35, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 39, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 36, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Meftal 500",

    composition: "Mefenamic Acid 500mg",

    category: "Analgesic / Anti-inflammatory",

    schedule: "OTC",

    mrp: 55,

    alternatives: [],

    activeIngredients: ["Mefenamic Acid"],

    strength: "500mg",

    dosageForm: "Tablet",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 55, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 52, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 57, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 54, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Cetzine",

    composition: "Cetirizine 10mg",

    category: "Antihistamine",

    schedule: "OTC",

    mrp: 30,

    alternatives: ["Alerid"],

    activeIngredients: ["Cetirizine"],

    strength: "10mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 30, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 28, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 32, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 29, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Alerid",

    composition: "Cetirizine 10mg",

    category: "Antihistamine",

    schedule: "OTC",

    mrp: 28,

    alternatives: ["Cetzine"],

    activeIngredients: ["Cetirizine"],

    strength: "10mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 28, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 26, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 30, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 27, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Fexo 120",

    composition: "Fexofenadine 120mg",

    category: "Antihistamine",

    schedule: "OTC",

    mrp: 175,

    alternatives: ["Allegra 120"],

    activeIngredients: ["Fexofenadine"],

    strength: "120mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 175, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 169, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 182, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 172, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Gelusil MPS",

    composition:

      "Aluminium Hydroxide 250mg + Magnesium Hydroxide 250mg + Simethicone 50mg",

    category: "Antacid",

    schedule: "OTC",

    mrp: 55,

    alternatives: [],

    activeIngredients: ["Aluminium Hydroxide", "Magnesium Hydroxide", "Simethicone"],

    strength: "250mg + 250mg + 50mg",

    dosageForm: "Tablet",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 55, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 53, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 58, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 54, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Otrivin",

    composition: "Xylometazoline 0.1%",

    category: "Nasal Decongestant",

    schedule: "OTC",

    mrp: 95,

    alternatives: [],

    activeIngredients: ["Xylometazoline"],

    strength: "0.1%",

    dosageForm: "Nasal Spray",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 95, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 92, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 99, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 93, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Sinarest",

    composition:

      "Paracetamol 325mg + Phenylephrine 5mg + Chlorpheniramine Maleate 2mg",

    category: "Cold & Cough Relief",

    schedule: "OTC",

    mrp: 95,

    alternatives: [],

    activeIngredients: ["Paracetamol", "Phenylephrine", "Chlorpheniramine Maleate"],

    strength: "325mg + 5mg + 2mg",

    dosageForm: "Tablet",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 95, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 90, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 98, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 92, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Ecosprin 75",

    composition: "Aspirin 75mg",

    category: "Antiplatelet",

    schedule: "OTC",

    mrp: 12,

    alternatives: [],

    activeIngredients: ["Aspirin"],

    strength: "75mg",

    dosageForm: "Tablet",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 12, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 11, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 13, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 12, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Voveran 50",

    composition: "Diclofenac Sodium 50mg",

    category: "NSAID / Analgesic",

    schedule: "OTC",

    mrp: 40,

    alternatives: [],

    activeIngredients: ["Diclofenac Sodium"],

    strength: "50mg",

    dosageForm: "Tablet",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 40, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 38, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 42, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 39, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Betadine",

    composition: "Povidone Iodine 10%",

    category: "Antiseptic",

    schedule: "OTC",

    mrp: 165,

    alternatives: [],

    activeIngredients: ["Povidone Iodine"],

    strength: "10%",

    dosageForm: "Solution",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 165, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 160, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 170, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 162, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Domstal 10",

    composition: "Domperidone 10mg",

    category: "Prokinetic / Antiemetic",

    schedule: "Schedule H",

    mrp: 68,

    alternatives: [],

    activeIngredients: ["Domperidone"],

    strength: "10mg",

    dosageForm: "Tablet",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 68, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 65, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 71, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 67, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Omez 20",

    composition: "Omeprazole 20mg",

    category: "Proton Pump Inhibitor",

    schedule: "Schedule H",

    mrp: 105,

    alternatives: ["Omecip 20"],

    activeIngredients: ["Omeprazole"],

    strength: "20mg",

    dosageForm: "Capsule",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 105, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 100, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 110, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 102, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Omecip 20",

    composition: "Omeprazole 20mg",

    category: "Proton Pump Inhibitor",

    schedule: "Schedule H",

    mrp: 98,

    alternatives: ["Omez 20"],

    activeIngredients: ["Omeprazole"],

    strength: "20mg",

    dosageForm: "Capsule",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 98, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 94, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 102, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 96, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Pantop 40",

    composition: "Pantoprazole 40mg",

    category: "Proton Pump Inhibitor",

    schedule: "Schedule H",

    mrp: 135,

    alternatives: ["Pan 40"],

    activeIngredients: ["Pantoprazole"],

    strength: "40mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 135, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 130, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 140, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 132, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Pan 40",

    composition: "Pantoprazole 40mg",

    category: "Proton Pump Inhibitor",

    schedule: "Schedule H",

    mrp: 130,

    alternatives: ["Pantop 40"],

    activeIngredients: ["Pantoprazole"],

    strength: "40mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 130, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 126, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 136, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 128, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Azithral 500",

    composition: "Azithromycin 500mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 115,

    alternatives: ["Azicip 500"],

    activeIngredients: ["Azithromycin"],

    strength: "500mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 115, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 110, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 120, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 112, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Azicip 500",

    composition: "Azithromycin 500mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 110,

    alternatives: ["Azithral 500"],

    activeIngredients: ["Azithromycin"],

    strength: "500mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 110, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 106, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 115, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 108, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Zifi 200",

    composition: "Cefixime 200mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 140,

    alternatives: ["Taxim-O 200"],

    activeIngredients: ["Cefixime"],

    strength: "200mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 140, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 135, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 145, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 138, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Taxim-O 200",

    composition: "Cefixime 200mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 135,

    alternatives: ["Zifi 200"],

    activeIngredients: ["Cefixime"],

    strength: "200mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 135, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 130, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 140, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 132, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Cifran 500",

    composition: "Ciprofloxacin 500mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 150,

    alternatives: ["Ciplox 500"],

    activeIngredients: ["Ciprofloxacin"],

    strength: "500mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 150, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 145, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 155, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 148, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Ciplox 500",

    composition: "Ciprofloxacin 500mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 145,

    alternatives: ["Cifran 500"],

    activeIngredients: ["Ciprofloxacin"],

    strength: "500mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 145, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 140, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 150, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 142, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Metrogyl 400",

    composition: "Metronidazole 400mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 84,

    alternatives: ["Flagyl 400"],

    activeIngredients: ["Metronidazole"],

    strength: "400mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 84, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 80, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 88, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 82, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Flagyl 400",

    composition: "Metronidazole 400mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 86,

    alternatives: ["Metrogyl 400"],

    activeIngredients: ["Metronidazole"],

    strength: "400mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 86, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 82, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 90, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 84, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Novamox 500",

    composition: "Amoxicillin 500mg",

    category: "Antibiotic",

    schedule: "Schedule H",

    mrp: 132,

    alternatives: [],

    activeIngredients: ["Amoxicillin"],

    strength: "500mg",

    dosageForm: "Capsule",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 132, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 127, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 138, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 130, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Emeset 4",

    composition: "Ondansetron 4mg",

    category: "Antiemetic",

    schedule: "Schedule H",

    mrp: 42,

    alternatives: [],

    activeIngredients: ["Ondansetron"],

    strength: "4mg",

    dosageForm: "Tablet",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 42, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 40, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 45, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 41, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Telma 40",

    composition: "Telmisartan 40mg",

    category: "Antihypertensive",

    schedule: "Schedule H",

    mrp: 168,

    alternatives: [],

    activeIngredients: ["Telmisartan"],

    strength: "40mg",

    dosageForm: "Tablet",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 168, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 162, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 175, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 165, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Zolfresh 5",

    composition: "Zolpidem Tartrate 5mg",

    category: "Hypnotic / Sedative",

    schedule: "Schedule H",

    mrp: 78,

    alternatives: [],

    activeIngredients: ["Zolpidem Tartrate"],

    strength: "5mg",

    dosageForm: "Tablet",

    compositionVerified: false,

    priceComparison: [

      { platform: "Tata 1mg", price: 78, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 74, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 82, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 76, inStock: true, delivery: "2-3 days" },

    ],

  },



  {

    name: "Alprax 0.5",

    composition: "Alprazolam 0.5mg",

    category: "Anxiolytic",

    schedule: "Schedule H",

    mrp: 72,

    alternatives: ["Alprazolam 0.5mg"],

    activeIngredients: ["Alprazolam"],

    strength: "0.5mg",

    dosageForm: "Tablet",

    compositionVerified: true,

    priceComparison: [

      { platform: "Tata 1mg", price: 72, inStock: true, delivery: "Tomorrow" },

      { platform: "PharmEasy", price: 68, inStock: true, delivery: "1-2 days" },

      { platform: "Apollo 24|7", price: 76, inStock: true, delivery: "Same day" },

      { platform: "Netmeds", price: 70, inStock: true, delivery: "2-3 days" },

    ],

  },

];