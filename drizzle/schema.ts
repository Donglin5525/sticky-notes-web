import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Notes table for sticky notes with Eisenhower Matrix priority support
 */
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users table */
  userId: int("userId").notNull(),
  /** Note title */
  title: varchar("title", { length: 255 }).default("").notNull(),
  /** Note content (plain text or HTML) */
  content: text("content"),
  /** Note color theme */
  color: mysqlEnum("color", ["yellow", "green", "blue", "pink", "purple", "orange"]).default("yellow").notNull(),
  /** Eisenhower Matrix: Is this task important? */
  isImportant: boolean("isImportant").default(false).notNull(),
  /** Eisenhower Matrix: Is this task urgent? */
  isUrgent: boolean("isUrgent").default(false).notNull(),
  /** Soft delete flag */
  isDeleted: boolean("isDeleted").default(false).notNull(),
  /** Tags stored as JSON array string */
  tags: text("tags"),
  /** Sort order within quadrant */
  sortOrder: int("sortOrder").default(0).notNull(),
  /** Created timestamp (Unix ms) */
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  /** Updated timestamp (Unix ms) */
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

/** Note color type */
export type NoteColor = "yellow" | "green" | "blue" | "pink" | "purple" | "orange";

/** Quadrant type for Eisenhower Matrix */
export type Quadrant = "do-first" | "schedule" | "delegate" | "eliminate";
