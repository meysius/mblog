ALTER TABLE "site_settings" ADD COLUMN "intro_photo_id" integer;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "intro_heading" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "intro_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "intro_button_label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "intro_button_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_intro_photo_id_media_id_fk" FOREIGN KEY ("intro_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;