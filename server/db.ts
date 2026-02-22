import { eq, and, desc, asc, gte, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, notes, InsertNote, Note,
  dailyTasks, InsertDailyTask, DailyTask, TaskQuadrant,
  dailySummaries, InsertDailySummary, DailySummary,
  promptTemplates, InsertPromptTemplate, PromptTemplate
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== Notes CRUD ====================

/** Get all notes for a user (excluding deleted) */
export async function getUserNotes(userId: number, includeDeleted = false) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get notes: database not available");
    return [];
  }

  const conditions = includeDeleted
    ? eq(notes.userId, userId)
    : and(eq(notes.userId, userId), eq(notes.isDeleted, false));

  const result = await db
    .select()
    .from(notes)
    .where(conditions)
    .orderBy(desc(notes.updatedAt));

  return result;
}

/** Get deleted notes for a user (trash) */
export async function getDeletedNotes(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get deleted notes: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.isDeleted, true)))
    .orderBy(desc(notes.updatedAt));

  return result;
}

/** Get a single note by ID */
export async function getNoteById(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get note: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/** Create a new note */
export async function createNote(data: {
  userId: number;
  title?: string;
  content?: string;
  color?: InsertNote["color"];
  isImportant?: boolean;
  isUrgent?: boolean;
  tags?: string[];
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot create note: database not available");
  }

  const now = Date.now();
  const insertData: InsertNote = {
    userId: data.userId,
    title: data.title || "",
    content: data.content || "",
    color: data.color || "yellow",
    isImportant: data.isImportant || false,
    isUrgent: data.isUrgent || false,
    isDeleted: false,
    tags: data.tags ? JSON.stringify(data.tags) : null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.insert(notes).values(insertData);
  const insertId = result[0].insertId;

  return getNoteById(insertId, data.userId);
}

/** Update an existing note */
export async function updateNote(
  noteId: number,
  userId: number,
  updates: {
    title?: string;
    content?: string;
    color?: InsertNote["color"];
    isImportant?: boolean;
    isUrgent?: boolean;
    isDeleted?: boolean;
    tags?: string[];
    sortOrder?: number;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot update note: database not available");
  }

  const updateData: Partial<InsertNote> = {
    updatedAt: Date.now(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.isImportant !== undefined) updateData.isImportant = updates.isImportant;
  if (updates.isUrgent !== undefined) updateData.isUrgent = updates.isUrgent;
  if (updates.isDeleted !== undefined) updateData.isDeleted = updates.isDeleted;
  if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
  if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;

  await db
    .update(notes)
    .set(updateData)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));

  return getNoteById(noteId, userId);
}

/** Soft delete a note (move to trash) */
export async function softDeleteNote(noteId: number, userId: number) {
  return updateNote(noteId, userId, { isDeleted: true });
}

/** Restore a note from trash */
export async function restoreNote(noteId: number, userId: number) {
  return updateNote(noteId, userId, { isDeleted: false });
}

/** Permanently delete a note */
export async function permanentlyDeleteNote(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot delete note: database not available");
  }

  await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  return true;
}

/** Empty trash (permanently delete all deleted notes for a user) */
export async function emptyTrash(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot empty trash: database not available");
  }

  await db.delete(notes).where(and(eq(notes.userId, userId), eq(notes.isDeleted, true)));
  return true;
}

/** Rename a tag across all notes for a user */
export async function renameTag(userId: number, oldTag: string, newTag: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot rename tag: database not available");
  }

  // Get all notes with the old tag
  const userNotes = await getUserNotes(userId);
  const notesToUpdate = userNotes.filter(note => {
    const tags = note.tags ? JSON.parse(note.tags) : [];
    return tags.some((t: string) => t === oldTag || t.startsWith(oldTag + "/"));
  });

  // Update each note
  for (const note of notesToUpdate) {
    const tags = note.tags ? JSON.parse(note.tags) : [];
    const updatedTags = tags.map((t: string) => {
      if (t === oldTag) return newTag;
      if (t.startsWith(oldTag + "/")) return newTag + t.slice(oldTag.length);
      return t;
    });
    await updateNote(note.id, userId, { tags: updatedTags });
  }

  return { updatedCount: notesToUpdate.length };
}

