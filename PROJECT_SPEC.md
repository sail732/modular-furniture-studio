# Modular Furniture E-Commerce & Configuration Platform

## Master Product Requirements and Claude Code Implementation Guide

**Document purpose:** This is the source-of-truth project brief for
designing, building, testing and evolving a professional
modular-furniture e-commerce application.

**Working product name:** Modular Furniture Studio (placeholder; make it
configurable).

**Initial market:** United States. Use USD, US customary dimensions
(inches) as the default, and support metric units in the data model so
they can be added without redesign.

**Business concept:** Customers choose professionally designed furniture
starting points, configure them using a controlled library of
standardized modules and options, preview the result, receive
transparent pricing, and order flat-packed, labeled, ready-to-assemble
furniture. The business manages the catalog, component library, pricing
rules, orders, and manufacturing outputs through an admin application.

------------------------------------------------------------------------

# PART I --- MASTER INSTRUCTIONS FOR CLAUDE

## 1. Your role

Act as a senior product architect, UX/UI designer, full-stack engineer,
database designer, QA engineer, and pragmatic technical lead.

Build a production-minded application, not a throwaway demo.
Prioritize: - Clear domain modeling and maintainable architecture. -
Excellent responsive user experience. - Accurate, deterministic
configuration and pricing logic. - Data integrity and server-side
validation. - Secure authentication and authorization. - Accessible,
performant interfaces. - Automated tests and useful developer
documentation. - Incremental delivery with working software at every
phase.

Do not silently invent business rules. Where a decision is not
specified, choose a sensible MVP default, document it in
`docs/assumptions-and-decisions.md`, and make it configurable where
appropriate. Ask questions only when a missing decision blocks safe
implementation.

## 2. Product vision

Create a digital furniture studio where customers can configure
attractive, practical furniture without needing a bespoke furniture
designer or carpenter.

The central product principle is:

> Sell configurable products assembled from standardized, reusable
> components---not arbitrary one-off designs that cannot be manufactured
> consistently.

The first release should use a constrained catalog of designs and
modules. Customers can personalize a design within valid rules. Do not
promise unlimited custom dimensions or configurations unless the
manufacturing model supports them.

## 3. Target users and roles

### Customer

-   Browse categories and product collections.
-   Compare predefined designs and starting prices.
-   Configure a product.
-   Save a configuration, if signed in.
-   Add configured products to cart and checkout.
-   View order status and assembly instructions.

### Administrator / catalog manager

-   Manage categories, products, design templates, images and
    descriptions.
-   Manage modules, materials, finishes, hardware and accessories.
-   Define allowed combinations and dimension constraints.
-   Configure pricing rules.
-   Preview and publish catalog changes.

### Operations / manufacturing user

-   View paid or accepted orders.
-   Review validated configurations.
-   Generate or download bill of materials (BOM), cut lists, component
    labels and packing lists.
-   Update production and fulfillment status.
-   Record exceptions or substitutions.

### Support user

-   Look up customers and orders.
-   Review the saved configuration and order history.
-   Add internal notes and manage support status, subject to
    permissions.

Implement role-based access control. A customer must never access
administrative or manufacturing functions.

------------------------------------------------------------------------

# PART II --- CUSTOMER EXPERIENCE

## 4. Website information architecture

Build a polished public website with these primary pages:

1.  Home
2.  Shop / All Furniture
3.  Furniture category landing pages
4.  Product collection / search results
5.  Product detail page
6.  Furniture configurator
7.  How It Works
8.  Materials & Finishes
9.  Delivery & Assembly
10. About
11. Contact / FAQ
12. Cart
13. Checkout
14. Customer account
15. Order confirmation and order tracking
16. Privacy policy, terms, shipping, returns and warranty pages (content
    should be clearly marked as draft until legally reviewed).

Suggested initial categories: - TV consoles and media units -
Bookshelves and wall shelving - Wardrobes and closet storage -
Home-office desks and storage - Sideboards and cabinets

Make categories data-driven so administrators can add or hide categories
without code changes.

## 5. Homepage design direction

Create a premium, modern, editorial-style furniture brand---not a
generic marketplace template.

The homepage should include: - Large lifestyle hero image and clear
value proposition. - Primary CTA: "Design your furniture" or "Explore
collections". - Featured furniture categories. - Best-selling / featured
designs. - "How it works" in three or four steps. - Explanation of
modularity and future expansion. - Materials and finish preview. -
Flat-pack delivery and assembly explanation. - Customer
reviews/testimonials using clearly identified sample content until real
reviews exist. - Newsletter signup only if implemented with consent and
a real backend. - Full footer with policies, contact and social links.

