# Configuration engine

**Status: implemented in Phase 2.** Customers can configure any sample product, the server validates every change, and valid designs can be saved, reloaded, duplicated and shared. Pricing of configured designs is Phase 3.

## Concepts

| Term | Meaning | Table |
| --- | --- | --- |
| Component | A part with a SKU: panel, door, hinge, handle, accessory | `components` |
| Module | A customer-selectable bay built from components, made in a fixed set of widths, with an optional unit count (drawers, compartments, shelves) | `modules`, `module_widths`, `module_components` |
| Design template | A valid starting arrangement of modules, with a width range, fixed height and depth, allowed bases and bay limits | `design_templates`, `template_bays` |
| Selection | What the customer chose: template, bays, material, finish, base, handle, accessories | JSON, schema in `src/lib/configuration/types.ts` |
| Rule | A compatibility constraint stored as data, grouped in a versioned rule set | `rule_sets`, `compatibility_rules` |

## Dimension model

Confirmed by the business owner on 2026-11-16:

- **Width** is the only dimension a customer can change, and only in fixed steps between a design's minimum and maximum.
- **Height and depth** are fixed for each design.
- No made-to-measure sizes in the first release.

A piece's overall width is the **sum of its bay widths**. Each module is made in a fixed set of widths, so the overall width changes by swapping or resizing bays. A width is allowed when it lies in the design's range and on its step (`src/lib/width-options.ts`).

Bay widths are nominal. Panel-thickness deductions, tolerances and kerf are manufacturing concerns for Phase 6 and are not modelled here.

## Where the logic lives

| File | Role |
| --- | --- |
| `src/lib/configuration/types.ts` | Zod schemas and types for selections, issues, rules and the browser-safe catalog |
| `src/server/configuration/engine.ts` | `validateSelection` and `fitBaysToWidth`. Pure functions: no database, no framework |
| `src/server/configuration/resolve.ts` | `resolveItems`: a valid selection → component SKUs and quantities |
| `src/server/configuration/catalog.ts` | Loads one product's templates, modules, options and current rule set |
| `src/server/configuration/store.ts` | Save, update, reload, duplicate, share, revalidate |
| `src/lib/configuration/layout.ts` | Builds the 2D preview layout. Presentation only |

The browser draws the preview immediately from local state, but it never decides validity. Every change is sent to the server, and only the server's issues are shown. Saving validates again; invalid configurations are not stored.

## Validation

`validateSelection(catalog, rules, selection)` returns:

```json
{
  "valid": false,
  "issues": [
    {
      "code": "WIDTH_OUT_OF_RANGE",
      "path": "dimensions.width",
      "message": "The bays add up to 60″, but this design is made from 66″ to 90″ wide. The closest available width is 66″.",
      "allowed": [1676400, 1828800, 1981200, 2133600, 2286000],
      "nearest": [1676400]
    }
  ],
  "overallWidthUm": 1524000,
  "heightUm": 508000,
  "depthUm": 406400,
  "ruleSetVersion": 1,
  "templateVersion": 1
}
```

Every issue has a stable `code`, a `path` naming the part of the selection that caused it, and a message that says what is allowed. Values are never clamped or corrected silently. All problems are reported together.

| Check | Codes | Path |
| --- | --- | --- |
| Template exists and is published | `TEMPLATE_NOT_AVAILABLE` | `templateCode` |
| Height and depth are not changed | `DIMENSION_FIXED` | `dimensions.height`, `dimensions.depth` |
| Bay count within the design's limits | `BAY_COUNT_OUT_OF_RANGE` | `bays` |
| Module offered for this product | `MODULE_NOT_AVAILABLE` | `bays.N.moduleCode` |
| Bay width is one the module is made in | `MODULE_WIDTH_NOT_AVAILABLE` | `bays.N.widthUm` |
| Unit count within the module's limits | `MODULE_COUNT_OUT_OF_RANGE` | `bays.N.count` |
| Overall width in range and on step | `WIDTH_OUT_OF_RANGE`, `WIDTH_OFF_STEP` | `dimensions.width` |
| Material and finish | `MATERIAL_NOT_AVAILABLE`, `FINISH_NOT_AVAILABLE`, `FINISH_MATERIAL_MISMATCH` | `materialCode`, `finishCode` |
| Base allowed for the design | `BASE_NOT_AVAILABLE` | `base` |
| Handle and accessories | `HANDLE_NOT_AVAILABLE`, `ACCESSORY_NOT_AVAILABLE`, `ACCESSORY_DUPLICATED`, `ACCESSORY_QUANTITY_TOO_HIGH` | `handleSku`, `accessories.N` |
| Compatibility rules | `RULE_<rule code>` | set per rule |

