CREATE TABLE "website_settings" (
	"key" varchar(50) PRIMARY KEY NOT NULL,
	"academy_promotion_enabled" boolean DEFAULT true NOT NULL,
	"academy_navbar_enabled" boolean DEFAULT true NOT NULL,
	"academy_homepage_section_enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "website_settings" ADD CONSTRAINT "website_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "website_settings" (
	"key",
	"academy_promotion_enabled",
	"academy_navbar_enabled",
	"academy_homepage_section_enabled",
	"version"
) VALUES ('academy_visibility', true, true, true, 1);