Use restrained typography, generous whitespace, consistent spacing,
high-quality furniture imagery, subtle interactions and a coherent
design system. Avoid clutter, excessive gradients, generic dashboard
styling on the storefront, and fabricated trust badges.

## 6. Product listing and product detail

Each product should support: - Name, slug, category, short and long
descriptions. - Main image and image gallery. - Starting price and
currency. - Dimensions and available size ranges. - Materials and
finishes. - Available design variants. - Key features and assembly
difficulty/time estimate, if known. - Shipping/lead-time information,
only when configured and verified. - Related products and compatible
add-on modules.

Listing pages should support: - Category filters. - Price range. - Width
/ size filters where relevant. - Material and finish filters. - Sort by
featured, price and newest. - Search with useful empty states. -
Responsive product cards with consistent image ratios.

Product detail pages should explain what is included, what can be
changed, the dimensions, materials, assembly expectations and the next
step into the configurator.

------------------------------------------------------------------------

# PART III --- MODULAR CONFIGURATOR

## 7. Configurator: core requirement

This is the defining feature of the business. Design it as a first-class
product experience, not a collection of unrelated dropdowns.

The configurator should guide the customer through a clear sequence:

1.  Select a starting design/template.
2.  Select overall dimensions within permitted ranges.
3.  Choose layout and module arrangement.
4.  Add, remove or replace compatible modules.
5.  Select finish, color and material.
6.  Configure doors, drawers, shelves, legs, handles and accessories.
7.  Review the design, dimensions and price.
8.  Save, add to cart or request help.

Use a stepper or clearly grouped stages. Show progress, current
selections, price and a persistent preview. Support back/forward
navigation without losing selections.

### 7.1 Starting templates

Administrators should be able to create predefined designs such as:

**TV console** - Model A: two cabinets + open shelf. - Model B: three
cabinets + two drawers. - Model C: four cabinets + two open shelves.

**Bookshelf** - Model A: narrow vertical shelf. - Model B: multi-bay
bookshelf. - Model C: wall-spanning modular shelving.

**Wardrobe** - Model A: two-door wardrobe. - Model B: three-section
wardrobe. - Model C: wardrobe with drawers and mixed hanging/shelf
sections.

These are example templates only. They must be manageable in the admin
catalog, not hardcoded into the UI.

### 7.2 Dimensions

Support configurable dimension fields: - Width - Height - Depth

For each product/template, define: - Minimum and maximum dimensions. -
Allowed increments (for example, 1, 2, or 6 inches). - Fixed dimensions
where applicable. - Module-specific dimensions. - Overall dimension
validation. - Rules for clearances, structural limits and incompatible
combinations.

Display dimensions in inches by default. Store numeric values in a
consistent canonical unit and explicitly handle conversion and rounding.
Do not use floating-point arithmetic for money. Do not let the browser
be the authority for validation or price.

If a customer requests a dimension outside the allowed range, explain
the constraint and offer valid alternatives. Do not silently clamp
values.

### 7.3 Modular component library

Create reusable component types such as: - Side panels - Top and bottom
panels - Shelves - Vertical dividers - Back panels - Doors - Drawer
boxes and drawer fronts - Legs and plinths - Handles and pulls -
Brackets and connectors - Hardware packs - Cable-management accessories

Each component should have: - Unique SKU / code. - Name and
description. - Component type. - Dimensions and dimensional
constraints. - Material and finish compatibility. - Manufacturing
attributes. - Cost basis and pricing attributes. - Weight, where
available. - Image or visual asset. - Active/inactive status.

A module is a customer-selectable assembly of components. A design
template is a valid starting arrangement of modules. Keep the
distinction clear in the domain model.

### 7.4 Compatibility and configuration rules

Implement a rule-based configuration engine. Examples: - A door must fit
a compatible cabinet opening. - A drawer module must fit the selected
cabinet width and depth. - A shelf must be compatible with the selected
support system. - Some finishes may not be available for some
materials. - A wall-mounted unit may require specified brackets and load
constraints. - Certain module combinations may exceed the maximum
overall width. - A component may require another component (for example,
a drawer front requires a drawer box).

Rules must be represented as data where practical, not scattered across
frontend conditionals.

The server must validate every configuration before saving it, adding it
to cart, or accepting an order. Return useful validation messages tied
to the relevant selection.

### 7.5 2D and 3D visualization

Implement visualization in stages:

**MVP** - A clear, responsive 2D front-view preview. - Show module
boundaries, doors, drawers, shelves and selected finish. - Show overall
width, height and depth. - Update the preview immediately when
selections change. - Provide a simplified side or top view if practical.

