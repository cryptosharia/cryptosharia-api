ALTER TYPE "public"."tag_content_section" RENAME TO "tag_section";--> statement-breakpoint
ALTER TABLE "tags" RENAME COLUMN "content_section" TO "section";--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."asset_provider";--> statement-breakpoint
CREATE TYPE "public"."asset_provider" AS ENUM('vercel_blob');--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "provider" SET DATA TYPE "public"."asset_provider" USING "provider"::"public"."asset_provider";--> statement-breakpoint
ALTER TABLE "cryptoasset_tags" DROP COLUMN "display_order";--> statement-breakpoint
ALTER TABLE "cryptoassets" DROP COLUMN "rank";--> statement-breakpoint
ALTER TABLE "post_tags" DROP COLUMN "display_order";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN "show_in_navigation";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN "display_order";