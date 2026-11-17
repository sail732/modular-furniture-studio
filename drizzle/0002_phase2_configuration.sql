CREATE TYPE "public"."component_type" AS ENUM('top_panel', 'bottom_panel', 'side_panel', 'divider', 'back_panel', 'shelf', 'door', 'drawer_box', 'drawer_front', 'leg', 'plinth', 'handle', 'hinge', 'drawer_runner', 'hanging_rail', 'hardware_pack', 'accessory');--> statement-breakpoint
CREATE TABLE "compatibility_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_set_id" uuid NOT NULL,
	"code" varchar(60) NOT NULL,
	"product_id" uuid,
	"definition" jsonb NOT NULL,
	"message" text NOT NULL,
	"path" varchar(60) DEFAULT 'bays' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(60) NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" "component_type" NOT NULL,
	"width_um" integer,
	"height_um" integer,
	"depth_um" integer,
	"is_cut_to_size" boolean DEFAULT false NOT NULL,
	"takes_finish" boolean DEFAULT false NOT NULL,
	"cost_cents" integer,
	"weight_grams" integer,
	"manufacturing" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "components_cost_non_negative" CHECK ("components"."cost_cents" IS NULL OR "components"."cost_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "configuration_items" (
	"configuration_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"source" varchar(12) NOT NULL,
	"bay_index" integer,
	"module_code" varchar(60),
	"component_id" uuid NOT NULL,
	"sku" varchar(60) NOT NULL,
	"component_revision" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"quantity" integer NOT NULL,
	"cut_length_um" integer,
	"finish_code" varchar(40),
	CONSTRAINT "configuration_items_configuration_id_line_no_pk" PRIMARY KEY("configuration_id","line_no"),
	CONSTRAINT "configuration_items_quantity_positive" CHECK ("configuration_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_token" varchar(64) NOT NULL,
	"owner_session_hash" char(64),
	"name" varchar(120) NOT NULL,
	"product_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"template_version" integer NOT NULL,
	"rule_set_version" integer NOT NULL,
	"selection" jsonb NOT NULL,
	"width_um" integer NOT NULL,
	"height_um" integer NOT NULL,
	"depth_um" integer NOT NULL,
	"unit" varchar(4) DEFAULT 'in' NOT NULL,
	"validation_issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"validated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_components" (
	"module_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"quantity_fixed" integer DEFAULT 0 NOT NULL,
	"quantity_per_count" integer DEFAULT 0 NOT NULL,
	"cut_to" varchar(20) DEFAULT 'none' NOT NULL,
	CONSTRAINT "module_components_module_id_component_id_pk" PRIMARY KEY("module_id","component_id")
);
--> statement-breakpoint
CREATE TABLE "module_widths" (
	"module_id" uuid NOT NULL,
	"width_um" integer NOT NULL,
	CONSTRAINT "module_widths_module_id_width_um_pk" PRIMARY KEY("module_id","width_um"),
	CONSTRAINT "module_widths_positive" CHECK ("module_widths"."width_um" > 0)
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"code" varchar(60) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"type" varchar(30) NOT NULL,
	"count_label" varchar(60),
	"min_count" integer DEFAULT 1 NOT NULL,
	"max_count" integer DEFAULT 1 NOT NULL,
	"default_count" integer DEFAULT 1 NOT NULL,
	"cell_template" jsonb NOT NULL,
	"handles_fixed" integer DEFAULT 0 NOT NULL,
	"handles_per_count" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_count_range" CHECK ("modules"."min_count" >= 0 AND "modules"."min_count" <= "modules"."default_count" AND "modules"."default_count" <= "modules"."max_count")
);
--> statement-breakpoint
CREATE TABLE "product_accessories" (
	"product_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"max_quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "product_accessories_product_id_component_id_pk" PRIMARY KEY("product_id","component_id"),
	CONSTRAINT "product_accessories_max_positive" CHECK ("product_accessories"."max_quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "product_components" (
	"product_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"quantity_rule" varchar(20) DEFAULT 'fixed' NOT NULL,
	"cut_to" varchar(20) DEFAULT 'none' NOT NULL,
	"when_base" varchar(12),
	CONSTRAINT "product_components_product_id_component_id_pk" PRIMARY KEY("product_id","component_id"),
	CONSTRAINT "product_components_quantity_positive" CHECK ("product_components"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "rule_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_bays" (
	"template_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"module_id" uuid NOT NULL,
	"width_um" integer NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "template_bays_template_id_position_pk" PRIMARY KEY("template_id","position")
);
--> statement-breakpoint
ALTER TABLE "design_templates" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "design_templates" ADD COLUMN "min_bays" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "design_templates" ADD COLUMN "max_bays" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "design_templates" ADD COLUMN "default_base" varchar(12) DEFAULT 'plinth' NOT NULL;--> statement-breakpoint
ALTER TABLE "design_templates" ADD COLUMN "allowed_bases" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "design_templates" ADD COLUMN "default_accessories" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "compatibility_rules" ADD CONSTRAINT "compatibility_rules_rule_set_id_rule_sets_id_fk" FOREIGN KEY ("rule_set_id") REFERENCES "public"."rule_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_rules" ADD CONSTRAINT "compatibility_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_items" ADD CONSTRAINT "configuration_items_configuration_id_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_items" ADD CONSTRAINT "configuration_items_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configurations" ADD CONSTRAINT "configurations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configurations" ADD CONSTRAINT "configurations_template_id_design_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."design_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_components" ADD CONSTRAINT "module_components_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_components" ADD CONSTRAINT "module_components_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_widths" ADD CONSTRAINT "module_widths_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_accessories" ADD CONSTRAINT "product_accessories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_accessories" ADD CONSTRAINT "product_accessories_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_bays" ADD CONSTRAINT "template_bays_template_id_design_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."design_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_bays" ADD CONSTRAINT "template_bays_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "compatibility_rules_set_code_key" ON "compatibility_rules" USING btree ("rule_set_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "components_sku_key" ON "components" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "components_type_idx" ON "components" USING btree ("type","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "configurations_share_token_key" ON "configurations" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "configurations_owner_idx" ON "configurations" USING btree ("owner_session_hash","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "modules_code_key" ON "modules" USING btree ("code");--> statement-breakpoint
CREATE INDEX "modules_product_idx" ON "modules" USING btree ("product_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_sets_version_key" ON "rule_sets" USING btree ("version");--> statement-breakpoint
ALTER TABLE "design_templates" DROP COLUMN "preview_layout";--> statement-breakpoint
ALTER TABLE "design_templates" ADD CONSTRAINT "design_templates_bay_range" CHECK ("design_templates"."min_bays" >= 1 AND "design_templates"."min_bays" <= "design_templates"."max_bays");