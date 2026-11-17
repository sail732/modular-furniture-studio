CREATE TYPE "public"."assembly_difficulty" AS ENUM('easy', 'moderate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"code" varchar(60) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"base_price_cents" integer NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"default_width_um" integer NOT NULL,
	"default_height_um" integer NOT NULL,
	"default_depth_um" integer NOT NULL,
	"min_width_um" integer NOT NULL,
	"max_width_um" integer NOT NULL,
	"width_increment_um" integer NOT NULL,
	"preview_layout" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "design_templates_price_non_negative" CHECK ("design_templates"."base_price_cents" >= 0),
	CONSTRAINT "design_templates_width_range" CHECK ("design_templates"."min_width_um" > 0 AND "design_templates"."min_width_um" <= "design_templates"."default_width_um" AND "design_templates"."default_width_um" <= "design_templates"."max_width_um"),
	CONSTRAINT "design_templates_dimensions_positive" CHECK ("design_templates"."default_height_um" > 0 AND "design_templates"."default_depth_um" > 0 AND "design_templates"."width_increment_um" > 0)
);
--> statement-breakpoint
CREATE TABLE "finishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(120) NOT NULL,
	"swatch_hex" char(7) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finishes_swatch_hex_format" CHECK ("finishes"."swatch_hex" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_finishes" (
	"product_id" uuid NOT NULL,
	"finish_id" uuid NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_finishes_product_id_finish_id_pk" PRIMARY KEY("product_id","finish_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"short_description" varchar(280) NOT NULL,
	"long_description" text DEFAULT '' NOT NULL,
	"key_features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"whats_included" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"what_can_change" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assembly_difficulty" "assembly_difficulty",
	"assembly_minutes" integer,
	"lead_time_note" varchar(200),
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_rank" integer DEFAULT 0 NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_assembly_minutes_positive" CHECK ("products"."assembly_minutes" IS NULL OR "products"."assembly_minutes" > 0)
);
--> statement-breakpoint
ALTER TABLE "design_templates" ADD CONSTRAINT "design_templates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finishes" ADD CONSTRAINT "finishes_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_finishes" ADD CONSTRAINT "product_finishes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_finishes" ADD CONSTRAINT "product_finishes_finish_id_finishes_id_fk" FOREIGN KEY ("finish_id") REFERENCES "public"."finishes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_key" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "design_templates_code_key" ON "design_templates" USING btree ("code");--> statement-breakpoint
CREATE INDEX "design_templates_product_idx" ON "design_templates" USING btree ("product_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "finishes_code_key" ON "finishes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "finishes_material_idx" ON "finishes" USING btree ("material_id");--> statement-breakpoint
CREATE UNIQUE INDEX "materials_code_key" ON "materials" USING btree ("code");--> statement-breakpoint
CREATE INDEX "product_finishes_finish_idx" ON "product_finishes" USING btree ("finish_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_key" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_category_status_idx" ON "products" USING btree ("category_id","status");