CREATE TABLE "login_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"failures" integer NOT NULL,
	"resets_at" timestamp with time zone NOT NULL
);