**Later phase** - Interactive 3D model with orbit, zoom and pan. -
Accurate proportions and finish/material representation. -
Component-level selection and highlighting. - Optional room-context
preview. - Exportable image or shareable configuration.

Do not fake a 3D viewer with a static image. If true 3D is not
implemented, label the preview accurately as a 2D representation.

Keep visualization independent from pricing and configuration
validation. A renderer must not become the source of truth for product
dimensions or manufacturing rules.

### 7.6 Price calculation

Build a deterministic pricing service. Example pricing model:

`total = base_design_price + module_prices + material_upcharges + finish_upcharges + hardware_and_accessories + optional_services + shipping + applicable_tax - discounts`

This is an illustrative formula. Implement a configurable pricing model
and document the chosen rules.

Requirements: - Store money as integer minor units (for USD, cents) or a
precise decimal type. - Calculate and validate prices on the server. -
Return a transparent line-item breakdown. - Keep product cost, retail
price and margin data private from customers. - Support fixed prices,
per-component prices, area/length-based prices and configurable
upcharges as needed. - Version pricing rules or snapshot the applicable
price on order placement so later catalog changes do not rewrite
historical orders. - Make shipping and tax separate from product
price. - Never claim a tax or shipping quote is final unless the
relevant integration/calculation supports it.

### 7.7 Configuration persistence

A configuration should be serializable and reproducible. Store: -
Product/template ID and version. - Selected modules and component
SKUs. - Dimensions and units. - Materials and finishes. - Accessories
and hardware. - Rule validation result/version. - Price breakdown and
pricing version. - Preview reference if generated. - Customer ownership
or anonymous session reference. - Created/updated timestamps.

Provide a stable configuration ID. Support save, reload, duplicate and
shareable links with appropriate access controls. Do not expose private
customer data through shareable URLs.

------------------------------------------------------------------------

# PART IV --- CART, CHECKOUT AND ORDER MANAGEMENT

## 8. Cart

A cart line must represent a specific validated configuration, not
merely a generic product ID.

Display: - Product and configuration summary. - Preview thumbnail. -
Dimensions and selected options. - Quantity. - Unit price and line
total. - Edit configuration action. - Remove action. - Subtotal,
estimated shipping and tax where available.

Revalidate configurations and prices on the server when cart contents
are changed and again before order creation.

## 9. Checkout

Build a clear checkout experience: - Contact information. - Shipping
address. - Billing address. - Delivery options where configured. - Order
summary. - Tax and shipping breakdown. - Payment step. - Terms and
policies acknowledgment.

Payment integration: - Use Stripe as the preferred candidate, but
confirm project requirements and account setup before enabling live
payments. - Start in test/sandbox mode. - Never store raw card
details. - Verify payment webhooks server-side and make webhook handling
idempotent. - Do not mark an order paid based only on a browser
redirect. - Keep secrets in environment variables. - Provide a
documented local/test payment workflow.

Do not create a fake payment success flow in production. If payment
integration is not configured, make the limitation explicit and provide
a development-only mock mode.

## 10. Order lifecycle

Support a configurable order state machine, initially: - Draft -
Awaiting payment - Paid - Validated - Queued for production - In
production - Quality check - Packed - Shipped - Delivered - Cancelled /
refunded (with appropriate rules)

Record status changes with actor, timestamp and notes. Prevent invalid
transitions. Customer-facing status labels may be simpler than internal
statuses.

An order must preserve immutable snapshots of: - Product
design/version. - Configuration and components. - Price breakdown. -
Shipping/billing information as required. - Applicable terms/policies
version. - Payment references and status.

------------------------------------------------------------------------

# PART V --- ADMINISTRATION AND MANUFACTURING

## 11. Admin application

Create a protected admin area with a professional, efficient interface.

### Catalog management

-   Categories and collections.
-   Products and design templates.
-   Product images and content.
-   Publish/unpublish and preview.
-   Search, filter and status management.

### Component management

-   Component SKUs and types.
-   Dimensions and constraints.
-   Materials, finishes and hardware compatibility.
-   Cost and retail pricing attributes.
-   Active/inactive status.
-   Component relationships and dependencies.

### Configuration rule management

-   Allowed module combinations.
-   Dimension ranges and increments.
-   Required/optional components.
-   Exclusions and dependencies.
-   Validation messages.
-   Rule versioning and test configurations.

### Pricing management

-   Base prices.
-   Component/module prices.
-   Material and finish upcharges.
-   Accessory prices.
-   Shipping rules.
-   Promotions/discounts, if included.
-   Preview of a calculated price before publishing.

### Order management

