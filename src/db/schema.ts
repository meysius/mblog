import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  body: text().notNull().default(""),
  // null = draft; a past date = published; a future date = scheduled
  publishedAt: timestamp("published_at", { withTimezone: true }),
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
