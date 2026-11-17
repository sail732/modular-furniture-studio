import type { BaseKind, ModuleType, RuleDefinition } from "@/lib/configuration/types";
import { inchesToUm } from "@/lib/units";

/**
 * SAMPLE CATALOG — invented for development and demonstration.
 * Names, prices, sizes, materials and assembly estimates are placeholders and
 * are flagged `is_sample` in the database. None of this is a business decision.
 *
 * Widths are nominal bay widths: a piece's overall width is the sum of its bays.
 * Real panel-thickness deductions are a manufacturing concern (Phase 6).
 */

export const sampleCategories = [
  {
    slug: "tv-consoles",
    name: "TV consoles and media units",
    description: "Low storage for screens, speakers and the cables behind them.",
  },
  {
    slug: "bookshelves",
    name: "Bookshelves and wall shelving",
    description: "Single bays to full walls, built from the same shelf and side panels.",
  },
  {
    slug: "wardrobes",
    name: "Wardrobes and closet storage",
    description: "Hanging space, shelves and drawers arranged in sections.",
  },
  {
    slug: "home-office",
    name: "Home-office desks and storage",
    description: "Work surfaces with storage that grows alongside them.",
  },
  {
    slug: "sideboards",
    name: "Sideboards and cabinets",
    description: "Closed storage for dining rooms, hallways and living rooms.",
  },
];

export const sampleMaterials = [
  {
    code: "MAT-BIRCH-PLY",
    name: "Birch plywood",
    description:
      "Layered birch panel with a visible ply edge. Sample entry: panel grade and thickness are not yet decided.",
    finishes: [
      { code: "FIN-BIRCH-NATURAL", name: "Natural birch", swatchHex: "#D8BE93" },
      { code: "FIN-BIRCH-SMOKE", name: "Smoked birch", swatchHex: "#8A6F55" },
    ],
  },
  {
    code: "MAT-OAK-VENEER",
    name: "Oak-veneered panel",
    description:
      "Engineered panel faced with oak veneer. Sample entry: core material and veneer cut are not yet decided.",
    finishes: [
      { code: "FIN-OAK-CLEAR", name: "Clear oak", swatchHex: "#C49A62" },
      { code: "FIN-OAK-DARK", name: "Dark oak", swatchHex: "#5E4634" },
    ],
  },
  {
    code: "MAT-PAINTED",
    name: "Painted panel",
    description:
      "Engineered panel with an opaque painted surface. Sample entry: paint system is not yet decided.",
    finishes: [
      { code: "FIN-PAINT-CHALK", name: "Chalk", swatchHex: "#E9E6DE" },
      { code: "FIN-PAINT-SAGE", name: "Sage", swatchHex: "#8C9C86" },
      { code: "FIN-PAINT-SLATE", name: "Slate", swatchHex: "#48545A" },
      { code: "FIN-PAINT-INK", name: "Ink blue", swatchHex: "#2C3B50" },
    ],
  },
];

type Triple = [min: number, max: number, def: number];

/** A module a product offers: type, widths in inches, and unit count [min, max, default]. */
export interface SampleModule {
  type: ModuleType;
  widthsIn: number[];
  count: Triple;
}
const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
const mod = (type: ModuleType, widthsIn: number[], count: Triple = [1, 1, 1]): SampleModule => ({
  type,
  widthsIn,
  count,
});

type Bay = [type: ModuleType, widthIn: number, count: number];

interface SampleTemplate {
  code: string;
  name: string;
  description: string;
  basePriceCents: number;
  /** Height and depth are fixed per design; width is the sum of the bays. */
  heightIn: number;
  depthIn: number;
  widthRange: [minIn: number, maxIn: number, incrementIn: number];
  base: BaseKind;
  bays: Bay[];
  accessories?: string[];
}

export interface SampleProduct {
  category: string;
  slug: string;
  /** Prefix for this product's module codes and component SKUs. */
  prefix: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  keyFeatures: string[];
  whatsIncluded: string[];
  whatCanChange: string[];
  assemblyDifficulty: "easy" | "moderate" | "advanced";
  assemblyMinutes: number;
  featuredRank?: number;
  finishes: string[];
  modules: SampleModule[];
  bayRange: [min: number, max: number];
  bases: BaseKind[];
  accessories: string[];
  templates: SampleTemplate[];
}

