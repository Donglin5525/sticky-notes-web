import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getUserNotes,
  getDeletedNotes,
  getNoteById,
  createNote,
  updateNote,
  softDeleteNote,
  restoreNote,
  permanentlyDeleteNote,
  emptyTrash,
  renameTag,
  deleteTag,
  moveTag,
} from "./db";
import { storagePut } from "./storage";

const noteColorSchema = z.enum(["yellow", "green", "blue", "pink", "purple", "orange"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  notes: router({
    /** Get all notes for the current user */
    list: protectedProcedure.query(async ({ ctx }) => {
      const notes = await getUserNotes(ctx.user.id);
      return notes.map(note => ({
        ...note,
        tags: note.tags ? JSON.parse(note.tags) : [],
      }));
    }),

    /** Get deleted notes (trash) */
    trash: protectedProcedure.query(async ({ ctx }) => {
      const notes = await getDeletedNotes(ctx.user.id);
      return notes.map(note => ({
        ...note,
        tags: note.tags ? JSON.parse(note.tags) : [],
      }));
    }),

    /** Get a single note by ID */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const note = await getNoteById(input.id, ctx.user.id);
        if (!note) return null;
        return {
          ...note,
          tags: note.tags ? JSON.parse(note.tags) : [],
        };
      }),

    /** Create a new note */
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().optional(),
          content: z.string().optional(),
          color: noteColorSchema.optional(),
          isImportant: z.boolean().optional(),
          isUrgent: z.boolean().optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const note = await createNote({
          userId: ctx.user.id,
          ...input,
        });
        if (!note) throw new Error("Failed to create note");
        return {
          ...note,
          tags: note.tags ? JSON.parse(note.tags) : [],
        };
      }),

    /** Update an existing note */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          content: z.string().optional(),
          color: noteColorSchema.optional(),
          isImportant: z.boolean().optional(),
          isUrgent: z.boolean().optional(),
          tags: z.array(z.string()).optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const note = await updateNote(id, ctx.user.id, updates);
        if (!note) throw new Error("Note not found");
        return {
          ...note,
          tags: note.tags ? JSON.parse(note.tags) : [],
        };
      }),

    /** Move note to trash */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await softDeleteNote(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Restore note from trash */
    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const note = await restoreNote(input.id, ctx.user.id);
        if (!note) throw new Error("Note not found");
        return {
          ...note,
          tags: note.tags ? JSON.parse(note.tags) : [],
        };
      }),

    /** Permanently delete a note */
    permanentDelete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await permanentlyDeleteNote(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Empty trash */
    emptyTrash: protectedProcedure.mutation(async ({ ctx }) => {
      await emptyTrash(ctx.user.id);
      return { success: true };
    }),

    /** Upload image for note */
    uploadImage: protectedProcedure
      .input(
        z.object({
          base64: z.string(),
          filename: z.string(),
          contentType: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { base64, filename, contentType } = input;
        
        // Decode base64 to buffer
        const buffer = Buffer.from(base64, "base64");
        
        // Generate unique filename
        const timestamp = Date.now();
        const ext = filename.split(".").pop() || "png";
        const uniqueFilename = `notes/${ctx.user.id}/${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        
        // Upload to S3
        const { url } = await storagePut(uniqueFilename, buffer, contentType);
        
        return { url };
      }),
  }),

  tags: router({
    /** Rename a tag across all notes */
    rename: protectedProcedure
      .input(
        z.object({
          oldTag: z.string(),
          newTag: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await renameTag(ctx.user.id, input.oldTag, input.newTag);
        return result;
      }),

    /** Delete a tag from all notes */
    delete: protectedProcedure
      .input(z.object({ tag: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await deleteTag(ctx.user.id, input.tag);
        return result;
      }),

    /** Move a tag under another parent */
    move: protectedProcedure
      .input(
        z.object({
          tag: z.string(),
          newParent: z.string().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await moveTag(ctx.user.id, input.tag, input.newParent);
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