-   Search and filter orders.
-   View customer and configuration details.
-   View preview and full selected-component list.
-   Validate and approve configurations.
-   Update production and shipping statuses.
-   Record internal notes and exceptions.
-   Export order details.

### User and access management

-   Role assignment.
-   Account status.
-   Audit log for sensitive administrative actions.

Admin changes to published products or rules must not corrupt existing
carts or historical orders. Use versioning or immutable snapshots.

## 12. Manufacturing outputs

The platform should translate a validated configuration into structured
manufacturing data.

For each order line, generate: - Bill of materials (BOM). - Component
SKU and quantity. - Cut-list dimensions where supported. - Material and
finish requirements. - Edge-banding requirements where supported. -
Hardware and fastener list. - Packaging / carton list. - Component
labels with order and part identifiers. - Assembly instructions or a
link to the relevant instructions.

Provide CSV export first. Structure the system so PDF job sheets and
CNC/CAM integrations can be added later.

Important: - Do not claim that a cut list is production-ready until the
manufacturing rules, tolerances, kerf, tool constraints, edge treatment,
grain direction and machine-specific requirements have been reviewed by
a qualified manufacturing professional. - Keep design geometry, BOM
generation and machine-specific post-processing as separate layers. -
Include validation warnings for missing manufacturing attributes. -
Preserve traceability from every manufactured part to the configuration
and order that generated it.

------------------------------------------------------------------------

# PART VI --- TECHNICAL ARCHITECTURE

## 13. Architecture principles

Before implementation, inspect the existing repository and report: -
Existing framework and version. - Existing conventions and structure. -
Current dependencies. - Current tests and scripts. - Existing deployment
assumptions.

Do not replace a working project structure without explaining why.

If starting from an empty repository, propose a modern, maintainable
stack. A reasonable default for discussion is: - TypeScript
throughout. - Next.js with React for the web application. - A relational
database such as PostgreSQL. - Prisma or Drizzle ORM. - Server-side API
routes or a clearly separated backend service. - Auth.js, Clerk, or
another well-supported authentication provider, selected based on
deployment and business needs. - Stripe for payment processing when
configured. - Object storage for product images and generated assets. -
A component-based UI system with accessible primitives. - Automated
unit, integration and end-to-end tests.

These are candidate technologies, not mandatory choices. Evaluate
trade-offs and recommend a coherent stack before coding. Avoid
unnecessary microservices for the MVP.

## 14. Domain model

Design and document a relational schema. At minimum consider:

-   User
-   Role / Permission
-   CustomerProfile
-   Address
-   Category
-   Collection
-   Product
-   ProductVersion
-   DesignTemplate
-   DesignTemplateVersion
-   Module
-   Component
-   ComponentVersion
-   Material
-   Finish
-   Hardware
-   Accessory
-   CompatibilityRule
-   DimensionConstraint
-   PricingRule
-   PricingVersion
-   Configuration
-   ConfigurationItem
-   ConfigurationValidation
-   Cart
-   CartItem
-   Order
-   OrderItem
-   OrderConfigurationSnapshot
-   Payment
-   Shipment
-   ProductionJob
-   BillOfMaterials
-   BOMItem
-   CutListItem
-   Package
-   AssemblyInstruction
-   AuditLog

Do not create every table blindly. Produce an ER diagram and explain the
entities, relationships, constraints, indexes and versioning approach.
Normalize core business entities while keeping an immutable
configuration/order snapshot for historical reproducibility.

## 15. API and service boundaries

Define clear service boundaries for: - Catalog browsing. - Configuration
validation. - Pricing. - Configuration persistence. - Cart operations. -
Checkout and payments. - Orders. - Manufacturing data generation. -
Admin catalog operations.

Use schema validation at API boundaries. Return consistent errors with
useful messages. Apply authorization on the server, not merely by hiding
frontend buttons.

Document API contracts and important request/response examples.

## 16. Security, privacy and reliability

Implement: - Secure authentication and session handling. - Server-side
authorization and role checks. - Input validation and output encoding. -
Protection against common web vulnerabilities. - Rate limiting on
sensitive endpoints. - Secure password and account recovery flow if
passwords are managed directly. - CSRF protection where applicable. -
Secure headers and safe CORS configuration. - Secrets in environment
variables / secret manager. - Least-privilege database and storage
access. - Audit logs for administrative and financial operations. - Data
retention and deletion approach. - Backups and tested restore
procedure. - Error handling and structured logging. - No sensitive data
in logs. - Payment webhook signature verification and idempotency.

Use synthetic data in development. Do not place real customer or payment
data in test fixtures.

## 17. Performance, accessibility and SEO