const um = inchesToUm;
export const templateWidthIn = (t: SampleTemplate) => t.bays.reduce((n, [, w]) => n + w, 0);
export const toTemplateRow = (t: SampleTemplate, product: SampleProduct) => ({
  code: t.code,
  name: t.name,
  description: t.description,
  basePriceCents: t.basePriceCents,
  defaultWidthUm: um(templateWidthIn(t)),
  defaultHeightUm: um(t.heightIn),
  defaultDepthUm: um(t.depthIn),
  minWidthUm: um(t.widthRange[0]),
  maxWidthUm: um(t.widthRange[1]),
  widthIncrementUm: um(t.widthRange[2]),
  minBays: product.bayRange[0],
  maxBays: product.bayRange[1],
  defaultBase: t.base,
  allowedBases: product.bases,
  defaultAccessories: (t.accessories ?? []).map((sku) => ({ sku, quantity: 1 })),
});

const standardIncluded = [
  "All panels, cut and edge-finished, each labeled with a part code",
  "Hardware pack with connectors, hinges and runners for the chosen layout",
  "Printed assembly guide matched to your layout",
];

export const sampleProducts: SampleProduct[] = [
  {
    category: "tv-consoles",
    slug: "ledger-media-console",
    prefix: "LED",
    name: "Ledger media console",
    shortDescription: "A low console in two, three or four bays, with doors, drawers and open shelves.",
    longDescription:
      "Ledger is built from cabinet bays of equal depth that share side panels. Start with one of three arrangements and widen it bay by bay. Open bays leave room for a soundbar or console; closed bays hide everything else. A cable channel runs behind every bay.",
    keyFeatures: [
      "Shared side panels between bays",
      "Cable channel behind every bay",
      "Doors and drawer fronts sit flush with the frame",
    ],
    whatsIncluded: standardIncluded,
    whatCanChange: [
      "Overall width, in 6-inch steps within each design's range",
      "Which bays are open, doored or fitted with drawers",
      "Finish, legs or plinth, and handles",
    ],
    assemblyDifficulty: "moderate",
    assemblyMinutes: 90,
    featuredRank: 1,
    finishes: ["FIN-OAK-CLEAR", "FIN-OAK-DARK", "FIN-PAINT-CHALK", "FIN-PAINT-SLATE"],
    modules: [
      mod("door", [12, 18, 24], [0, 1, 1]),
      mod("door-pair", [24, 30, 36], [0, 1, 1]),
      mod("open", [18, 24, 30, 36], [1, 2, 2]),
      mod("drawers", [18, 24, 30], [1, 2, 2]),
    ],
    bayRange: [2, 6],
    bases: ["legs", "plinth"],
    accessories: ["ACC-CABLE-GROMMET", "ACC-LEVELLERS"],
    templates: [
      {
        code: "TPL-LEDGER-A",
        name: "Model A: two cabinets and an open shelf",
        description: "Two doored cabinets either side of an open centre bay.",
        basePriceCents: 64_900,
        heightIn: 20,
        depthIn: 16,
        widthRange: [48, 72, 6],
        base: "legs",
        bays: [["door", 18, 1], ["open", 24, 2], ["door", 18, 1]],
      },
      {
        code: "TPL-LEDGER-B",
        name: "Model B: three cabinets and two drawers",
        description: "Three doored cabinets with a stack of two drawers at one end.",
        basePriceCents: 89_900,
        heightIn: 20,
        depthIn: 16,
        widthRange: [66, 90, 6],
        base: "legs",
        bays: [["door", 18, 1], ["door", 18, 1], ["door", 18, 1], ["drawers", 24, 2]],
      },
      {
        code: "TPL-LEDGER-C",
        name: "Model C: four cabinets and two open shelves",
        description: "Four doored cabinets with a two-shelf open bay in the middle.",
        basePriceCents: 112_900,
        heightIn: 20,
        depthIn: 16,
        widthRange: [84, 108, 6],
        base: "legs",
        bays: [["door", 18, 1], ["door", 18, 1], ["open", 24, 2], ["door", 18, 1], ["door", 18, 1]],
      },
    ],
  },
  {
    category: "tv-consoles",
    slug: "span-wall-console",
    prefix: "SPN",
    name: "Span wall console",
    shortDescription: "A slim wall-hung console that keeps the floor clear.",
    longDescription:
      "Span hangs from a wall rail and carries drop-down doors over shallow bays. It is the narrowest-depth piece in the range, sized for hallways and small living rooms. Wall fixing requirements depend on your wall type and are not yet specified in this sample catalog.",
    keyFeatures: ["Wall-hung on a concealed rail", "Shallow 12-inch depth", "Drop-down doors"],
    whatsIncluded: [...standardIncluded, "Wall rail (wall fixings are not included)"],
    whatCanChange: ["Overall width, in 6-inch steps", "Finish and handles"],
    assemblyDifficulty: "advanced",
    assemblyMinutes: 120,
    finishes: ["FIN-PAINT-CHALK", "FIN-PAINT-SAGE", "FIN-PAINT-INK", "FIN-BIRCH-NATURAL"],
    modules: [mod("door", [18, 24, 30], [0, 0, 0]), mod("open", [12, 18, 24], [1, 1, 1])],
    bayRange: [2, 4],
    bases: ["wall"],
    accessories: ["ACC-WALL-RAIL", "ACC-CABLE-GROMMET"],
    templates: [
      {
        code: "TPL-SPAN-A",
        name: "Model A: three drop-down doors",
        description: "Three equal bays, each behind a drop-down door.",
        basePriceCents: 57_900,
        heightIn: 14,
        depthIn: 12,
        widthRange: [54, 84, 6],
        base: "wall",
        bays: [["door", 24, 0], ["door", 24, 0], ["door", 24, 0]],
        accessories: ["ACC-WALL-RAIL"],
      },
      {
        code: "TPL-SPAN-B",
        name: "Model B: two doors and an open bay",
        description: "Two drop-down doors with one open bay for a set-top box.",
        basePriceCents: 52_900,
        heightIn: 14,
        depthIn: 12,
        widthRange: [48, 78, 6],
        base: "wall",
        bays: [["door", 24, 0], ["open", 12, 1], ["door", 24, 0]],
        accessories: ["ACC-WALL-RAIL"],
      },
    ],
  },
  {
    category: "bookshelves",
    slug: "tally-bookshelf",
    prefix: "TAL",
    name: "Tally bookshelf",
    shortDescription: "From one narrow bay to a full wall, on the same shelf and side panels.",
    longDescription:
      "Tally uses one shelf depth and one side-panel profile across every width. Begin with a single bay and add bays later; the new bay shares the side panel you already own. Lower compartments can take doors.",
    keyFeatures: [
      "Add bays later using your existing side panel",
      "Shelves reposition on a fixed hole pattern",
      "Optional doors on the lower compartments",
    ],
    whatsIncluded: standardIncluded,
    whatCanChange: [
      "Number of bays and overall width",
      "Shelf count per bay",
      "Doors on lower compartments, and finish",
    ],
    assemblyDifficulty: "easy",
    assemblyMinutes: 45,
    featuredRank: 2,
    finishes: ["FIN-BIRCH-NATURAL", "FIN-BIRCH-SMOKE", "FIN-OAK-CLEAR", "FIN-PAINT-CHALK", "FIN-PAINT-SAGE"],
    modules: [mod("open", [18, 24, 30], [3, 6, 5]), mod("open-over-door", [18, 24, 30], [2, 5, 3])],
    bayRange: [1, 6],
    bases: ["plinth"],
    accessories: ["ACC-LEVELLERS"],
    templates: [
      {
        code: "TPL-TALLY-A",
        name: "Model A: narrow vertical shelf",
        description: "One bay with five compartments.",
        basePriceCents: 32_900,
        heightIn: 78,
        depthIn: 12,
        widthRange: [18, 30, 6],
        base: "plinth",
        bays: [["open", 24, 5]],
      },
      {
        code: "TPL-TALLY-B",
        name: "Model B: multi-bay bookshelf",
        description: "Three bays with doors on the lowest compartments.",
        basePriceCents: 79_900,
        heightIn: 78,
        depthIn: 12,
        widthRange: [54, 90, 6],
        base: "plinth",
        bays: [["open-over-door", 24, 3], ["open-over-door", 24, 3], ["open-over-door", 24, 3]],
      },
      {
        code: "TPL-TALLY-C",
        name: "Model C: wall-spanning shelving",
        description: "Five bays with a mix of open compartments and doors.",
        basePriceCents: 124_900,
        heightIn: 90,
        depthIn: 12,
        widthRange: [96, 144, 6],
        base: "plinth",
        bays: [["open-over-door", 24, 4], ["open-over-door", 24, 4], ["open", 24, 6], ["open-over-door", 24, 4], ["open-over-door", 24, 4]],
      },
    ],
  },
  {
    category: "bookshelves",
    slug: "rung-low-shelf",
    prefix: "RNG",
    name: "Rung low shelf",
    shortDescription: "A waist-height open shelf for under windows and behind sofas.",
    longDescription:
      "Rung is a two-tier open shelf that stays below window-sill height. Bays are wider than Tally's, suited to records, baskets and larger books.",
    keyFeatures: ["Sits below a standard window sill", "Wide bays for records and baskets"],
    whatsIncluded: standardIncluded,
    whatCanChange: ["Number of bays and overall width", "Finish, legs or plinth"],
    assemblyDifficulty: "easy",
    assemblyMinutes: 30,
    finishes: ["FIN-BIRCH-NATURAL", "FIN-OAK-CLEAR", "FIN-PAINT-INK"],
    modules: [mod("open", [18, 24, 30], [1, 3, 2])],
    bayRange: [2, 4],
    bases: ["legs", "plinth"],
    accessories: ["ACC-LEVELLERS"],
    templates: [
      {
        code: "TPL-RUNG-A",
        name: "Model A: two bays",
        description: "Two bays, two tiers.",
        basePriceCents: 27_900,
        heightIn: 30,
        depthIn: 14,
        widthRange: [36, 60, 6],
        base: "legs",
        bays: [["open", 24, 2], ["open", 24, 2]],
      },
      {
        code: "TPL-RUNG-B",
        name: "Model B: three bays",
        description: "Three bays, two tiers.",
        basePriceCents: 38_900,
        heightIn: 30,
        depthIn: 14,
        widthRange: [60, 90, 6],
        base: "legs",
        bays: [["open", 24, 2], ["open", 24, 2], ["open", 24, 2]],
      },
    ],
  },
  {
    category: "wardrobes",
    slug: "hold-wardrobe",
    prefix: "HLD",
    name: "Hold wardrobe",
    shortDescription: "Wardrobe sections for hanging, shelving and drawers, joined side by side.",
    longDescription:
      "Hold is planned in sections. Each section is fitted for long hanging, short hanging over drawers, or shelves, and sections bolt together to fill the wall you have. Doors are full height.",
    keyFeatures: [
      "Sections bolt together and can be added later",
      "Full-height doors",
      "Interior fittings chosen per section",
    ],
    whatsIncluded: [...standardIncluded, "Hanging rails for each hanging section"],
    whatCanChange: [
      "Number of sections and overall width",
      "Interior of each section: hanging, shelves or drawers",
      "Finish and handles",
    ],
    assemblyDifficulty: "advanced",
    assemblyMinutes: 180,
    featuredRank: 3,
    finishes: ["FIN-PAINT-CHALK", "FIN-PAINT-SAGE", "FIN-PAINT-SLATE", "FIN-OAK-CLEAR"],
    modules: [
      mod("door", range(18, 28, 2), [0, 4, 2]),
      mod("door-pair", range(36, 48, 2), [0, 4, 1]),
      mod("hanging-over-drawers", range(28, 40, 2), [2, 4, 3]),
      mod("hanging", range(24, 36, 2)),
    ],
    bayRange: [1, 4],
    bases: ["plinth"],
    accessories: ["ACC-LEVELLERS"],
    templates: [
      {
        code: "TPL-HOLD-A",
        name: "Model A: two-door wardrobe",
        description: "One section behind a pair of doors.",
        basePriceCents: 99_900,
        heightIn: 84,
        depthIn: 24,
        widthRange: [36, 48, 2],
        base: "plinth",
        bays: [["door-pair", 40, 1]],
      },
      {
        code: "TPL-HOLD-B",
        name: "Model B: three-section wardrobe",
        description: "Three single-door sections.",
        basePriceCents: 149_900,
        heightIn: 84,
        depthIn: 24,
        widthRange: [54, 72, 2],
        base: "plinth",
        bays: [["door", 20, 2], ["door", 20, 2], ["door", 20, 2]],
      },
      {
        code: "TPL-HOLD-C",
        name: "Model C: drawers with mixed hanging and shelves",
        description: "An open hanging section over drawers, between two doored sections.",
        basePriceCents: 189_900,
        heightIn: 84,
        depthIn: 24,
        widthRange: [72, 96, 2],
        base: "plinth",
        bays: [["door", 24, 2], ["hanging-over-drawers", 32, 3], ["door", 24, 2]],
      },
    ],
  },
  {
    category: "home-office",
    slug: "brief-desk",
    prefix: "BRF",
    name: "Brief desk",
    shortDescription: "A writing desk carried on one or two storage pedestals.",
    longDescription:
      "Brief pairs a work surface with pedestals built from the same drawer boxes as the rest of the range. Choose one pedestal and a leg frame, or two pedestals for a longer top.",
    keyFeatures: ["Drawer boxes shared with other pieces", "Cable cut-out at the back of the top"],
    whatsIncluded: standardIncluded,
    whatCanChange: ["Top width, in 6-inch steps", "One or two pedestals", "Finish and handles"],
    assemblyDifficulty: "moderate",
    assemblyMinutes: 75,
    finishes: ["FIN-BIRCH-NATURAL", "FIN-OAK-CLEAR", "FIN-PAINT-CHALK", "FIN-PAINT-INK"],
    modules: [mod("drawers", [18], [2, 3, 3]), mod("door", [18], [0, 1, 1]), mod("knee", [30, 36, 42, 48])],
    bayRange: [2, 3],
    bases: ["floor"],
    accessories: ["ACC-CABLE-GROMMET"],
    templates: [
      {
        code: "TPL-BRIEF-A",
        name: "Model A: single pedestal",
        description: "Three drawers on one side, open knee space.",
        basePriceCents: 54_900,
        heightIn: 30,
        depthIn: 24,
        widthRange: [48, 66, 6],
        base: "floor",
        bays: [["drawers", 18, 3], ["knee", 36, 1]],
      },
      {
        code: "TPL-BRIEF-B",
        name: "Model B: double pedestal",
        description: "Drawers on one side, a doored cabinet on the other.",
        basePriceCents: 74_900,
        heightIn: 30,
        depthIn: 24,
        widthRange: [66, 84, 6],
        base: "floor",
        bays: [["drawers", 18, 3], ["knee", 36, 1], ["door", 18, 1]],
      },
    ],
  },
  {
    category: "sideboards",
    slug: "course-sideboard",
    prefix: "CRS",
    name: "Course sideboard",
    shortDescription: "A dining-height sideboard with doors and a centre stack of drawers.",
    longDescription:
      "Course stands at serving height. Doored cabinets flank a drawer stack sized for cutlery and linens. It uses the same doors and drawer boxes as Ledger, at a taller cabinet height.",
    keyFeatures: ["Serving-height top", "Centre drawer stack", "Adjustable shelf in each cabinet"],
    whatsIncluded: standardIncluded,
    whatCanChange: ["Overall width, in 6-inch steps", "Drawer stack position", "Finish, legs or plinth, handles"],
    assemblyDifficulty: "moderate",
    assemblyMinutes: 100,
    featuredRank: 4,
    finishes: ["FIN-OAK-CLEAR", "FIN-OAK-DARK", "FIN-PAINT-SAGE", "FIN-PAINT-SLATE"],
    modules: [
      mod("door", [18, 24], [0, 2, 1]),
      mod("door-pair", [24, 30, 36, 42], [0, 2, 1]),
      mod("drawers", [18, 24, 30], [2, 4, 3]),
      mod("open", [18, 24], [1, 3, 2]),
    ],
    bayRange: [2, 5],
    bases: ["legs", "plinth"],
    accessories: ["ACC-LEVELLERS"],
    templates: [
      {
        code: "TPL-COURSE-A",
        name: "Model A: two doors and three drawers",
        description: "Two cabinets either side of three drawers.",
        basePriceCents: 84_900,
        heightIn: 32,
        depthIn: 18,
        widthRange: [54, 78, 6],
        base: "legs",
        bays: [["door", 24, 1], ["drawers", 18, 3], ["door", 24, 1]],
      },
      {
        code: "TPL-COURSE-B",
        name: "Model B: four doors",
        description: "Two pairs of doors, no drawers.",
        basePriceCents: 92_900,
        heightIn: 32,
        depthIn: 18,
        widthRange: [60, 84, 6],
        base: "legs",
        bays: [["door-pair", 36, 1], ["door-pair", 36, 1]],
      },
    ],
  },
  {
    category: "sideboards",
    slug: "parcel-cabinet",
    prefix: "PCL",
    name: "Parcel cabinet",
    shortDescription: "A compact two-door cabinet for hallways and corners.",
    longDescription:
      "Parcel is the smallest closed cabinet in the range: one bay, two doors and a shelf. It works alone or beside a Course sideboard at the same height.",
    keyFeatures: ["Same height as Course", "One adjustable shelf"],
    whatsIncluded: standardIncluded,
    whatCanChange: ["Width, in 2-inch steps", "Finish, legs or plinth, handles"],
    assemblyDifficulty: "easy",
    assemblyMinutes: 40,
    finishes: ["FIN-BIRCH-NATURAL", "FIN-PAINT-CHALK", "FIN-PAINT-INK", "FIN-OAK-DARK"],
    modules: [mod("door-pair", range(28, 40, 2), [0, 2, 1])],
    bayRange: [1, 1],
    bases: ["legs", "plinth"],
    accessories: ["ACC-LEVELLERS"],
    templates: [
      {
        code: "TPL-PARCEL-A",
        name: "Model A: two doors",
        description: "One bay behind a pair of doors.",
        basePriceCents: 39_900,
        heightIn: 32,
        depthIn: 16,
        widthRange: [28, 40, 2],
        base: "legs",
        bays: [["door-pair", 32, 1]],
      },
    ],
  },
];

