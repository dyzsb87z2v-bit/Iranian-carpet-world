import type { Product, Seller } from "./types";

// Sample data so the storefront runs before Supabase is connected.
// Shops and rugs are illustrative, not real listings.

const sellers: Seller[] = [
  { id: "s1", slug: "tabriz-bazaar-house", shopName: "Tabriz Bazaar House", shopNameFa: "خانه فرش بازار تبریز", city: "Tabriz", isVerified: true, status: "approved" },
  { id: "s2", slug: "kashan-weavers", shopName: "Kashan Weavers", shopNameFa: "بافندگان کاشان", city: "Kashan", isVerified: true, status: "approved" },
  { id: "s3", slug: "shiraz-nomad-gallery", shopName: "Shiraz Nomad Gallery", shopNameFa: "گالری عشایر شیراز", city: "Shiraz", isVerified: false, status: "approved" },
];

const base = {
  status: "published" as const,
  originRegion: null,
  conditionNotes: null,
  knotDensityPerDm2: null,
  hasCertificate: false,
  quantity: 1,
  weightKg: null,
  imageUrls: [],
  publishedAt: "2026-10-01T10:00:00Z",
};

export const demoProducts: Product[] = [
  {
    ...base,
    id: "p1",
    slug: "tabriz-mahi-medallion-300x200",
    title: { en: "Tabriz Mahi medallion", de: "Täbris Mahi Medaillon", fa: "تبریز ماهی ترنج‌دار" },
    description: {
      en: "Fine Tabriz with the herati ‘mahi’ fish pattern around an ivory medallion. Wool pile with silk highlights on a cotton foundation.",
      de: "Feiner Täbris mit Herati-‚Mahi‘-Fischmuster um ein elfenbeinfarbenes Medaillon. Wollflor mit Seidenakzenten auf Baumwollgrund.",
      fa: "تبریز ریزبافت با نقش ماهی هراتی دور ترنج عاجی. پرز پشم با گل ابریشم روی چله پنبه.",
    },
    categorySlug: "city",
    lengthCm: 300, widthCm: 200, weave: "hand_knotted",
    pileMaterial: "wool_silk", foundationMaterial: "cotton",
    originCity: "Tabriz", design: "Mahi (herati)", colors: ["ivory", "navy", "crimson"],
    knotDensityPerDm2: 4900, approxAgeYears: 5, condition: "new",
    authenticityNotes: "Workshop label on reverse.", hasCertificate: true,
    priceEur: 3480, artSeed: 11, seller: sellers[0],
  },
  {
    ...base,
    id: "p2",
    slug: "kashan-garden-245x165",
    title: { en: "Kashan garden carpet", de: "Kaschan Gartenteppich", fa: "کاشان طرح باغی" },
    description: {
      en: "Compartment garden design in deep red and gold, densely knotted in Kashan.",
      de: "Feldermuster eines Paradiesgartens in Tiefrot und Gold, dicht geknüpft in Kaschan.",
      fa: "طرح باغی خشتی با زمینه لاکی و طلایی، بافت فشرده کاشان.",
    },
    categorySlug: "city",
    lengthCm: 245, widthCm: 165, weave: "hand_knotted",
    pileMaterial: "wool", foundationMaterial: "cotton",
    originCity: "Kashan", design: "Garden", colors: ["crimson", "gold"],
    approxAgeYears: 25, condition: "vintage",
    authenticityNotes: null,
    priceEur: 2150, artSeed: 23, seller: sellers[1],
  },
  {
    ...base,
    id: "p3",
    slug: "qashqai-gabbeh-180x120",
    title: { en: "Qashqai gabbeh", de: "Ghashghai Gabbeh", fa: "گبه قشقایی" },
    description: {
      en: "Thick-piled nomadic gabbeh with hand-spun, naturally dyed wool. Abstract tree motif.",
      de: "Dickfloriger Nomaden-Gabbeh aus handgesponnener, naturgefärbter Wolle. Abstraktes Baummotiv.",
      fa: "گبه عشایری پرزبلند با پشم دست‌ریس و رنگ گیاهی. نقش درخت انتزاعی.",
    },
    categorySlug: "kilim",
    lengthCm: 180, widthCm: 120, weave: "hand_knotted",
    pileMaterial: "wool", foundationMaterial: "wool",
    originCity: "Shiraz", design: "Tree of life", colors: ["rust", "ivory"],
    approxAgeYears: 2, condition: "new",
    authenticityNotes: null,
    priceEur: 690, artSeed: 37, seller: sellers[2],
  },
  {
    ...base,
    id: "p4",
    slug: "isfahan-silk-shah-abbasi-210x140",
    title: { en: "Isfahan Shah Abbasi, silk foundation", de: "Isfahan Schah Abbasi, Seidenkette", fa: "اصفهان شاه‌عباسی، چله ابریشم" },
    description: {
      en: "Shah Abbasi palmettes on a navy field. Kork wool on silk warps.",
      de: "Schah-Abbasi-Palmetten auf marineblauem Grund. Korkwolle auf Seidenkette.",
      fa: "گل شاه‌عباسی روی زمینه سرمه‌ای. کرک روی چله ابریشم.",
    },
    categorySlug: "silk",
    lengthCm: 210, widthCm: 140, weave: "hand_knotted",
    pileMaterial: "kork_wool", foundationMaterial: "silk",
    originCity: "Isfahan", design: "Shah Abbasi", colors: ["navy", "ivory", "gold"],
    knotDensityPerDm2: 6400, approxAgeYears: 8, condition: "new",
    authenticityNotes: "Signed in the border.", hasCertificate: true,
    priceEur: 5900, artSeed: 41, seller: sellers[1],
  },
  {
    ...base,
    id: "p5",
    slug: "heriz-runner-400x85",
    title: { en: "Heriz runner", de: "Heris Läufer", fa: "کناره هریس" },
    description: {
      en: "Bold geometric Heriz runner, durable enough for hallways.",
      de: "Kräftig geometrischer Heris-Läufer, robust genug für Flure.",
      fa: "کناره هریس با نقش هندسی درشت، مقاوم برای راهرو.",
    },
    categorySlug: "runner",
    lengthCm: 400, widthCm: 85, weave: "hand_knotted",
    pileMaterial: "wool", foundationMaterial: "cotton",
    originCity: "Heriz", design: "Geometric", colors: ["rust", "navy"],
    approxAgeYears: 40, condition: "vintage",
    authenticityNotes: null,
    priceEur: 1240, artSeed: 53, seller: sellers[0],
  },
  {
    ...base,
    id: "p6",
    slug: "senneh-kilim-190x130",
    title: { en: "Senneh kilim", de: "Senneh Kelim", fa: "گلیم سنه" },
    description: {
      en: "Finely woven flat-weave kilim from Kurdistan with a stepped diamond medallion.",
      de: "Fein gewebter Flachgewebe-Kelim aus Kurdistan mit gestuftem Rautenmedaillon.",
      fa: "گلیم ریزبافت کردستان با ترنج لوزی پله‌ای.",
    },
    categorySlug: "kilim",
    lengthCm: 190, widthCm: 130, weave: "hand_woven_kilim",
    pileMaterial: "wool", foundationMaterial: "cotton",
    originCity: "Sanandaj", design: "Herati diamond", colors: ["gold", "crimson", "ivory"],
    approxAgeYears: 60, condition: "antique",
    authenticityNotes: null,
    priceEur: 1580, artSeed: 67, seller: sellers[2],
  },
];

export const demoSellers = sellers;