"A door must fit its opening" is expressed through module widths: a single-door cabinet is made up to 24″, so a 30″ single-door bay is rejected with the widths it does come in.

## Rules as data

Rules are rows in `compatibility_rules`, each with a JSON definition, a customer-facing message and the selection path it attaches to. Three kinds exist:

| Kind | Meaning | Sample |
| --- | --- | --- |
| `excludes` | If `when` holds, `forbid` must not | Wider than 96″ excludes legs; birch plywood excludes edge pulls |
| `requires` | If `when` holds, `require` must too | Wall-hung requires the wall rail accessory |
| `count` | Bays of a module type must be within `min`/`max` | At most two drawer bays on Ledger; exactly one knee space on a desk |

Conditions can test: base, presence of a module type, an accessory, the handle, material, finish, or overall width above a value. A rule with no product applies to every product. Deactivating a rule in the database stops it applying; no code change is needed (tested).

New condition types or rule kinds need a small change in `types.ts` and `engine.ts`. A general expression language was deliberately not built.

## Changing the overall width

`fitBaysToWidth` takes a target width. If the target is not an allowed width it returns `WIDTH_NOT_ALLOWED` with the range and nearest widths. Otherwise it steps bays one size at a time: widening grows the narrowest bay first, narrowing shrinks the widest. If the arrangement cannot reach the target it returns `WIDTH_NOT_REACHABLE` and suggests adding or removing a bay. It never returns a partial result.

A test proves that for every sample template, every allowed width is reachable from the starting arrangement and validates.

## Component resolution

`resolveItems` produces the component list for a valid selection: carcass parts from the product's recipe (`product_components`), bay parts from each module's recipe (`module_components`, quantity = fixed + per-count × count), handles, and accessories. Cut-to-size parts record the nominal length they are cut to; finished parts record the finish. The list is stored in `configuration_items` with each component's SKU and revision.

This is the input for Phase 6 BOM generation. **It is not a production cut list.**

## Persistence and sharing

- A saved configuration has a stable UUID, the validated selection, overall dimensions, the template version and rule-set version it was validated against, and its resolved items.
- Ownership is an anonymous browser session (httpOnly cookie); only a SHA-256 hash of the session id is stored. Accounts arrive in Phase 4.
- Another session cannot read, update or duplicate a configuration; the API answers 404 in each case.
- Each configuration has an unguessable share token. `/shared/<token>` shows a read-only view with no owner information, and "Start from this design" makes an independent, unsaved copy.
- Reloading never rewrites a saved configuration. It is revalidated against the current catalog and any new issues are shown; the customer decides what to change.

## API

All endpoints take and return JSON, reject cross-site requests (403), are rate limited (429), and validate the body with Zod (400 with a `fields` list). Errors have the shape `{ "error": { "code", "message" } }`.

| Method and path | Purpose | Success | Other responses |
| --- | --- | --- | --- |
| `POST /api/configurations/validate` | Validate a selection | 200 validation result (valid or not) | 404 product not configurable |
| `POST /api/configurations/resize` | Refit bays to `targetWidthUm` | 200 `{ ok: true, bays }` or `{ ok: false, issues }` | 404 |
| `POST /api/configurations` | Save a new configuration | 201 `{ id, shareToken, validation }` | 422 `{ error, validation }`, 404 |
| `PUT /api/configurations/:id` | Update an owned configuration | 200 `{ id, shareToken, validation }` | 422, 404 |
| `POST /api/configurations/:id/duplicate` | Copy an owned configuration | 201 `{ id, shareToken }` | 422, 404 |

Request body for validate and save:

```json
{
  "selection": {
    "productSlug": "ledger-media-console",
    "templateCode": "TPL-LEDGER-B",
    "bays": [
      { "moduleCode": "LED-DOOR", "widthUm": 457200, "count": 1 },
      { "moduleCode": "LED-DRAWERS", "widthUm": 609600, "count": 2 }
    ],
    "materialCode": "MAT-OAK-VENEER",
    "finishCode": "FIN-OAK-CLEAR",
    "base": "legs",
    "handleSku": "HDL-BAR",
    "accessories": [{ "sku": "ACC-CABLE-GROMMET", "quantity": 2 }]
  },
  "name": "Living room console"
}
```

## Known limits

- Template and component versions are integer columns, not separate version rows. They are recorded on every saved configuration, but there is no way yet to load an old version's definition. Full version rows arrive with admin authoring (Phase 5); orders will carry complete snapshots (Phase 4).
- Modules belong to one product. Sharing a module across products is a later change.
- An unsaved design is lost on a full page reload.
- The 2D preview shows the front only. There is no side or top view.