// ---- Shared hardware, handles and accessories --------------------------------

export const sampleSharedComponents = [
  { sku: "LEG-150", name: "Leg, 6 inch", type: "leg" },
  { sku: "HW-HINGE", name: "Cabinet hinge", type: "hinge" },
  { sku: "HW-RUNNER", name: "Drawer runner pair", type: "drawer_runner" },
  { sku: "HW-PACK-CARCASS", name: "Carcass hardware pack", type: "hardware_pack" },
  { sku: "HW-PACK-BAY", name: "Bay connector pack", type: "hardware_pack" },
] as const;

export const sampleHandles = [
  { sku: "HDL-BAR", name: "Bar pull", description: "A straight bar fixed at two points." },
  { sku: "HDL-KNOB", name: "Round knob", description: "A small round knob fixed at one point." },
  { sku: "HDL-EDGE", name: "Edge pull", description: "A low-profile pull that hooks over the top edge." },
];

export const sampleAccessories = [
  {
    sku: "ACC-WALL-RAIL",
    name: "Wall rail",
    description: "Hanging rail for wall-hung pieces. Wall fixings are not included.",
    maxQuantity: 1,
  },
  {
    sku: "ACC-CABLE-GROMMET",
    name: "Cable grommet",
    description: "A capped cable opening for the top or back panel.",
    maxQuantity: 4,
  },
  {
    sku: "ACC-LEVELLERS",
    name: "Adjustable levellers",
    description: "Screw-in feet for uneven floors. One set per piece.",
    maxQuantity: 1,
  },
];