/** Delete a tag from all notes for a user */
export async function deleteTag(userId: number, tagToDelete: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot delete tag: database not available");
  }

  // Get all notes with the tag
  const userNotes = await getUserNotes(userId);
  const notesToUpdate = userNotes.filter(note => {
    const tags = note.tags ? JSON.parse(note.tags) : [];
    return tags.some((t: string) => t === tagToDelete || t.startsWith(tagToDelete + "/"));
  });

  // Update each note
  for (const note of notesToUpdate) {
    const tags = note.tags ? JSON.parse(note.tags) : [];
    const updatedTags = tags.filter((t: string) => t !== tagToDelete && !t.startsWith(tagToDelete + "/"));
    await updateNote(note.id, userId, { tags: updatedTags });
  }

  return { updatedCount: notesToUpdate.length };
}

/** Move a tag under another parent tag */
export async function moveTag(userId: number, tagToMove: string, newParent: string | null) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot move tag: database not available");
  }

  // Calculate the new tag path
  const tagName = tagToMove.split("/").pop() || tagToMove;
  const newTag = newParent ? `${newParent}/${tagName}` : tagName;

  // Use rename function to do the actual work
  return renameTag(userId, tagToMove, newTag);
}

// ==================== Daily Tasks CRUD ====================

/** Get tasks for a specific date */
export async function getTasksByDate(userId: number, date: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get tasks: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(dailyTasks)
    .where(and(eq(dailyTasks.userId, userId), eq(dailyTasks.taskDate, date)))
    .orderBy(asc(dailyTasks.sortOrder), desc(dailyTasks.createdAt));

  return result;
}

/** Get incomplete tasks from previous days (for carry-over prompt) */
export async function getIncompletePreviousTasks(userId: number, beforeDate: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get incomplete tasks: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(dailyTasks)
    .where(
      and(
        eq(dailyTasks.userId, userId),
        eq(dailyTasks.isCompleted, false),
        lt(dailyTasks.taskDate, beforeDate)
      )
    )
    .orderBy(desc(dailyTasks.taskDate));

  return result;
}

/** Create a new task */
export async function createTask(data: {
  userId: number;
  title: string;
  quadrant: TaskQuadrant;
  taskDate: string;
  notes?: string;
  isCarriedOver?: boolean;
  originalDate?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot create task: database not available");
  }

  const now = Date.now();
  const insertData: InsertDailyTask = {
    userId: data.userId,
    title: data.title,
    quadrant: data.quadrant,
    taskDate: data.taskDate,
    notes: data.notes || null,
    isCompleted: false,
    isCarriedOver: data.isCarriedOver || false,
    originalDate: data.originalDate || null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.insert(dailyTasks).values(insertData);
  const insertId = result[0].insertId;

  const newTask = await db
    .select()
    .from(dailyTasks)
    .where(eq(dailyTasks.id, insertId))
    .limit(1);

  return newTask[0];
}

/** Update a task */
export async function updateTask(
  taskId: number,
  userId: number,
  updates: {
    title?: string;
    quadrant?: TaskQuadrant;
    isCompleted?: boolean;
    notes?: string;
    sortOrder?: number;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot update task: database not available");
  }

  const updateData: Partial<InsertDailyTask> = {
    updatedAt: Date.now(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.quadrant !== undefined) updateData.quadrant = updates.quadrant;
  if (updates.isCompleted !== undefined) updateData.isCompleted = updates.isCompleted;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;

  await db
    .update(dailyTasks)
    .set(updateData)
    .where(and(eq(dailyTasks.id, taskId), eq(dailyTasks.userId, userId)));

  const updated = await db
    .select()
    .from(dailyTasks)
    .where(eq(dailyTasks.id, taskId))
    .limit(1);

  return updated[0];
}

/** Batch update multiple tasks */
export async function batchUpdateTasks(
  userId: number,
  updates: Array<{
    id: number;
    title?: string;
    quadrant?: TaskQuadrant;
    isCompleted?: boolean;
    notes?: string;
    sortOrder?: number;
  }>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot batch update tasks: database not available");
  }

  const now = Date.now();
  const results: DailyTask[] = [];

  for (const update of updates) {
    const { id, ...updateFields } = update;
    const updateData: Partial<InsertDailyTask> = {
      updatedAt: now,
    };

    if (updateFields.title !== undefined) updateData.title = updateFields.title;
    if (updateFields.quadrant !== undefined) updateData.quadrant = updateFields.quadrant;
    if (updateFields.isCompleted !== undefined) updateData.isCompleted = updateFields.isCompleted;
    if (updateFields.notes !== undefined) updateData.notes = updateFields.notes;
    if (updateFields.sortOrder !== undefined) updateData.sortOrder = updateFields.sortOrder;

    await db
      .update(dailyTasks)
      .set(updateData)
      .where(and(eq(dailyTasks.id, id), eq(dailyTasks.userId, userId)));

    const updated = await db
      .select()
      .from(dailyTasks)
      .where(eq(dailyTasks.id, id))
      .limit(1);

    if (updated[0]) {
      results.push(updated[0]);
    }
  }

  return results;
}

/** Delete a task */
export async function deleteTask(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot delete task: database not available");
  }

  await db.delete(dailyTasks).where(and(eq(dailyTasks.id, taskId), eq(dailyTasks.userId, userId)));
  return true;
}

