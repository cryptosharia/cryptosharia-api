DROP TABLE "auth_tokens" CASCADE;--> statement-breakpoint
DROP TABLE "refresh_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "hashed_password";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hashing_algorithm";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "two_factor_secret";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_email_verified";--> statement-breakpoint
DROP TYPE "public"."auth_token_type";--> statement-breakpoint
DROP TYPE "public"."hashing_algorithm";