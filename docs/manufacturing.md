# Manufacturing outputs

**Status: not implemented.** Nothing in Phase 1 produces manufacturing data.

## Constraints agreed for Phase 6

- Three separate layers: design geometry → BOM generation → machine-specific post-processing. Only the first two are in scope before CNC/CAM integration.
- CSV exports first; PDF job sheets and CAM formats later.
- Every part record carries the order, order item, configuration id and versions that produced it.
- Missing manufacturing attributes produce warnings on the export, not silent defaults.
- No output is described as production-ready until tolerances, kerf, tool constraints, edge treatment, grain direction and machine requirements have been reviewed by a qualified manufacturing professional (business decision 13).

## Not valid for manufacturing

The illustrative `preview_layout` on design templates, and the 0.75-inch panel thickness the illustration uses for drawing. Both are presentation only.
