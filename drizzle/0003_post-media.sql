CREATE TABLE "post_media" (
	"post_id" integer NOT NULL,
	"media_id" integer NOT NULL,
	CONSTRAINT "post_media_post_id_media_id_pk" PRIMARY KEY("post_id","media_id")
);
--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_media_media_id_index" ON "post_media" USING btree ("media_id");--> statement-breakpoint
-- Record the images existing posts already use, so they aren't treated as unused.
INSERT INTO "post_media" ("post_id", "media_id")
SELECT "posts"."id", "media"."id"
FROM "posts"
JOIN "media" ON "posts"."feature_image_id" = "media"."id"
  OR strpos("posts"."body", '/media/' || "media"."filename") > 0
ON CONFLICT DO NOTHING;
