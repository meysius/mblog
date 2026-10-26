import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  body: text().notNull().default(""),
  // Written by the author. Empty means post lists use the start of the body instead.
  excerpt: text().notNull().default(""),
  // null = draft; a past date = published; a future date = scheduled
  publishedAt: timestamp("published_at", { withTimezone: true }),
  featureImageId: integer("feature_image_id").references(() => media.id, {
    onDelete: "set null",
  }),
  featureImageAlt: text("feature_image_alt").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Stored lowercased, so lookups can compare directly.
  email: text().notNull().unique(),
  name: text().notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  // SHA-256 of the cookie token, so a leaked table can't be replayed as live sessions.
  id: text().primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Uploaded images. The files themselves are in media storage (src/lib/media-storage/).
export const media = pgTable("media", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  // Also the image's URL: /media/<filename>.
  filename: text().notNull().unique(),
  width: integer().notNull(),
  height: integer().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Which images each post uses, in its body or as its feature image. Images that
// no post uses get deleted (src/lib/media-usage.ts).
export const postMedia = pgTable(
  "post_media",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    mediaId: integer("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.mediaId] }), index().on(t.mediaId)],
);

export const tags = pgTable(
  "tags",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    // The tag's page: /tags/<slug>.
    slug: text().notNull().unique(),
    description: text().notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // "Postgres" and "postgres" are the same tag.
  (t) => [uniqueIndex("tags_name_unique").on(sql`lower(${t.name})`)],
);

// Which tags each post has, in the order the author gave them.
export const postTags = pgTable(
  "post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    position: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index().on(t.tagId)],
);

// Recent failed sign-ins per visitor address and per email (src/lib/login-limits.ts).
export const loginLimits = pgTable("login_limits", {
  // "address:<ip>" or "email:<email>"
  key: text().primaryKey(),
  failures: integer().notNull(),
  // When the count starts over.
  resetsAt: timestamp("resets_at", { withTimezone: true }).notNull(),
});