/** Carry over incomplete tasks to a new date */
export async function carryOverTasks(userId: number, taskIds: number[], newDate: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot carry over tasks: database not available");
  }

  const now = Date.now();
  const results: DailyTask[] = [];

  for (const taskId of taskIds) {
    // Get original task
    const original = await db
      .select()
      .from(dailyTasks)
      .where(and(eq(dailyTasks.id, taskId), eq(dailyTasks.userId, userId)))
      .limit(1);

    if (original.length === 0) continue;

    const task = original[0];

    // Create new task for the new date
    const newTask = await createTask({
      userId,
      title: task.title,
      quadrant: task.quadrant as TaskQuadrant,
      taskDate: newDate,
      notes: task.notes || undefined,
      isCarriedOver: true,
      originalDate: task.originalDate || task.taskDate,
    });

    // Mark original task as completed (carried over)
    await db
      .update(dailyTasks)
      .set({ isCompleted: true, updatedAt: now })
      .where(eq(dailyTasks.id, taskId));

    results.push(newTask);
  }

  return results;
}

// ==================== Daily Summaries CRUD ====================

/** Get summary for a specific date */
export async function getSummaryByDate(userId: number, date: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get summary: database not available");
    return null;
  }

  const result = await db
    .select()
    .from(dailySummaries)
    .where(and(eq(dailySummaries.userId, userId), eq(dailySummaries.summaryDate, date)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/** Create or update summary for a date */
export async function upsertSummary(data: {
  userId: number;
  summaryDate: string;
  reflection?: string;
  tomorrowPlan?: string;
  aiAnalysis?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot upsert summary: database not available");
  }

  const now = Date.now();
  const existing = await getSummaryByDate(data.userId, data.summaryDate);

  if (existing) {
    // Update existing
    const updateData: Partial<InsertDailySummary> = {
      updatedAt: now,
    };
    if (data.reflection !== undefined) updateData.reflection = data.reflection;
    if (data.tomorrowPlan !== undefined) updateData.tomorrowPlan = data.tomorrowPlan;
    if (data.aiAnalysis !== undefined) updateData.aiAnalysis = data.aiAnalysis;

    await db
      .update(dailySummaries)
      .set(updateData)
      .where(eq(dailySummaries.id, existing.id));

    return getSummaryByDate(data.userId, data.summaryDate);
  } else {
    // Create new
    const insertData: InsertDailySummary = {
      userId: data.userId,
      summaryDate: data.summaryDate,
      reflection: data.reflection || null,
      tomorrowPlan: data.tomorrowPlan || null,
      aiAnalysis: data.aiAnalysis || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(dailySummaries).values(insertData);
    return getSummaryByDate(data.userId, data.summaryDate);
  }
}

/** Get summaries for a date range (for history view) */
export async function getSummariesInRange(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get summaries: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(dailySummaries)
    .where(
      and(
        eq(dailySummaries.userId, userId),
        gte(dailySummaries.summaryDate, startDate),
        lt(dailySummaries.summaryDate, endDate)
      )
    )
    .orderBy(desc(dailySummaries.summaryDate));

  return result;
}

/** Get task statistics for a date range */
export async function getTaskStats(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get task stats: database not available");
    return { total: 0, completed: 0, byQuadrant: {} };
  }

  const tasks = await db
    .select()
    .from(dailyTasks)
    .where(
      and(
        eq(dailyTasks.userId, userId),
        gte(dailyTasks.taskDate, startDate),
        lt(dailyTasks.taskDate, endDate)
      )
    );

  const total = tasks.length;
  const completed = tasks.filter(t => t.isCompleted).length;
  const byQuadrant: Record<string, { total: number; completed: number }> = {};

  for (const task of tasks) {
    if (!byQuadrant[task.quadrant]) {
      byQuadrant[task.quadrant] = { total: 0, completed: 0 };
    }
    byQuadrant[task.quadrant].total++;
    if (task.isCompleted) {
      byQuadrant[task.quadrant].completed++;
    }
  }

  return { total, completed, byQuadrant };
}

// ==================== Prompt Templates CRUD ====================

/** Get all prompt templates for a user */
export async function getPromptTemplates(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get prompt templates: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.userId, userId))
    .orderBy(desc(promptTemplates.isDefault), desc(promptTemplates.updatedAt));

  return result;
}

