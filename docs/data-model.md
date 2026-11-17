# Data model

## Conventions

- **Money:** integer minor units (`*_cents`) plus an ISO 4217 `currency`. No floating point anywhere.
- **Lengths:** integer micrometres (`*_um`). One inch is exactly 25,400 µm, so every 1/8-inch step and every 0.001 mm is an exact integer. Conversion and display live in `src/lib/units.ts`. Metric display is already supported.
- **Identifiers:** UUID primary keys; human-facing stable codes (`slug`, `code`/SKU) are unique and never reused.
- **Publishing:** `status` is `draft`, `published` or `archived`. The storefront reads only published rows in visible categories.
- **Sample data:** `is_sample` marks seed content. The seed replaces only those rows.
- **Integrity:** foreign keys everywhere; CHECK constraints for prices, ranges and formats; the database rejects invalid rows even if application code is wrong.

## Implemented (Phases 1 and 2)

```mermaid
erDiagram
  categories ||--o{ products : contains
  products ||--|{ design_templates : "offered as"
  products ||--o{ product_finishes : "available in"
  finishes ||--o{ product_finishes : ""
  materials ||--|{ finishes : has
  products ||--|{ modules : offers
  modules ||--|{ module_widths : "made in"
  modules ||--o{ module_components : "built from"
  components ||--o{ module_components : ""
  products ||--o{ product_components : "carcass recipe"
  components ||--o{ product_components : ""
  products ||--o{ product_accessories : "optional"
  components ||--o{ product_accessories : ""
  design_templates ||--|{ template_bays : "starts as"
  modules ||--o{ template_bays : ""
  rule_sets ||--|{ compatibility_rules : contains
  products ||--o{ compatibility_rules : "scoped to"
  products ||--o{ configurations : ""
  design_templates ||--o{ configurations : "based on"
  configurations ||--|{ configuration_items : "resolved to"
  components ||--o{ configuration_items : ""

  design_templates { uuid id PK
    varchar code UK
    int version
    int base_price_cents
    int default_width_um
    int default_height_um
    int default_depth_um
    int min_width_um
    int max_width_um
    int width_increment_um
    int min_bays
    int max_bays
    varchar default_base
    jsonb allowed_bases
    jsonb default_accessories
    enum status }
  components { uuid id PK
    varchar sku UK
    int revision
    enum type
    bool is_cut_to_size
    bool takes_finish
    int cost_cents "private"
    jsonb manufacturing "private"
    bool is_active }
  modules { uuid id PK
    uuid product_id FK
    varchar code UK
    varchar type
    varchar count_label
    int min_count
    int max_count
    int default_count
    jsonb cell_template
    int handles_fixed
    int handles_per_count }
  module_components { uuid module_id PK
    uuid component_id PK
    int quantity_fixed
    int quantity_per_count
    varchar cut_to }
  product_components { uuid product_id PK
    uuid component_id PK
    int quantity
    varchar quantity_rule
    varchar cut_to
    varchar when_base }
  template_bays { uuid template_id PK
    int position PK
    uuid module_id FK
    int width_um
    int count }
  compatibility_rules { uuid id PK
    uuid rule_set_id FK
    varchar code
    uuid product_id FK "null = all products"
    jsonb definition
    text message
    varchar path
    bool is_active }
  configurations { uuid id PK
    varchar share_token UK
    char owner_session_hash
    uuid product_id FK
    uuid template_id FK
    int template_version
    int rule_set_version
    jsonb selection
    int width_um
    int height_um
    int depth_um
    timestamptz validated_at }
  configuration_items { uuid configuration_id PK
    int line_no PK
    varchar source
    int bay_index
    uuid component_id FK
    varchar sku
    int component_revision
    int quantity
    int cut_length_um
    varchar finish_code }
```

Phase 1 tables (`categories`, `products`, `materials`, `finishes`, `product_finishes`) are unchanged.

Constraints worth knowing:

- `design_templates_width_on_step`: the width range and standard width sit exactly on the step grid.
- `modules_count_range`, `design_templates_bay_range`, positive-quantity and non-negative-cost checks.
- Deleting a product cascades to its modules, templates and recipes. Components are protected (`RESTRICT`) while any recipe or saved configuration item references them.
- `components.cost_cents` and `components.manufacturing` are private. No storefront or configurator query selects them, and a test asserts they never appear in the browser-safe catalog.

