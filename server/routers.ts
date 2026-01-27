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
  // Daily Todo functions
  getTasksByDate,
  getIncompletePreviousTasks,
  createTask,
  updateTask,
  deleteTask,
  carryOverTasks,
  getSummaryByDate,
  upsertSummary,
  getSummariesInRange,
  getTaskStats,
  getPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  getDefaultPromptTemplate,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { TaskQuadrant } from "../drizzle/schema";
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

  // ==================== Daily Todo Module ====================
  
  dailyTasks: router({
    /** Get tasks for a specific date */
    list: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        return getTasksByDate(ctx.user.id, input.date);
      }),

    /** Get incomplete tasks from previous days */
    incompletePrevious: protectedProcedure
      .input(z.object({ beforeDate: z.string() }))
      .query(async ({ ctx, input }) => {
        return getIncompletePreviousTasks(ctx.user.id, input.beforeDate);
      }),

    /** Create a new task */
    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          quadrant: z.enum(["priority", "strategic", "trivial", "trap"]),
          taskDate: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createTask({
          userId: ctx.user.id,
          ...input,
        });
      }),

    /** Update a task */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          quadrant: z.enum(["priority", "strategic", "trivial", "trap"]).optional(),
          isCompleted: z.boolean().optional(),
          notes: z.string().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        return updateTask(id, ctx.user.id, updates);
      }),

    /** Delete a task */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTask(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Carry over incomplete tasks to a new date */
    carryOver: protectedProcedure
      .input(
        z.object({
          taskIds: z.array(z.number()),
          newDate: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return carryOverTasks(ctx.user.id, input.taskIds, input.newDate);
      }),
  }),

  dailySummaries: router({
    /** Get summary for a specific date */
    get: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        return getSummaryByDate(ctx.user.id, input.date);
      }),

    /** Create or update summary */
    upsert: protectedProcedure
      .input(
        z.object({
          summaryDate: z.string(),
          reflection: z.string().optional(),
          tomorrowPlan: z.string().optional(),
          aiAnalysis: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return upsertSummary({
          userId: ctx.user.id,
          ...input,
        });
      }),

    /** Get summaries in a date range */
    listInRange: protectedProcedure
      .input(
        z.object({
          startDate: z.string(),
          endDate: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        return getSummariesInRange(ctx.user.id, input.startDate, input.endDate);
      }),

    /** Get task statistics for a date range */
    stats: protectedProcedure
      .input(
        z.object({
          startDate: z.string(),
          endDate: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        return getTaskStats(ctx.user.id, input.startDate, input.endDate);
      }),
  }),

  promptTemplates: router({
    /** Get all prompt templates */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getPromptTemplates(ctx.user.id);
    }),

    /** Get default template */
    getDefault: protectedProcedure.query(async ({ ctx }) => {
      return getDefaultPromptTemplate(ctx.user.id);
    }),

    /** Create a new template */
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          promptContent: z.string(),
          isDefault: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createPromptTemplate({
          userId: ctx.user.id,
          ...input,
        });
      }),

    /** Update a template */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          promptContent: z.string().optional(),
          isDefault: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        return updatePromptTemplate(id, ctx.user.id, updates);
      }),

    /** Delete a template */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deletePromptTemplate(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  ai: router({
    /** Generate AI analysis based on tasks and summary */
    analyze: protectedProcedure
      .input(
        z.object({
          date: z.string(),
          promptTemplateId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Get tasks for the date
        const tasks = await getTasksByDate(ctx.user.id, input.date);
        const summary = await getSummaryByDate(ctx.user.id, input.date);

        // Get prompt template
        let promptContent = "";
        if (input.promptTemplateId) {
          const templates = await getPromptTemplates(ctx.user.id);
          const template = templates.find(t => t.id === input.promptTemplateId);
          if (template) {
            promptContent = template.promptContent;
          }
        }

        if (!promptContent) {
          // Default prompt
          promptContent = `你是一位专业的时间管理顾问。请根据以下今日任务数据和总结内容，分析任务完成情况，并给出具体的改进建议。

任务数据:
{{tasks}}

今日总结:
{{summary}}

请从以下几个方面进行分析:
1. 任务完成率和时间分配
2. 四象限任务分布是否合理
3. 具体的改进建议`;
        }

        // Format tasks data
        const tasksData = tasks.map(t => ({
          title: t.title,
          quadrant: t.quadrant,
          completed: t.isCompleted,
        }));

        // Replace placeholders
        const finalPrompt = promptContent
          .replace("{{tasks}}", JSON.stringify(tasksData, null, 2))
          .replace("{{summary}}", summary?.reflection || "无总结内容")
          .replace("{{date}}", input.date);

        // Call LLM
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是一位专业的时间管理顾问，擅长分析工作效率和提供改进建议。请用中文回复。" },
            { role: "user", content: finalPrompt },
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        const aiAnalysis = typeof rawContent === 'string' ? rawContent : "分析失败";

        // Save AI analysis to summary
        await upsertSummary({
          userId: ctx.user.id,
          summaryDate: input.date,
          aiAnalysis,
        });

        return { analysis: aiAnalysis };
      }),

    /** Generate tomorrow's tasks from plan text */
    generateTomorrowTasks: protectedProcedure
      .input(
        z.object({
          planText: z.string(),
          tomorrowDate: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Use LLM to parse the plan text and assign quadrants
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `你是一位任务分配助手。用户会给你一段明日计划文本，每行是一个任务。
请将每个任务分配到四象限之一:
- priority: 优先事项（重要且紧急）
- strategic: 战略项目（重要不紧急）
- trivial: 琐碎事务（紧急不重要）
- trap: 陷阱区域（不重要不紧急）

请返回 JSON 数组格式，每个元素包含 title 和 quadrant 字段。`,
            },
            { role: "user", content: input.planText },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "tasks",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        quadrant: {
                          type: "string",
                          enum: ["priority", "strategic", "trivial", "trap"],
                        },
                      },
                      required: ["title", "quadrant"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent || typeof rawContent !== 'string') {
          throw new Error("解析失败");
        }

        const parsed = JSON.parse(rawContent) as { tasks: Array<{ title: string; quadrant: TaskQuadrant }> };
        
        // Create tasks
        const createdTasks = [];
        for (const task of parsed.tasks) {
          const created = await createTask({
            userId: ctx.user.id,
            title: task.title,
            quadrant: task.quadrant,
            taskDate: input.tomorrowDate,
          });
          createdTasks.push(created);
        }

        return { tasks: createdTasks };
      }),
  }),
});

export type AppRouter = typeof appRouter;