Performance: - Optimize and appropriately size images. - Use responsive
image loading and lazy loading where appropriate. - Avoid unnecessary
client-side bundles. - Cache public catalog data carefully. - Keep
configuration and price calculations consistent with server truth. -
Measure important pages and interactions.

Accessibility: - Target WCAG 2.2 AA where practical. - Keyboard
navigation. - Visible focus states. - Semantic HTML. - Labels and
accessible validation messages. - Sufficient color contrast. -
Reduced-motion support. - Do not communicate state by color alone.

SEO: - Server-render public product/category pages where appropriate. -
Unique titles and descriptions. - Canonical URLs. - Product structured
data only when accurate. - Sitemap and robots rules. - Social sharing
metadata. - Human-readable slugs.

## 18. Responsive design

Design mobile-first and support: - Mobile phones. - Tablets. -
Desktop. - Large desktop.

The configurator must remain usable on a phone. Use a collapsible option
panel and a clear preview area. Do not simply shrink the desktop
interface.

------------------------------------------------------------------------

# PART VII --- DESIGN SYSTEM AND CONTENT

## 19. Visual direction

Brand feel: - Modern, warm, minimal, functional and
premium-but-accessible. - Furniture and materials should be the visual
focus. - Use neutral backgrounds and a restrained accent palette. - Use
consistent typography, spacing, borders, shadows and button styles. -
Use realistic, high-quality product photography. - Keep the interface
calm and easy to understand.

Create reusable design tokens for: - Colors. - Typography. - Spacing. -
Border radius. - Shadows. - Breakpoints. - Focus states. - Component
states.

Create reusable components for: - Header/navigation. - Footer. - Product
cards. - Category cards. - Price display. - Dimension input. - Finish
swatches. - Module selector. - Stepper. - Configuration summary. -
Preview panel. - Validation messages. - Cart line. - Admin
tables/forms. - Empty, loading, success and error states.

Do not use copyrighted competitor images or logos. Use licensed assets,
properly sourced stock imagery, or clearly labeled placeholders. Do not
represent placeholder images or testimonials as real company content.

## 20. Content and brand configurability

Keep business name, logo, contact details, policies, shipping text,
support links and social links configurable. Do not hardcode the
placeholder brand throughout the code.

Write concise, credible customer-facing copy. Avoid unsupported claims
such as "sustainable," "eco-friendly," "made in USA," "premium
hardwood," or specific delivery times unless the business can
substantiate them.

------------------------------------------------------------------------

# PART VIII --- DELIVERY PLAN

## 21. Build in phases

Do not attempt to implement the entire platform in one pass. Work in
small, reviewable increments and keep the app runnable.

### Phase 0 --- Discovery and architecture

Deliver: - Repository assessment. - Product requirements summary. -
Assumptions and open decisions. - Recommended stack and rationale. -
System architecture diagram. - ER diagram. - Main user journeys. -
Phased implementation plan. - Risks and dependencies.

Do not start large-scale coding until the architecture and MVP
boundaries are explained.

### Phase 1 --- Professional storefront foundation

Deliver: - App shell, design system and responsive navigation. -
Homepage. - Category and product listing pages. - Product detail
pages. - Seed catalog with clearly labeled sample content. - Basic
search and filters. - Working local development setup.

### Phase 2 --- Modular catalog and configuration engine

Deliver: - Data model for templates, modules and components. - Dimension
constraints. - Compatibility rules. - Server-side configuration
validation. - Configuration persistence. - MVP 2D preview. - Automated
tests for valid and invalid configurations.

### Phase 3 --- Pricing and cart

Deliver: - Deterministic pricing service. - Itemized price breakdown. -
Price/version snapshots. - Cart with editable configurations. -
Revalidation before checkout.

### Phase 4 --- Customer accounts and checkout

Deliver: - Authentication and account pages. - Saved configurations. -
Address management. - Test-mode payment integration. - Payment webhook
processing. - Order confirmation and order history.

### Phase 5 --- Admin and operations

Deliver: - Role-based admin. - Product/template management. -
Module/component management. - Compatibility and pricing rule
management. - Order management. - Audit logs.

### Phase 6 --- Manufacturing outputs

Deliver: - BOM generation. - CSV exports. - Cut-list structure and
validation warnings. - Packing list and labels. - Assembly-instruction
linkage.

### Phase 7 --- 3D and advanced capabilities

Deliver: - Interactive 3D visualization. - Shareable configurations. -
Advanced room preview if justified. - More advanced pricing and shipping
integrations. - Analytics and conversion tracking with appropriate
consent.

### Phase 8 --- Production readiness

Deliver: - Security review. - Accessibility review. - Performance
checks. - Backup/restore documentation. - Monitoring and error
reporting. - Deployment pipeline. - Production environment
configuration. - Launch checklist.

