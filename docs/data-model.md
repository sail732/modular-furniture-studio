# Data model

## Conventions

- **Money:** integer minor units (`*_cents`) plus an ISO 4217 `currency`. No floating point anywhere.
- **Lengths:** integer micrometres (`*_um`). One inch is exactly 25,400 µm, so every 1/8-inch step and every 0.001 mm is an exact integer. Conversion and display live in `src/lib/units.ts`. Metric display is already supported.
- **Identifiers:** UUID primary keys; human-facing stable codes (`slug`, `code`/SKU) are unique and never reused.
- **Publishing:** `status` is `draft`, `published` or `archived`. The storefront reads only published rows in visible categories.
- **Sample data:** `is_sample` marks seed content. The seed replaces only those rows.
- **Integrity:** foreign keys everywhere; CHECK constraints for prices, ranges and formats; the database rejects invalid rows even if application code is wrong.

## Implemented in Phase 1

```mermaid
erDiagram
  categories ||--o{ products : contains
  products ||--|{ design_templates : "offered as"
  products ||--o{ product_finishes : "available in"
  finishes ||--o{ product_finishes : ""
  materials ||--|{ finishes : "has"

  categories { uuid id PK
    varchar slug UK
    varchar name
    int sort_order
    bool is_visible
    bool is_sample }
  products { uuid id PK
    uuid category_id FK
    varchar slug UK
    varchar name
    jsonb key_features
    enum assembly_difficulty
    int assembly_minutes
    varchar lead_time_note
    enum status
    bool is_featured
    timestamptz published_at }
  design_templates { uuid id PK
    uuid product_id FK
    varchar code UK
    int base_price_cents
    char currency
    int default_width_um
    int default_height_um
    int default_depth_um
    int min_width_um
    int max_width_um
    int width_increment_um
    jsonb preview_layout
    enum status }
  materials { uuid id PK
    varchar code UK
    varchar name
    bool is_active }
  finishes { uuid id PK
    uuid material_id FK
    varchar code UK
    char swatch_hex
    bool is_active }
  product_finishes { uuid product_id PK
    uuid finish_id PK
    bool is_default }
```

Indexes: unique on every slug/code; `products(category_id, status)`; `design_templates(product_id, status)`; `finishes(material_id)`; `product_finishes(finish_id)`.

Two Phase 1 fields are deliberately temporary and will move in Phase 2:

- `design_templates.preview_layout` is an illustrative bay layout. It will be derived from the template's modules.
- Width range and increment on `design_templates` may move to `dimension_constraints` rows. Height and depth stay as fixed columns: they are not configurable (D19).

A CHECK constraint (`design_templates_width_on_step`) requires `max_width - min_width` and `default_width - min_width` to be exact multiples of the increment, so every design's allowed widths are a clean list.

## Planned model

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
