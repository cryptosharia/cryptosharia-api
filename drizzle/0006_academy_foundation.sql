CREATE TYPE "public"."academy_content_kind" AS ENUM('subject', 'level', 'chapter', 'lesson');--> statement-breakpoint
CREATE TYPE "public"."academy_content_status" AS ENUM('draft', 'review', 'approved', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."academy_grant_state" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."academy_subject" AS ENUM('fundamental', 'technical', 'muamalah', 'web3');--> statement-breakpoint
CREATE TABLE "academy_completions" (
	"user_id" uuid NOT NULL,
	"lesson_id" varchar(100) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_completions_user_id_lesson_id_version_pk" PRIMARY KEY("user_id","lesson_id","version")
);
--> statement-breakpoint
CREATE TABLE "academy_content" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"kind" "academy_content_kind" NOT NULL,
	"parent_id" varchar(100) NOT NULL,
	"subject_id" "academy_subject" NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"chapter_number" integer DEFAULT 1 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"scope_id" varchar(50),
	"title" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"thumbnail" text DEFAULT '/favicon.png' NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"instructor" varchar(150) DEFAULT '' NOT NULL,
	"status" "academy_content_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"syariah_required" boolean DEFAULT false NOT NULL,
	"reviewed_by" uuid,
	"syariah_reviewed_by" uuid,
	"rights_confirmed" boolean DEFAULT false NOT NULL,
	"approved_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "academy_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"scope_id" varchar(50) NOT NULL,
	"state" "academy_grant_state" DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"source" varchar(50) DEFAULT 'manual' NOT NULL,
	"audit_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "academy_lesson_media" (
	"lesson_id" varchar(100) PRIMARY KEY NOT NULL,
	"video_id" varchar(32) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"reading_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"slide_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtitle_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attachment_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"internal_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "academy_progress" (
	"user_id" uuid NOT NULL,
	"lesson_id" varchar(100) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"position_seconds" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academy_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "academy_scopes" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "academy_completions" ADD CONSTRAINT "academy_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_completions" ADD CONSTRAINT "academy_completions_lesson_id_academy_content_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."academy_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_content" ADD CONSTRAINT "academy_content_scope_id_academy_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."academy_scopes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_content" ADD CONSTRAINT "academy_content_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_content" ADD CONSTRAINT "academy_content_syariah_reviewed_by_users_id_fk" FOREIGN KEY ("syariah_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_content" ADD CONSTRAINT "academy_content_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_content" ADD CONSTRAINT "academy_content_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_content" ADD CONSTRAINT "academy_content_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_grants" ADD CONSTRAINT "academy_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_grants" ADD CONSTRAINT "academy_grants_scope_id_academy_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."academy_scopes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_grants" ADD CONSTRAINT "academy_grants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_grants" ADD CONSTRAINT "academy_grants_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_lesson_media" ADD CONSTRAINT "academy_lesson_media_lesson_id_academy_content_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."academy_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_lesson_media" ADD CONSTRAINT "academy_lesson_media_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_lesson_media" ADD CONSTRAINT "academy_lesson_media_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_progress" ADD CONSTRAINT "academy_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_progress" ADD CONSTRAINT "academy_progress_lesson_id_academy_content_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."academy_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_scopes" ADD CONSTRAINT "academy_scopes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_scopes" ADD CONSTRAINT "academy_scopes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_academy_completions_user" ON "academy_completions" USING btree ("user_id","lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_academy_content_parent_order" ON "academy_content" USING btree ("parent_id","order");--> statement-breakpoint
CREATE INDEX "idx_academy_content_catalog" ON "academy_content" USING btree ("status","kind","scope_id");--> statement-breakpoint
CREATE INDEX "idx_academy_content_hierarchy" ON "academy_content" USING btree ("subject_id","level","chapter_number");--> statement-breakpoint
CREATE INDEX "idx_academy_grants_user_scope_state" ON "academy_grants" USING btree ("user_id","scope_id","state");--> statement-breakpoint
CREATE INDEX "idx_academy_grants_validity" ON "academy_grants" USING btree ("user_id","state","starts_at","expires_at");--> statement-breakpoint
CREATE INDEX "idx_academy_progress_user_updated" ON "academy_progress" USING btree ("user_id","updated_at");