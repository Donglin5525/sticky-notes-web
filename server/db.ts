import { eq, and, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, notes, InsertNote, Note } from "../drizzle/schema";
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
