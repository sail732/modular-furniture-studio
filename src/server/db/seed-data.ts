import type { CellKind, ElevationLayout } from "@/lib/elevation-layout";
import { inchesToUm } from "@/lib/units";

/**
 * SAMPLE CATALOG — invented for development and demonstration.
 * Names, prices, sizes, materials and assembly estimates are placeholders and
 * are flagged `is_sample` in the database. None of this is a business decision.
 */

type Cell = [kind: CellKind, heightShare?: number];
const col = (widthShare: number, ...cells: Cell[]): ElevationLayout["columns"][number] => ({
  widthShare,
  cells: cells.map(([kind, heightShare = 1]) => ({ kind, heightShare })),
});

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

interface SampleTemplate {
  code: string;
  name: string;
  description: string;
  basePriceCents: number;
  size: [widthIn: number, heightIn: number, depthIn: number];
  widthRange: [minIn: number, maxIn: number, incrementIn: number];
  previewLayout: ElevationLayout;
}

interface SampleProduct {
  category: string;
  slug: string;
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
  templates: SampleTemplate[];
}

const um = inchesToUm;
export const toTemplateRow = (t: SampleTemplate) => ({
  code: t.code,
  name: t.name,
  description: t.description,
  basePriceCents: t.basePriceCents,
  defaultWidthUm: um(t.size[0]),
  defaultHeightUm: um(t.size[1]),
  defaultDepthUm: um(t.size[2]),
  minWidthUm: um(t.widthRange[0]),
  maxWidthUm: um(t.widthRange[1]),
  widthIncrementUm: um(t.widthRange[2]),
  previewLayout: t.previewLayout,
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
    templates: [
      {
        code: "TPL-LEDGER-A",
        name: "Model A: two cabinets and an open shelf",
        description: "Two doored cabinets either side of an open centre bay.",
        basePriceCents: 64_900,
        size: [60, 20, 16],
        widthRange: [48, 72, 6],
        previewLayout: {
          base: "legs",
          columns: [col(1, ["door"]), col(1.2, ["open"], ["open"]), col(1, ["door"])],
        },
      },
      {
        code: "TPL-LEDGER-B",
        name: "Model B: three cabinets and two drawers",
        description: "Three doored cabinets with a stack of two drawers at one end.",
        basePriceCents: 89_900,
        size: [78, 20, 16],
        widthRange: [66, 90, 6],
        previewLayout: {
          base: "legs",
          columns: [col(1, ["door"]), col(1, ["door"]), col(1, ["door"]), col(1, ["drawer"], ["drawer"])],
        },
      },
      {
        code: "TPL-LEDGER-C",
        name: "Model C: four cabinets and two open shelves",
        description: "Four doored cabinets with a two-shelf open bay in the middle.",
        basePriceCents: 112_900,
        size: [96, 20, 16],
        widthRange: [84, 108, 6],
        previewLayout: {
          base: "legs",
          columns: [
            col(1, ["door"]),
            col(1, ["door"]),
            col(1.3, ["open"], ["open"]),
            col(1, ["door"]),
            col(1, ["door"]),
          ],
        },
      },
    ],
  },
  {
    category: "tv-consoles",
    slug: "span-wall-console",
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
    templates: [
      {
        code: "TPL-SPAN-A",
        name: "Model A: three drop-down doors",
        description: "Three equal bays, each behind a drop-down door.",
        basePriceCents: 57_900,
        size: [66, 14, 12],
        widthRange: [48, 84, 6],
        previewLayout: { base: "wall", columns: [col(1, ["door"]), col(1, ["door"]), col(1, ["door"])] },
      },
      {
        code: "TPL-SPAN-B",
        name: "Model B: two doors and an open bay",
        description: "Two drop-down doors with one open bay for a set-top box.",
        basePriceCents: 52_900,
        size: [60, 14, 12],
        widthRange: [48, 78, 6],
        previewLayout: { base: "wall", columns: [col(1, ["door"]), col(0.8, ["open"]), col(1, ["door"])] },
      },
    ],
  },
  {
    category: "bookshelves",
    slug: "tally-bookshelf",
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
    templates: [
      {
        code: "TPL-TALLY-A",
        name: "Model A: narrow vertical shelf",
        description: "One bay with five compartments.",
        basePriceCents: 32_900,
        size: [24, 78, 12],
        widthRange: [18, 30, 6],
        previewLayout: {
          base: "plinth",
          columns: [col(1, ["open"], ["open"], ["open"], ["open"], ["open"])],
        },
      },
      {
        code: "TPL-TALLY-B",
        name: "Model B: multi-bay bookshelf",
        description: "Three bays with doors on the lowest compartments.",
        basePriceCents: 79_900,
        size: [72, 78, 12],
        widthRange: [54, 90, 6],
        previewLayout: {
          base: "plinth",
          columns: [
            col(1, ["open"], ["open"], ["open"], ["door", 1.4]),
            col(1, ["open"], ["open"], ["open"], ["door", 1.4]),
            col(1, ["open"], ["open"], ["open"], ["door", 1.4]),
          ],
        },
      },
      {
        code: "TPL-TALLY-C",
        name: "Model C: wall-spanning shelving",
        description: "Five bays with a mix of open compartments and doors.",
        basePriceCents: 124_900,
        size: [120, 90, 12],
        widthRange: [96, 144, 6],
        previewLayout: {
          base: "plinth",
          columns: [
            col(1, ["open"], ["open"], ["open"], ["open"], ["door", 1.5]),
            col(1, ["open"], ["open"], ["open"], ["open"], ["door", 1.5]),
            col(1.2, ["open", 1.4], ["open"], ["open"], ["door-pair", 1.5]),
            col(1, ["open"], ["open"], ["open"], ["open"], ["door", 1.5]),
            col(1, ["open"], ["open"], ["open"], ["open"], ["door", 1.5]),
          ],
        },
      },
    ],
  },
  {
    category: "bookshelves",
    slug: "rung-low-shelf",
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
    templates: [
      {
        code: "TPL-RUNG-A",
        name: "Model A: two bays",
        description: "Two bays, two tiers.",
        basePriceCents: 27_900,
        size: [48, 30, 14],
        widthRange: [36, 60, 6],
        previewLayout: { base: "legs", columns: [col(1, ["open"], ["open"]), col(1, ["open"], ["open"])] },
      },
      {
        code: "TPL-RUNG-B",
        name: "Model B: three bays",
        description: "Three bays, two tiers.",
        basePriceCents: 38_900,
        size: [72, 30, 14],
        widthRange: [60, 90, 6],
        previewLayout: {
          base: "legs",
          columns: [col(1, ["open"], ["open"]), col(1, ["open"], ["open"]), col(1, ["open"], ["open"])],
        },
      },
    ],
  },
  {
    category: "wardrobes",
    slug: "hold-wardrobe",
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
    templates: [
      {
        code: "TPL-HOLD-A",
        name: "Model A: two-door wardrobe",
        description: "One section behind a pair of doors.",
        basePriceCents: 99_900,
        size: [40, 84, 24],
        widthRange: [36, 48, 2],
        previewLayout: { base: "plinth", columns: [col(1, ["door-pair"])] },
      },
      {
        code: "TPL-HOLD-B",
        name: "Model B: three-section wardrobe",
        description: "Three single-door sections.",
        basePriceCents: 149_900,
        size: [60, 84, 24],
        widthRange: [54, 72, 2],
        previewLayout: { base: "plinth", columns: [col(1, ["door"]), col(1, ["door"]), col(1, ["door"])] },
      },
      {
        code: "TPL-HOLD-C",
        name: "Model C: drawers with mixed hanging and shelves",
        description: "An open hanging section over drawers, between two doored sections.",
        basePriceCents: 189_900,
        size: [80, 84, 24],
        widthRange: [72, 96, 2],
        previewLayout: {
          base: "plinth",
          columns: [
            col(1, ["door"]),
            col(1.3, ["hanging", 3], ["drawer"], ["drawer"], ["drawer"]),
            col(1, ["door"]),
          ],
        },
      },
    ],
  },
  {
    category: "home-office",
    slug: "brief-desk",
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
    templates: [
      {
        code: "TPL-BRIEF-A",
        name: "Model A: single pedestal",
        description: "Three drawers on one side, open knee space.",
        basePriceCents: 54_900,
        size: [54, 30, 24],
        widthRange: [48, 66, 6],
        previewLayout: {
          base: "floor",
          columns: [col(1, ["drawer"], ["drawer"], ["drawer", 1.4]), col(2.2, ["void"])],
        },
      },
      {
        code: "TPL-BRIEF-B",
        name: "Model B: double pedestal",
        description: "Drawers on one side, a doored cabinet on the other.",
        basePriceCents: 74_900,
        size: [72, 30, 24],
        widthRange: [66, 84, 6],
        previewLayout: {
          base: "floor",
          columns: [col(1, ["drawer"], ["drawer"], ["drawer", 1.4]), col(2.4, ["void"]), col(1, ["door"])],
        },
      },
    ],
  },
  {
    category: "sideboards",
    slug: "course-sideboard",
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
    templates: [
      {
        code: "TPL-COURSE-A",
        name: "Model A: two doors and three drawers",
        description: "Two cabinets either side of three drawers.",
        basePriceCents: 84_900,
        size: [66, 32, 18],
        widthRange: [54, 78, 6],
        previewLayout: {
          base: "legs",
          columns: [col(1, ["door"]), col(1, ["drawer"], ["drawer"], ["drawer"]), col(1, ["door"])],
        },
      },
      {
        code: "TPL-COURSE-B",
        name: "Model B: four doors",
        description: "Two pairs of doors, no drawers.",
        basePriceCents: 92_900,
        size: [78, 32, 18],
        widthRange: [66, 90, 6],
        previewLayout: { base: "legs", columns: [col(1, ["door-pair"]), col(1, ["door-pair"])] },
      },
    ],
  },
  {
    category: "sideboards",
    slug: "parcel-cabinet",
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
    templates: [
      {
        code: "TPL-PARCEL-A",
        name: "Model A: two doors",
        description: "One bay behind a pair of doors.",
        basePriceCents: 39_900,
        size: [32, 32, 16],
        widthRange: [28, 40, 2],
        previewLayout: { base: "legs", columns: [col(1, ["door-pair"])] },
      },
    ],
  },
];