## 22. MVP boundary

The first usable MVP should include: - Professional responsive
storefront. - At least three furniture categories, with a small curated
sample catalog. - A few predefined designs per category. - Standardized
modules and components. - Controlled dimension and compatibility
rules. - 2D live preview. - Server-validated price calculation. - Cart
and saved configurations. - Admin catalog management. - Test checkout or
clearly separated inquiry/order-request flow. - Basic order
management. - Basic BOM CSV export.

Do not block the MVP on photorealistic 3D, CNC integration, AI design
generation, warehouse management, advanced promotions or complex
shipping optimization.

------------------------------------------------------------------------

# PART IX --- QUALITY AND ACCEPTANCE CRITERIA

## 23. Definition of done

A feature is not complete merely because a page renders.

For each feature: - User flow works end to end. - Data is persisted
correctly. - Server validation is present. - Authorization is
enforced. - Loading, empty, error and success states exist. - Responsive
behavior is checked. - Accessibility basics are checked. - Tests cover
important behavior. - Documentation is updated.

## 24. Critical acceptance tests

At minimum, demonstrate these scenarios:

1.  A visitor can browse categories and open a product.
2.  A customer can select a predefined design and configure valid
    dimensions.
3.  An invalid dimension is rejected with a clear explanation.
4.  An incompatible component combination is rejected.
5.  Changing a module updates the preview and server-calculated price.
6.  A customer can save and reload a configuration.
7.  A configured product can be added to cart and edited.
8.  A changed catalog price does not silently rewrite an already placed
    order.
9.  A customer cannot access admin or manufacturing endpoints.
10. An administrator can publish a product/template and configure its
    modules.
11. An order can generate a BOM with the correct component SKUs and
    quantities.
12. Payment status is confirmed through a verified server-side payment
    event, not a client-side redirect.
13. Duplicate payment webhooks do not create duplicate payments or
    orders.
14. A historical order remains reproducible after catalog changes.
15. The main customer journey works on mobile, tablet and desktop.

## 25. Test strategy

Use: - Unit tests for dimension, compatibility and pricing rules. -
Integration tests for API, persistence and order workflows. - End-to-end
tests for key customer and admin journeys. - Authorization tests for all
privileged operations. - Regression tests for configuration and pricing
edge cases.

Include fixtures for: - A valid TV console configuration. - A valid
bookshelf configuration. - An invalid dimension. - An incompatible
door/module combination. - A finish/material mismatch. - A price change
between cart and order. - A repeated payment webhook.

------------------------------------------------------------------------

# PART X --- REQUIRED PROJECT DOCUMENTATION

## 26. Keep these documents current

Create and maintain:

-   `README.md` --- setup, commands, architecture overview.
-   `docs/product-requirements.md` --- agreed product requirements.
-   `docs/architecture.md` --- architecture and service boundaries.
-   `docs/data-model.md` --- entities and relationships.
-   `docs/assumptions-and-decisions.md` --- assumptions, decisions and
    unresolved questions.
-   `docs/configuration-engine.md` --- dimension and compatibility
    rules.
-   `docs/pricing.md` --- price calculation and versioning.
-   `docs/manufacturing.md` --- BOM and cut-list logic, limitations and
    outputs.
-   `docs/security.md` --- security model and operational controls.
-   `docs/deployment.md` --- environments and deployment.
-   `docs/testing.md` --- test strategy and commands.
-   `docs/roadmap.md` --- phases, progress and known gaps.

Update documentation when implementation decisions change.

------------------------------------------------------------------------

# PART XI --- HOW CLAUDE SHOULD WORK

## 27. Operating rules

1.  Start by inspecting the repository. Do not assume it is empty.
2.  Explain the current state before making disruptive changes.
3.  Present the proposed architecture and MVP plan before major
    implementation.
4.  Work phase by phase. Do not skip ahead without confirming the prior
    phase is stable.
5.  Before each phase, list the scope and files/services likely to
    change.
6.  Implement complete vertical slices rather than disconnected mock
    screens.
7.  Use realistic sample furniture data, but clearly identify it as
    sample data.
8.  Do not hardcode product-specific options into reusable components.
9.  Keep business logic out of presentation components.
10. Keep pricing and configuration validation on the server.
11. Use database migrations and seed scripts.
12. Do not commit secrets, API keys or real customer information.
13. Do not silently remove existing features or dependencies.
14. Run relevant tests, linting and type checks after each meaningful
    change.
15. Fix regressions introduced by the work before proceeding.
16. If a tool, API key, account or external service is unavailable,
    implement a documented integration boundary and explain what
    remains.
