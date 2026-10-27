import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const posts = pgTable(
  "posts",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    // A post is dated and listed on the blog. A page stands on its own at /<slug>,
    // like /about, and has no date or tags (src/lib/post-kind.ts).
    kind: text({ enum: ["post", "page"] }).notNull().default("post"),
    slug: text().notNull(),
    title: text().notNull(),
    body: text().notNull().default(""),
    // Written by the author. Empty means post lists use the start of the body instead.
    excerpt: text().notNull().default(""),
    // null = draft; a past date = published; a future date = scheduled
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // The newest featured post leads the home page, in place of the newest post. Posts only.
    featured: boolean().notNull().default(false),
    featureImageId: integer("feature_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    featureImageAlt: text("feature_image_alt").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("posts_kind_check", sql`${t.kind} in ('post', 'page')`),
    // A post and a page can share a slug, since they're at /posts/<slug> and /<slug>.
    unique().on(t.kind, t.slug),
  ],
);

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

// Earlier versions of each post's content, for its history in the editor. A save
// keeps the version it replaces (src/lib/revisions.ts).
export const postRevisions = pgTable(
  "post_revisions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    title: text().notNull(),
    excerpt: text().notNull(),
    body: text().notNull(),
    featureImageId: integer("feature_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    featureImageAlt: text("feature_image_alt").notNull(),
    // When this version was saved.
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull(),
    // When a later save replaced it and kept it here.
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.postId, t.createdAt)],
);

// Which images each post uses, in its body or as its feature image, or in an
// earlier version in its history. Images that no post uses, other than the intro
// photo, get deleted (src/lib/media-usage.ts).
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

// The site's settings, in a single row. Until they're first saved, the site uses
// the defaults in src/lib/site.ts.
export const siteSettings = pgTable(
  "site_settings",
  {
    id: integer().primaryKey().default(1),
    title: text().notNull(),
    description: text().notNull(),
    // The links in the site's header, in order.
    navigation: jsonb().$type<{ label: string; url: string }[]>().notNull(),
    // The intro at the top of the home page. Empty fields are left out of it.
    introPhotoId: integer("intro_photo_id").references(() => media.id, { onDelete: "set null" }),
    introHeading: text("intro_heading").notNull().default(""),
    // Markdown.
    introText: text("intro_text").notNull().default(""),
    // A button under the text, shown when both are set.
    introButtonLabel: text("intro_button_label").notNull().default(""),
    introButtonUrl: text("intro_button_url").notNull().default(""),
  },
  (t) => [check("site_settings_single_row", sql`${t.id} = 1`)],
);
