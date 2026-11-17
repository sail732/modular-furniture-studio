# Configuration engine

**Status: not implemented.** Phase 1 contains no configurator. This document records the agreed design constraints and what exists today, so Phase 2 starts from them.

## What exists today

- Per-design width range and increment (`design_templates.min_width_um`, `max_width_um`, `width_increment_um`), displayed on product pages. They are informational: nothing can be configured yet.
- Unit conversion in `src/lib/units.ts`. `inchesToUm` throws on values it cannot represent exactly instead of rounding them.
- Database CHECKs that keep each design's default width inside its range and on its step grid.
- `allowedWidths`, `isAllowedWidth` and `nearestAllowedWidths` in `src/lib/width-options.ts`, with tests. Not yet called by any write path, because nothing can be configured or saved yet.

## Dimension model (confirmed)

Confirmed by the business owner on 2026-11-16:

- **Width** is the only dimension a customer can change, and only in fixed steps between a design's minimum and maximum.
- **Height and depth** are fixed for each design. To get a different height or depth, the customer picks a different design or product.
- There are no made-to-measure sizes in the first release.

A width is allowed when `min ≤ width ≤ max` and `(width − min)` is an exact multiple of the step. `src/lib/width-options.ts` implements this (`allowedWidths`, `isAllowedWidth`, `nearestAllowedWidths`) and is the only place that rule is written. The database guarantees every design's range and standard width sit on the step grid, and product pages list the exact widths.

What this simplifies in Phase 2: the configurator shows a pick-list of widths rather than a free-text field; a request for height or depth is rejected with a message pointing to other designs; modules need a fixed set of widths, not continuous ranges.

## Requirements for Phase 2 (from the spec)

1. Validation runs on the server before a configuration is saved, added to a cart, or ordered.
2. Rules are data: dimension constraints and compatibility rules are rows, versioned as a rule set.
3. Errors are tied to the selection that caused them and say what is allowed. Example shape:

   ```json
   {
     "valid": false,
     "issues": [
       {
         "code": "DIMENSION_OUT_OF_RANGE",
         "path": "dimensions.width",
         "message": "Width must be between 66″ and 90″ in 6″ steps.",
         "allowed": { "minUm": 1676400, "maxUm": 2286000, "stepUm": 152400 },
         "nearest": [1981200, 2133600]
       }
     ]
   }
   ```
4. Values are never silently clamped.
5. A stored configuration records the template version and rule-set version it was validated against.
6. The 2D preview renders from the validated configuration and is labeled 2D.

## Proposed rule kinds

| Kind | Meaning | Example |
| --- | --- | --- |
| `dimension_range` | min, max, step for a dimension | Width 66″ to 90″ in 6″ steps |
| `fits_within` | A component must fit its host opening | Door fits cabinet opening |
| `requires` | Selecting A requires B | Drawer front requires drawer box |
| `excludes` | A and B cannot be combined | Finish not available on a material |
| `max_total` | Sum over modules must not exceed a limit | Total module width ≤ overall width |
| `requires_when` | Conditional requirement | Wall-mounted unit requires wall rail |

Validation is a pure function: `(configuration, catalog snapshot, rule set) → result`. No database access inside it, so it is cheap to unit test with fixtures.