17. Do not claim a feature works unless it has been implemented and
    tested.
18. At the end of each phase, report:
    -   What was implemented.
    -   Important design/technical decisions.
    -   Files and database changes.
    -   Commands to run.
    -   Tests executed and results.
    -   Known limitations.
    -   Next recommended phase.

## 28. First instruction to Claude

Do not begin by generating the entire application.

First: 1. Inspect the repository and its current state. 2. Read this
complete specification. 3. Identify ambiguities, risks and dependencies.
4. Recommend the MVP technology stack and explain trade-offs. 5. Propose
the architecture, database model and main user journeys. 6. Create a
phased implementation plan with clear acceptance criteria. 7. Identify
which external services require accounts, credentials or paid plans. 8.
Record assumptions and decisions in the documentation. 9. Stop and
present the plan for review before implementing Phase 1.

------------------------------------------------------------------------

# PART XII --- COPY-AND-PASTE PROMPTS FOR CLAUDE

Use the following prompts in order. Keep this master file in the project
root (for example, `PROJECT_SPEC.md`) and tell Claude to read it before
each major phase.

## Prompt 0 --- Understand and plan

> Read `PROJECT_SPEC.md` completely. Inspect the existing repository,
> including package files, source code, tests, environment examples and
> documentation. Do not make major code changes yet.
>
> Produce a concise but technically detailed assessment of the existing
> project, recommended stack, architecture, data model, customer
> journeys, admin journeys, security boundaries, external dependencies,
> MVP scope and phased delivery plan.
>
> Identify assumptions and decisions that need confirmation. Create or
> update the documentation listed in the specification. Do not invent
> credentials, integrations, product claims or manufacturing
> constraints. Stop for review before implementation.

## Prompt 1 --- Build the storefront foundation

> Implement Phase 1 of `PROJECT_SPEC.md` only. Build a polished,
> responsive furniture storefront with a premium modern visual identity.
> Include homepage, category pages, product listing/search/filter,
> product detail pages, reusable design-system components and realistic
> sample catalog data.
>
> Use reusable, data-driven components. Do not hardcode individual
> furniture products into page layouts. Ensure mobile, tablet and
> desktop usability. Include loading, empty and error states. Use
> properly licensed images or clearly labeled placeholders; do not copy
> competitor branding or images.
>
> Run type checks, linting and tests. Update documentation. Report
> exactly what works and what remains. Do not implement fake checkout or
> claim that the configurator is complete.

## Prompt 2 --- Build the modular product data model

> Implement the catalog and modular domain model described in
> `PROJECT_SPEC.md`. Model products, design templates, modules,
> components, materials, finishes, hardware, dimension constraints and
> compatibility rules.
>
> Create database migrations, seed data and an ER diagram. Separate a
> design template from a module and a module from its underlying
> components. Use stable SKUs and versioning so published changes do not
> corrupt historical orders.
>
> Seed at least one useful example for TV consoles, bookshelves and
> wardrobes. Keep sample data editable through the admin layer later.
> Add schema and domain tests. Explain all important modeling decisions.

## Prompt 3 --- Build the configuration engine

> Implement Phase 2 of `PROJECT_SPEC.md`. Build a reusable,
> server-authoritative configuration engine.
>
> Support selecting a predefined design, changing permitted dimensions,
> selecting compatible modules and components, choosing
> materials/finishes and adding accessories. Implement dimension
> constraints, increments, dependencies, exclusions and compatibility
> validation.
>
> Return actionable validation errors that identify the invalid
> selection. The frontend must not be the authority for validity. Store
> configurations in a reproducible structured format with template and
> rule versions.
>
> Implement the MVP live 2D preview with dimensions and visible module
> boundaries. Do not label it 3D. Add unit and integration tests for
> valid and invalid configurations. Demonstrate a complete TV-console
> configuration journey.

## Prompt 4 --- Build pricing and cart

> Implement the pricing and cart phases from `PROJECT_SPEC.md`.
>
> Create a deterministic server-side pricing service with a transparent
> line-item breakdown. Use integer cents or a precise decimal type for
> money. Support base design prices, module/component prices,
> material/finish upcharges and accessories. Keep internal cost and
> margin data private.
>
> Revalidate the configuration and price on the server when adding to
> cart, updating cart items and proceeding to checkout. Store
> appropriate price/version snapshots. Build an editable cart that
> retains the selected configuration and preview.
>
> Add tests for rounding, price changes, invalid configurations,
> quantity changes and historical price snapshots. Document shipping and
> tax assumptions separately.

## Prompt 5 --- Build customer accounts and checkout

