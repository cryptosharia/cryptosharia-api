CREATE TYPE "public"."tag_content_section" AS ENUM('news', 'education');--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "content_section" "tag_content_section";--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "show_in_navigation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "display_order" integer;