/** Create a new prompt template */
export async function createPromptTemplate(data: {
  userId: number;
  name: string;
  description?: string;
  promptContent: string;
  isDefault?: boolean;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot create prompt template: database not available");
  }

  const now = Date.now();

  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await db
      .update(promptTemplates)
      .set({ isDefault: false, updatedAt: now })
      .where(and(eq(promptTemplates.userId, data.userId), eq(promptTemplates.isDefault, true)));
  }

  const insertData: InsertPromptTemplate = {
    userId: data.userId,
    name: data.name,
    description: data.description || null,
    promptContent: data.promptContent,
    isDefault: data.isDefault || false,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.insert(promptTemplates).values(insertData);
  const insertId = result[0].insertId;

  const newTemplate = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.id, insertId))
    .limit(1);

  return newTemplate[0];
}

/** Update a prompt template */
export async function updatePromptTemplate(
  templateId: number,
  userId: number,
  updates: {
    name?: string;
    description?: string;
    promptContent?: string;
    isDefault?: boolean;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot update prompt template: database not available");
  }

  const now = Date.now();

  // If setting as default, unset other defaults
  if (updates.isDefault) {
    await db
      .update(promptTemplates)
      .set({ isDefault: false, updatedAt: now })
      .where(
        and(
          eq(promptTemplates.userId, userId),
          eq(promptTemplates.isDefault, true)
        )
      );
  }

  const updateData: Partial<InsertPromptTemplate> = {
    updatedAt: now,
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.promptContent !== undefined) updateData.promptContent = updates.promptContent;
  if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;

  await db
    .update(promptTemplates)
    .set(updateData)
    .where(and(eq(promptTemplates.id, templateId), eq(promptTemplates.userId, userId)));

  const updated = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.id, templateId))
    .limit(1);

  return updated[0];
}

/** Delete a prompt template */
export async function deletePromptTemplate(templateId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot delete prompt template: database not available");
  }

  await db
    .delete(promptTemplates)
    .where(and(eq(promptTemplates.id, templateId), eq(promptTemplates.userId, userId)));

  return true;
}

/** Get default prompt template for a user */
export async function getDefaultPromptTemplate(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get default prompt template: database not available");
    return null;
  }

  const result = await db
    .select()
    .from(promptTemplates)
    .where(and(eq(promptTemplates.userId, userId), eq(promptTemplates.isDefault, true)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ==================== Habit Tracker CRUD ====================

import { habits, habitRecords, InsertHabit, Habit, InsertHabitRecord, HabitRecord } from "../drizzle/schema";

/** Get all active habits for a user (not archived, not deleted) */
export async function getUserHabits(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.isArchived, false), eq(habits.isDeleted, false)))
    .orderBy(asc(habits.sortOrder), desc(habits.createdAt));
}

/** Get archived habits for a user */
export async function getArchivedHabits(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.isArchived, true), eq(habits.isDeleted, false)))
    .orderBy(desc(habits.createdAt));
}

/** Get a single habit by ID */
export async function getHabitById(habitId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/** Create a new habit */
export async function createHabit(data: { userId: number; name: string; type: "count" | "value" }) {
  const db = await getDb();
  if (!db) throw new Error("[Database] Cannot create habit: database not available");

  // Get max sort order
  const existing = await getUserHabits(data.userId);
  const maxSort = existing.length > 0 ? Math.max(...existing.map(h => h.sortOrder)) : -1;

  const now = Date.now();
  const result = await db.insert(habits).values({
    userId: data.userId,
    name: data.name,
    type: data.type,
    sortOrder: maxSort + 1,
    isArchived: false,
    isDeleted: false,
    createdAt: now,
  });

  return getHabitById(result[0].insertId, data.userId);
}

/** Update a habit */
export async function updateHabit(habitId: number, userId: number, updates: { name?: string; type?: "count" | "value" }) {
  const db = await getDb();
  if (!db) throw new Error("[Database] Cannot update habit: database not available");

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.type !== undefined) updateData.type = updates.type;

  if (Object.keys(updateData).length > 0) {
    await db.update(habits).set(updateData).where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  }

  return getHabitById(habitId, userId);
}

/** Archive a habit */
export async function archiveHabit(habitId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("[Database] Cannot archive habit: database not available");

  await db.update(habits).set({ isArchived: true }).where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  return getHabitById(habitId, userId);
}

/** Restore a habit from archive */
export async function restoreHabit(habitId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("[Database] Cannot restore habit: database not available");

  await db.update(habits).set({ isArchived: false }).where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  return getHabitById(habitId, userId);
}