What changed from Phase 1: `design_templates.preview_layout` was removed. The 2D illustration is now derived from each template's `template_bays` and the modules' `cell_template`, so catalog pictures and the configurator preview come from the same data.

### Versioning in place today

- `design_templates.version`, `components.revision` and `rule_sets.version` are integers recorded on every saved configuration and configuration item.
- A saved configuration is never rewritten when the catalog changes. On reload it is revalidated and any new issues are shown.
- Not yet: separate version rows that let an old definition be loaded, and immutable order snapshots. Those arrive with admin authoring (Phase 5) and orders (Phase 4).

## Planned model

The diagram below is the target for later phases. Entities already implemented above keep their shape; version tables, carts, users, orders and manufacturing are still to come.

```mermaid
erDiagram
  products ||--|{ product_versions : versions
  design_templates ||--|{ design_template_versions : versions
  design_template_versions ||--|{ template_modules : arranges
  modules ||--o{ template_modules : ""
  modules ||--|{ module_components : "assembled from"
  components ||--|{ component_versions : versions
  component_versions ||--o{ module_components : ""
  design_template_versions ||--o{ dimension_constraints : limits
  rule_sets ||--|{ compatibility_rules : contains
  pricing_versions ||--|{ pricing_rules : contains

  configurations ||--|{ configuration_items : selects
  configurations ||--o{ configuration_validations : "checked by"
  configurations }o--|| design_template_versions : "based on"
  carts ||--o{ cart_items : holds
  cart_items }o--|| configurations : references

  users ||--o{ user_roles : has
  users ||--o| customer_profiles : ""
  customer_profiles ||--o{ addresses : ""
  users ||--o{ configurations : owns
  users ||--o{ orders : places

  orders ||--|{ order_items : contains
  order_items ||--|| order_configuration_snapshots : freezes
  orders ||--o{ payments : "paid by"
  orders ||--o{ order_status_events : history
  orders ||--o{ shipments : ""
  order_items ||--o| production_jobs : ""
  production_jobs ||--|| bills_of_materials : ""
  bills_of_materials ||--|{ bom_items : ""
  bom_items ||--o{ cut_list_items : ""
  production_jobs ||--o{ packages : ""
  users ||--o{ audit_log : "acted in"
```

### Three levels, kept separate

| Level | What it is | Example |
| --- | --- | --- |
| Component | A manufactured or purchased part with a SKU, dimensions, cost and manufacturing attributes | Side panel 20″ × 16″, hinge, drawer runner |
| Module | A customer-selectable assembly of components | "Doored cabinet bay, 18″", "Two-drawer bay, 18″" |
| Design template | A valid starting arrangement of modules for a product | "Model B: three cabinets and two drawers" |

Hardware and accessories are components distinguished by `component_type`, not separate tables, unless they later need different attributes.

### Versioning and history

Two mechanisms, used together:

1. **Version rows** for things that are authored and published: product, design template, component, rule set, pricing. Publishing creates a new immutable version; drafts are edited freely. Carts and saved configurations reference a specific version, so a later edit cannot corrupt them. They are revalidated against the current version at add-to-cart and at checkout, and the customer is told when something changed.
2. **Snapshots** for things that must be reproducible forever: an order item stores a complete JSON copy of the configuration, resolved component list, price breakdown, rule and pricing version ids, and policy versions. Reproducing an order never joins to live catalog tables.

### Open modeling questions for Phase 2

- ~~Are module widths a fixed set or a range?~~ Decided (D19): a design's overall width moves in fixed steps; height and depth are fixed per design. Consequence for Phase 2: each module comes in a fixed set of widths, and a width step is realised by swapping or resizing modules to the next size in that set, never by an arbitrary dimension. `dimension_constraints` therefore only needs to describe width.
- Are compatibility rules expressible as a small set of typed rule kinds (`requires`, `excludes`, `fits_within`, `max_total`), or is a general expression language needed? Proposal: start with typed kinds stored as rows with JSON parameters.
