ALTER TABLE "token_tags" RENAME TO "cryptoasset_tags";--> statement-breakpoint
ALTER TABLE "tokens" RENAME TO "cryptoassets";--> statement-breakpoint
ALTER TABLE "cryptoasset_tags" RENAME COLUMN "token_id" TO "cryptoasset_id";--> statement-breakpoint
ALTER TABLE "cryptoassets" DROP CONSTRAINT "tokens_slug_unique";--> statement-breakpoint
ALTER TABLE "cryptoassets" DROP CONSTRAINT "tokens_ticker_unique";--> statement-breakpoint
ALTER TABLE "cryptoasset_tags" DROP CONSTRAINT "token_tags_token_id_tokens_id_fk";
--> statement-breakpoint
ALTER TABLE "cryptoasset_tags" DROP CONSTRAINT "token_tags_tag_id_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "cryptoassets" DROP CONSTRAINT "tokens_logo_id_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "cryptoassets" DROP CONSTRAINT "tokens_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "cryptoassets" DROP CONSTRAINT "tokens_updated_by_users_id_fk";
--> statement-breakpoint
ALTER TYPE "public"."user_role" RENAME VALUE 'tokens_manager' TO 'cryptoassets_manager';--> statement-breakpoint
ALTER TABLE "cryptoasset_tags" DROP CONSTRAINT "token_tags_token_id_tag_id_pk";--> statement-breakpoint
ALTER TABLE "cryptoasset_tags" ADD CONSTRAINT "cryptoasset_tags_cryptoasset_id_tag_id_pk" PRIMARY KEY("cryptoasset_id","tag_id");--> statement-breakpoint
ALTER TABLE "cryptoasset_tags" ADD CONSTRAINT "cryptoasset_tags_cryptoasset_id_cryptoassets_id_fk" FOREIGN KEY ("cryptoasset_id") REFERENCES "public"."cryptoassets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cryptoasset_tags" ADD CONSTRAINT "cryptoasset_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cryptoassets" ADD CONSTRAINT "cryptoassets_logo_id_assets_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cryptoassets" ADD CONSTRAINT "cryptoassets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cryptoassets" ADD CONSTRAINT "cryptoassets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cryptoassets" ADD CONSTRAINT "cryptoassets_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "cryptoassets" ADD CONSTRAINT "cryptoassets_ticker_unique" UNIQUE("ticker");--> statement-breakpoint
UPDATE "activity_logs" SET "action" = 'cryptoasset.create' WHERE "action" = 'token.create';--> statement-breakpoint
UPDATE "activity_logs" SET "action" = 'cryptoasset.update' WHERE "action" = 'token.update';--> statement-breakpoint
UPDATE "activity_logs" SET "action" = 'cryptoasset.delete' WHERE "action" = 'token.delete';--> statement-breakpoint
UPDATE "activity_logs" SET "subject_type" = 'cryptoassets' WHERE "subject_type" = 'tokens';--> statement-breakpoint