/** Soft delete a habit */
export async function softDeleteHabit(habitId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("[Database] Cannot delete habit: database not available");

  await db.update(habits).set({ isDeleted: true }).where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  return true;
}

/** Permanently delete a habit and all its records */
export async function permanentlyDeleteHabit(habitId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("[Database] Cannot delete habit: database not available");

  // Verify ownership
  const habit = await getHabitById(habitId, userId);
  if (!habit) throw new Error("Habit not found");

  // Delete all records first
  await db.delete(habitRecords).where(eq(habitRecords.habitId, habitId));
  // Then delete the habit
  await db.delete(habits).where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
  return true;
}

/** Update habit sort orders (for drag-and-drop) */
export async function updateHabitSortOrders(userId: number, orders: { id: number; sortOrder: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("[Database] Cannot update sort orders: database not available");

  for (const order of orders) {
    await db
      .update(habits)
      .set({ sortOrder: order.sortOrder })
      .where(and(eq(habits.id, order.id), eq(habits.userId, userId)));
  }
  return true;
}

// ==================== Habit Records CRUD ====================

/** Add a quick +1 record for a count-type habit */
export async function addQuickRecord(habitId: number) {
  const db = await getDb();
  if (!db) throw new Error("[Database] Cannot add record: database not available");

  const now = Date.now();
  const result = await db.insert(habitRecords).values({
    habitId,
    value: "1",
    note: null,
    timestamp: now,
    createdAt: now,
  });

  return getRecordById(result[0].insertId);
}

/** Add a detailed record */
export async function addDetailedRecord(data: {
  habitId: number;
  value: string;
  note?: string;
  timestamp: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("[Database] Cannot add record: database not available");

  const now = Date.now();
  const result = await db.insert(habitRecords).values({
    habitId: data.habitId,
    value: data.value,
    note: data.note || null,
    timestamp: data.timestamp,
    createdAt: now,
  });

  return getRecordById(result[0].insertId);
}

/** Get a single record by ID */
export async function getRecordById(recordId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(habitRecords)
    .where(eq(habitRecords.id, recordId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/** Get records for a habit within a time range */
export async function getHabitRecords(habitId: number, startTime: number, endTime: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(habitRecords)
    .where(
      and(
        eq(habitRecords.habitId, habitId),
        gte(habitRecords.timestamp, startTime),
        lt(habitRecords.timestamp, endTime)
      )
    )
    .orderBy(desc(habitRecords.timestamp));
}

/** Get the latest record for a habit */
export async function getLatestRecord(habitId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(habitRecords)
    .where(eq(habitRecords.habitId, habitId))
    .orderBy(desc(habitRecords.timestamp))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/** Get today's records count for a habit */
export async function getTodayRecordCount(habitId: number) {
  const db = await getDb();
  if (!db) return 0;

  // Calculate today's start in Beijing time (UTC+8)
  const now = new Date();
  const beijingOffset = 8 * 60;
  const localOffset = now.getTimezoneOffset();
  const beijingTime = new Date(now.getTime() + (beijingOffset + localOffset) * 60 * 1000);
  const todayStart = new Date(beijingTime.getFullYear(), beijingTime.getMonth(), beijingTime.getDate());
  const todayStartUtc = todayStart.getTime() - (beijingOffset + localOffset) * 60 * 1000;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(habitRecords)
    .where(
      and(
        eq(habitRecords.habitId, habitId),
        gte(habitRecords.timestamp, todayStartUtc)
      )
    );

  return result[0]?.count || 0;
}

/** Get today's total value sum for a habit */
export async function getTodayValueSum(habitId: number) {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  const beijingOffset = 8 * 60;
  const localOffset = now.getTimezoneOffset();
  const beijingTime = new Date(now.getTime() + (beijingOffset + localOffset) * 60 * 1000);
  const todayStart = new Date(beijingTime.getFullYear(), beijingTime.getMonth(), beijingTime.getDate());
  const todayStartUtc = todayStart.getTime() - (beijingOffset + localOffset) * 60 * 1000;

  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(value AS DECIMAL(10,2))), 0)` })
    .from(habitRecords)
    .where(
      and(
        eq(habitRecords.habitId, habitId),
        gte(habitRecords.timestamp, todayStartUtc)
      )
    );

  return parseFloat(result[0]?.total || "0");
}

/** Delete a specific record */
export async function deleteRecord(recordId: number) {
  const db = await getDb();
  if (!db) throw new Error("[Database] Cannot delete record: database not available");

  await db.delete(habitRecords).where(eq(habitRecords.id, recordId));
  return true;
}
