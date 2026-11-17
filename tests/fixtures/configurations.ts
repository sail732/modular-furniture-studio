import type { Selection } from "@/lib/configuration/types";
import { inchesToUm as inch } from "@/lib/units";

/**
 * Configuration fixtures required by the specification. Each invalid fixture
 * differs from a valid one in exactly one respect.
 */

/** Valid TV console: Ledger Model B at its standard 78″. */
export const validTvConsole: Selection = {
  productSlug: "ledger-media-console",
  templateCode: "TPL-LEDGER-B",
  bays: [
    { moduleCode: "LED-DOOR", widthUm: inch(18), count: 1 },
    { moduleCode: "LED-DOOR", widthUm: inch(18), count: 1 },
    { moduleCode: "LED-DOOR", widthUm: inch(18), count: 1 },
    { moduleCode: "LED-DRAWERS", widthUm: inch(24), count: 2 },
  ],
  materialCode: "MAT-OAK-VENEER",
  finishCode: "FIN-OAK-CLEAR",
  base: "legs",
  handleSku: "HDL-BAR",
  accessories: [{ sku: "ACC-CABLE-GROMMET", quantity: 2 }],
};

/** Valid bookshelf: Tally Model B, three bays of open shelves over a cabinet. */
export const validBookshelf: Selection = {
  productSlug: "tally-bookshelf",
  templateCode: "TPL-TALLY-B",
  bays: [
    { moduleCode: "TAL-OPEN-OVER-DOOR", widthUm: inch(24), count: 3 },
    { moduleCode: "TAL-OPEN", widthUm: inch(24), count: 5 },
    { moduleCode: "TAL-OPEN-OVER-DOOR", widthUm: inch(24), count: 3 },
  ],
  materialCode: "MAT-BIRCH-PLY",
  finishCode: "FIN-BIRCH-NATURAL",
  base: "plinth",
  handleSku: "HDL-KNOB",
  accessories: [],
};

/** Invalid dimension: bays add up to 60″, below Model B's 66″ minimum. */
export const invalidDimension: Selection = {
  ...validTvConsole,
  bays: [
    { moduleCode: "LED-DOOR", widthUm: inch(18), count: 1 },
    { moduleCode: "LED-DOOR", widthUm: inch(18), count: 1 },
    { moduleCode: "LED-DRAWERS", widthUm: inch(24), count: 2 },
  ],
};

/** Incompatible door/module: a single door on a 30″ bay (single doors stop at 24″). */
export const incompatibleDoor: Selection = {
  ...validTvConsole,
  bays: [
    { moduleCode: "LED-DOOR", widthUm: inch(30), count: 1 },
    { moduleCode: "LED-DOOR", widthUm: inch(24), count: 1 },
    { moduleCode: "LED-DRAWERS", widthUm: inch(24), count: 2 },
  ],
};

/** Finish/material mismatch: a painted finish on an oak-veneered panel. */
export const finishMaterialMismatch: Selection = {
  ...validTvConsole,
  materialCode: "MAT-OAK-VENEER",
  finishCode: "FIN-PAINT-SLATE",
};
