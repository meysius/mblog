CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"navigation" jsonb NOT NULL,
	CONSTRAINT "site_settings_single_row" CHECK ("site_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_slug_unique";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "kind" text DEFAULT 'post' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_kind_slug_unique" UNIQUE("kind","slug");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_kind_check" CHECK ("posts"."kind" in ('post', 'page'));