// ---- Compatibility rules (sample) ---------------------------------------------

export const sampleRules: {
  code: string;
  productSlug: string | null;
  definition: RuleDefinition;
  message: string;
  path: string;
}[] = [
  {
    code: "WALL_NEEDS_RAIL",
    productSlug: null,
    definition: { kind: "requires", when: { base: "wall" }, require: { accessory: "ACC-WALL-RAIL" } },
    message: "Wall-hung pieces need the wall rail. Add it under accessories.",
    path: "accessories",
  },
  {
    code: "RAIL_ONLY_ON_WALL",
    productSlug: null,
    definition: { kind: "requires", when: { accessory: "ACC-WALL-RAIL" }, require: { base: "wall" } },
    message: "The wall rail is only for wall-hung pieces. Remove it or choose a wall-hung base.",
    path: "accessories",
  },
  {
    code: "NO_LEGS_OVER_96",
    productSlug: null,
    definition: { kind: "excludes", when: { widthOverUm: inchesToUm(96) }, forbid: { base: "legs" } },
    message: "Pieces wider than 96″ need a plinth. Legs are not available at this width.",
    path: "base",
  },
  {
    code: "NO_EDGE_PULL_ON_BIRCH",
    productSlug: null,
    definition: { kind: "excludes", when: { material: "MAT-BIRCH-PLY" }, forbid: { handle: "HDL-EDGE" } },
    message: "Edge pulls are not available on birch plywood fronts. Choose a bar pull, a knob or no handles.",
    path: "handleSku",
  },
  {
    code: "LEDGER_MAX_DRAWER_BAYS",
    productSlug: "ledger-media-console",
    definition: { kind: "count", moduleType: "drawers", max: 2 },
    message: "A Ledger console can have at most two drawer bays.",
    path: "bays",
  },
  {
    code: "DESK_ONE_KNEE_SPACE",
    productSlug: "brief-desk",
    definition: { kind: "count", moduleType: "knee", min: 1, max: 1 },
    message: "A desk needs exactly one knee space.",
    path: "bays",
  },
];
