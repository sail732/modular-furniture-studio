# Configuration engine

**Status: not implemented.** Phase 1 contains no configurator. This document records the agreed design constraints and what exists today, so Phase 2 starts from them.

## What exists today

- Per-design width range and increment (`design_templates.min_width_um`, `max_width_um`, `width_increment_um`), displayed on product pages. They are informational: nothing can be configured yet.
- Unit conversion in `src/lib/units.ts`. `inchesToUm` throws on values it cannot represent exactly instead of rounding them.
- A database CHECK that keeps each design's default width inside its range.

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
