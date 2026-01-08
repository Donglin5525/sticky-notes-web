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
} from "./db";

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
  }),
});

export type AppRouter = typeof appRouter;
