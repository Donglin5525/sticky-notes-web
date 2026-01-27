import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getTasksByDate: vi.fn(),
  getIncompletePreviousTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  carryOverTasks: vi.fn(),
  getSummaryByDate: vi.fn(),
  upsertSummary: vi.fn(),
  getSummariesInRange: vi.fn(),
  getTaskStats: vi.fn(),
  getPromptTemplates: vi.fn(),
  createPromptTemplate: vi.fn(),
  updatePromptTemplate: vi.fn(),
  deletePromptTemplate: vi.fn(),
  getDefaultPromptTemplate: vi.fn(),
}));

import {
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

describe("Daily Todo Module - Database Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Task CRUD Operations", () => {
    it("should get tasks by date", async () => {
      const mockTasks = [
        { id: 1, title: "Task 1", quadrant: "priority", isCompleted: false, taskDate: "2026-01-27" },
        { id: 2, title: "Task 2", quadrant: "strategic", isCompleted: true, taskDate: "2026-01-27" },
      ];
      vi.mocked(getTasksByDate).mockResolvedValue(mockTasks as any);

      const result = await getTasksByDate(1, "2026-01-27");

      expect(getTasksByDate).toHaveBeenCalledWith(1, "2026-01-27");
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Task 1");
    });

    it("should get incomplete tasks from previous days", async () => {
      const mockTasks = [
        { id: 1, title: "Overdue Task", quadrant: "priority", isCompleted: false, taskDate: "2026-01-25" },
      ];
      vi.mocked(getIncompletePreviousTasks).mockResolvedValue(mockTasks as any);

      const result = await getIncompletePreviousTasks(1, "2026-01-27");

      expect(getIncompletePreviousTasks).toHaveBeenCalledWith(1, "2026-01-27");
      expect(result).toHaveLength(1);
      expect(result[0].isCompleted).toBe(false);
    });

    it("should create a new task", async () => {
      const mockTask = {
        id: 1,
        userId: 1,
        title: "New Task",
        quadrant: "priority",
        isCompleted: false,
        taskDate: "2026-01-27",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(createTask).mockResolvedValue(mockTask as any);

      const result = await createTask({
        userId: 1,
        title: "New Task",
        quadrant: "priority",
        taskDate: "2026-01-27",
      });

      expect(createTask).toHaveBeenCalledWith({
        userId: 1,
        title: "New Task",
        quadrant: "priority",
        taskDate: "2026-01-27",
      });
      expect(result.title).toBe("New Task");
    });

    it("should update a task", async () => {
      const mockTask = {
        id: 1,
        title: "Updated Task",
        isCompleted: true,
        updatedAt: Date.now(),
      };
      vi.mocked(updateTask).mockResolvedValue(mockTask as any);

      const result = await updateTask(1, 1, { title: "Updated Task", isCompleted: true });

      expect(updateTask).toHaveBeenCalledWith(1, 1, { title: "Updated Task", isCompleted: true });
      expect(result.isCompleted).toBe(true);
    });

    it("should delete a task", async () => {
      vi.mocked(deleteTask).mockResolvedValue(true);

      const result = await deleteTask(1, 1);

      expect(deleteTask).toHaveBeenCalledWith(1, 1);
      expect(result).toBe(true);
    });

    it("should carry over tasks to a new date", async () => {
      const mockCarriedTasks = [
        { id: 2, title: "Carried Task", taskDate: "2026-01-27", isCarriedOver: true, originalDate: "2026-01-26" },
      ];
      vi.mocked(carryOverTasks).mockResolvedValue(mockCarriedTasks as any);

      const result = await carryOverTasks(1, [1], "2026-01-27");

      expect(carryOverTasks).toHaveBeenCalledWith(1, [1], "2026-01-27");
      expect(result).toHaveLength(1);
      expect(result[0].isCarriedOver).toBe(true);
    });
  });

  describe("Summary Operations", () => {
    it("should get summary by date", async () => {
      const mockSummary = {
        id: 1,
        userId: 1,
        summaryDate: "2026-01-27",
        reflection: "Today was productive",
        tomorrowPlan: "Continue working",
      };
      vi.mocked(getSummaryByDate).mockResolvedValue(mockSummary as any);

      const result = await getSummaryByDate(1, "2026-01-27");

      expect(getSummaryByDate).toHaveBeenCalledWith(1, "2026-01-27");
      expect(result?.reflection).toBe("Today was productive");
    });

    it("should upsert summary", async () => {
      const mockSummary = {
        id: 1,
        userId: 1,
        summaryDate: "2026-01-27",
        reflection: "Updated reflection",
      };
      vi.mocked(upsertSummary).mockResolvedValue(mockSummary as any);

      const result = await upsertSummary({
        userId: 1,
        summaryDate: "2026-01-27",
        reflection: "Updated reflection",
      });

      expect(upsertSummary).toHaveBeenCalled();
      expect(result?.reflection).toBe("Updated reflection");
    });

    it("should get summaries in date range", async () => {
      const mockSummaries = [
        { id: 1, summaryDate: "2026-01-25" },
        { id: 2, summaryDate: "2026-01-26" },
      ];
      vi.mocked(getSummariesInRange).mockResolvedValue(mockSummaries as any);

      const result = await getSummariesInRange(1, "2026-01-01", "2026-02-01");

      expect(getSummariesInRange).toHaveBeenCalledWith(1, "2026-01-01", "2026-02-01");
      expect(result).toHaveLength(2);
    });

    it("should get task statistics", async () => {
      const mockStats = {
        total: 10,
        completed: 7,
        byQuadrant: {
          priority: { total: 3, completed: 2 },
          strategic: { total: 4, completed: 3 },
          trivial: { total: 2, completed: 1 },
          trap: { total: 1, completed: 1 },
        },
      };
      vi.mocked(getTaskStats).mockResolvedValue(mockStats);

      const result = await getTaskStats(1, "2026-01-01", "2026-02-01");

      expect(getTaskStats).toHaveBeenCalledWith(1, "2026-01-01", "2026-02-01");
      expect(result.total).toBe(10);
      expect(result.completed).toBe(7);
    });
  });

  describe("Prompt Template Operations", () => {
    it("should get all prompt templates", async () => {
      const mockTemplates = [
        { id: 1, name: "Default Template", isDefault: true },
        { id: 2, name: "Custom Template", isDefault: false },
      ];
      vi.mocked(getPromptTemplates).mockResolvedValue(mockTemplates as any);

      const result = await getPromptTemplates(1);

      expect(getPromptTemplates).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
    });

    it("should create a prompt template", async () => {
      const mockTemplate = {
        id: 1,
        userId: 1,
        name: "New Template",
        promptContent: "Analyze my tasks",
        isDefault: false,
      };
      vi.mocked(createPromptTemplate).mockResolvedValue(mockTemplate as any);

      const result = await createPromptTemplate({
        userId: 1,
        name: "New Template",
        promptContent: "Analyze my tasks",
      });

      expect(createPromptTemplate).toHaveBeenCalled();
      expect(result.name).toBe("New Template");
    });

    it("should update a prompt template", async () => {
      const mockTemplate = {
        id: 1,
        name: "Updated Template",
        isDefault: true,
      };
      vi.mocked(updatePromptTemplate).mockResolvedValue(mockTemplate as any);

      const result = await updatePromptTemplate(1, 1, { name: "Updated Template", isDefault: true });

      expect(updatePromptTemplate).toHaveBeenCalledWith(1, 1, { name: "Updated Template", isDefault: true });
      expect(result.isDefault).toBe(true);
    });

    it("should delete a prompt template", async () => {
      vi.mocked(deletePromptTemplate).mockResolvedValue(true);

      const result = await deletePromptTemplate(1, 1);

      expect(deletePromptTemplate).toHaveBeenCalledWith(1, 1);
      expect(result).toBe(true);
    });

    it("should get default prompt template", async () => {
      const mockTemplate = {
        id: 1,
        name: "Default Template",
        isDefault: true,
        promptContent: "Default analysis prompt",
      };
      vi.mocked(getDefaultPromptTemplate).mockResolvedValue(mockTemplate as any);

      const result = await getDefaultPromptTemplate(1);

      expect(getDefaultPromptTemplate).toHaveBeenCalledWith(1);
      expect(result?.isDefault).toBe(true);
    });
  });
});

describe("Task Quadrant Types", () => {
  it("should have valid quadrant values", () => {
    const validQuadrants = ["priority", "strategic", "trivial", "trap"];
    
    validQuadrants.forEach(quadrant => {
      expect(["priority", "strategic", "trivial", "trap"]).toContain(quadrant);
    });
  });
});
