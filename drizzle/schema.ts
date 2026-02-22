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

// ==================== Daily Todo Module ====================

/**
 * Task quadrant types for daily todo
 * - priority: 优先事项（重要且紧急）
 * - strategic: 战略项目（重要不紧急）
 * - trivial: 琐碎事务（紧急不重要）
 * - trap: 陷阱区域（不重要不紧急）
 */
export type TaskQuadrant = "priority" | "strategic" | "trivial" | "trap";

/**
 * Daily tasks table - stores individual tasks for each day
 */
export const dailyTasks = mysqlTable("daily_tasks", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users table */
  userId: int("userId").notNull(),
  /** Task title/content */
  title: varchar("title", { length: 500 }).notNull(),
  /** Task quadrant */
  quadrant: mysqlEnum("quadrant", ["priority", "strategic", "trivial", "trap"]).notNull(),
  /** Is task completed */
  isCompleted: boolean("isCompleted").default(false).notNull(),
  /** Optional notes/description */
  notes: text("notes"),
  /** The date this task belongs to (YYYY-MM-DD format stored as string) */
  taskDate: varchar("taskDate", { length: 10 }).notNull(),
  /** Was this task carried over from a previous day */
  isCarriedOver: boolean("isCarriedOver").default(false).notNull(),
  /** Original date if carried over */
  originalDate: varchar("originalDate", { length: 10 }),
  /** Sort order within quadrant */
  sortOrder: int("sortOrder").default(0).notNull(),
  /** Created timestamp (Unix ms) */
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  /** Updated timestamp (Unix ms) */
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type DailyTask = typeof dailyTasks.$inferSelect;
export type InsertDailyTask = typeof dailyTasks.$inferInsert;

/**
 * Daily summaries table - stores daily reflections and plans
 */
export const dailySummaries = mysqlTable("daily_summaries", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users table */
  userId: int("userId").notNull(),
  /** The date this summary belongs to (YYYY-MM-DD format) */
  summaryDate: varchar("summaryDate", { length: 10 }).notNull(),
  /** Combined: Today's achievements and reflections */
  reflection: text("reflection"),
  /** Tomorrow's plan (line-separated tasks) */
  tomorrowPlan: text("tomorrowPlan"),
  /** AI-generated analysis result */
  aiAnalysis: text("aiAnalysis"),
  /** Created timestamp (Unix ms) */
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  /** Updated timestamp (Unix ms) */
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type DailySummary = typeof dailySummaries.$inferSelect;
export type InsertDailySummary = typeof dailySummaries.$inferInsert;

/**
 * Prompt templates table - stores user-defined prompts for AI analysis
 */
export const promptTemplates = mysqlTable("prompt_templates", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users table */
  userId: int("userId").notNull(),
  /** Template name */
  name: varchar("name", { length: 100 }).notNull(),
  /** Template description */
  description: varchar("description", { length: 500 }),
  /** The actual prompt content */
  promptContent: text("promptContent").notNull(),
  /** Is this the default template */
  isDefault: boolean("isDefault").default(false).notNull(),
  /** Created timestamp (Unix ms) */
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  /** Updated timestamp (Unix ms) */
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplates.$inferInsert;

// ==================== Habit Tracker Module ====================

/**
 * Habit type:
 * - count: 频次计数类 (如抽烟、喝水)
 * - value: 连续数值类 (如体重、血压)
 */
export type HabitType = "count" | "value";

/**
 * Habits table - stores user-defined habits
 */
export const habits = mysqlTable("habits", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users table */
  userId: int("userId").notNull(),
  /** Habit name (e.g., 抽烟、体重) */
  name: varchar("name", { length: 100 }).notNull(),
  /** Habit type: count (频次) or value (数值) */
  type: mysqlEnum("type", ["count", "value"]).notNull(),
  /** Sort order for drag-and-drop */
  sortOrder: int("sortOrder").default(0).notNull(),
  /** Whether this habit is archived */
  isArchived: boolean("isArchived").default(false).notNull(),
  /** Soft delete flag */
  isDeleted: boolean("isDeleted").default(false).notNull(),
  /** Created timestamp (Unix ms) */
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = typeof habits.$inferInsert;

/**
 * Habit records table - event stream of habit check-ins
 */
export const habitRecords = mysqlTable("habit_records", {
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to habits table */
  habitId: int("habitId").notNull(),
  /** Record value: 1 for count type, actual number for value type (e.g., 75.5) */
  value: text("value").notNull(),
  /** Optional note (e.g., 练胸背、心情烦躁) */
  note: text("note"),
  /** Timestamp when the record occurred (Unix ms) - allows backdating */
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  /** Created timestamp (Unix ms) */
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export type HabitRecord = typeof habitRecords.$inferSelect;
export type InsertHabitRecord = typeof habitRecords.$inferInsert;