> Implement customer accounts, saved configurations, address management,
> checkout, payment integration boundaries and order history as
> described in `PROJECT_SPEC.md`.
>
> Use test mode for payment integration until live credentials and
> approval are explicitly supplied. Never store card data. Verify
> payment webhooks on the server, implement idempotency, and do not
> trust a client-side success redirect as proof of payment.
>
> Preserve an immutable order snapshot containing product version,
> configuration, component list, price breakdown and relevant
> address/order details. If a real payment provider cannot be
> configured, provide a clearly labeled development-only workflow rather
> than a fake production payment flow.
>
> Test successful, failed, cancelled and duplicate webhook scenarios.
> Document required environment variables without including secrets.

## Prompt 6 --- Build the admin application

> Implement the protected admin and operations application from
> `PROJECT_SPEC.md`.
>
> Provide role-based access control and server-side authorization. Build
> catalog, product/template, module/component, material/finish,
> compatibility-rule and pricing management. Include preview and
> validation before publishing changes.
>
> Add order search, order detail, configuration review, production
> status updates, internal notes and audit logs. Ensure that catalog
> changes cannot alter historical order snapshots.
>
> Use reusable forms and tables with validation, filters, pagination,
> loading and error states. Add tests proving that customers cannot
> access privileged routes or APIs.

## Prompt 7 --- Build manufacturing outputs

> Implement manufacturing data generation from validated configurations.
> Generate a structured BOM, component quantities and SKUs, cut-list
> records where supported, hardware list, material/finish requirements,
> packing list and component labels.
>
> Start with CSV exports and a clear admin workflow. Keep generic design
> geometry separate from machine-specific CNC/CAM output. Add warnings
> for missing manufacturing metadata and do not claim production
> readiness until tolerances, kerf, grain direction, edge treatment and
> machine constraints have been reviewed.
>
> Test that known configurations produce the expected component
> quantities and trace every output back to its order and configuration
> version.

## Prompt 8 --- Add 3D visualization

> Evaluate and implement an appropriate interactive 3D visualization
> approach for the modular furniture configurator. Review the current
> component model and configuration structure before choosing a
> rendering library.
>
> Support orbit, zoom, pan, accurate proportions, module
> selection/highlighting and finish changes. Keep the 3D renderer
> separate from the configuration, validation and pricing services.
> Provide graceful fallback to the 2D preview on unsupported devices or
> rendering failures.
>
> Do not use a static image or pre-rendered screenshot and describe it
> as interactive 3D. Document asset requirements, performance
> considerations and limitations. Add tests for the
> configuration-to-renderer data contract.

## Prompt 9 --- Production readiness review

> Perform a production-readiness review against every requirement in
> `PROJECT_SPEC.md`. Inspect security, authentication, authorization,
> payment handling, data integrity, configuration validation, pricing,
> accessibility, SEO, responsiveness, performance, logging,
> backup/restore, deployment and error handling.
>
> Run the full automated test suite, type checks and linting. Identify
> critical, high, medium and low risks. Fix issues that can safely be
> fixed in scope; document those requiring business, legal,
> manufacturing or external-provider decisions.
>
> Produce a launch checklist and deployment guide. Clearly distinguish
> implemented and tested features from planned, mocked, partially
> implemented or unverified features. Do not declare production
> readiness if critical checks fail.

------------------------------------------------------------------------

# PART XIII --- BUSINESS DECISIONS TO RESOLVE BEFORE LAUNCH

These decisions should be recorded as the business evolves:

1.  Initial product categories and exact launch catalog.
2.  Target customer and price positioning.
3.  Materials: engineered wood, plywood, solid wood, metal or
    combinations.
4.  Standard panel thicknesses and finish options.
5.  Manufacturing location and supplier strategy.
6.  In-house CNC production versus outsourced cutting/edge-banding.
7.  Packaging standards and parcel/freight shipping approach.
8.  Assembly hardware and instruction format.
9.  Return, damage, warranty and replacement-part policies.
10. Whether to support made-to-measure dimensions in the first release.
11. Payment provider and tax/shipping integrations.
12. Brand name, visual identity and product photography.
13. Manufacturing tolerances and qualified engineering review.
14. Whether installation or assembly services will be offered.

Do not present these as settled facts until the business owner confirms
them.

------------------------------------------------------------------------

# Final instruction

Treat this document as the long-term product specification. Build a
professional, extensible modular furniture business platform in
controlled phases. Optimize for a reliable customer experience and a
manufacturable product system---not merely a visually attractive demo.

**The most important success criterion:** A customer must be able to
configure a valid piece of furniture, see an accurate representation,
receive a correct price, place an order, and have that exact
configuration translated into traceable manufacturing information.
