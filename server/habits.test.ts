import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-habit-user",
    email: "habit@example.com",
    name: "Habit User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("habits", () => {
  let createdHabitId: number;

  describe("habits.create", () => {
    it("should create a count-type habit", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.create({
        name: "测试抽烟",
        type: "count",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("number");
      createdHabitId = result.id;
    });

    it("should create a value-type habit", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.create({
        name: "测试体重",
        type: "value",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should reject unauthenticated requests", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.habits.create({ name: "test", type: "count" })
      ).rejects.toThrow();
    });
  });

  describe("habits.list", () => {
    it("should list active habits for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);

      const countHabit = result.find((h) => h.name === "测试抽烟");
      expect(countHabit).toBeDefined();
      expect(countHabit?.type).toBe("count");
      expect(countHabit?.todayCount).toBeDefined();
      expect(countHabit?.todaySum).toBeDefined();
    });

    it("should include previousRecord field for trend comparison", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.list();
      expect(result.length).toBeGreaterThanOrEqual(1);

      // Every habit in list should have previousRecord field (can be null)
      for (const habit of result) {
        expect(habit).toHaveProperty("previousRecord");
        expect(habit).toHaveProperty("latestRecord");
      }
    });

    it("should reject unauthenticated requests", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.habits.list()).rejects.toThrow();
    });
  });

  describe("habits.quickRecord", () => {
    it("should add a quick record for a count habit", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.quickRecord({
        habitId: createdHabitId,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should increment today count after quick record", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const habits = await caller.habits.list();
      const habit = habits.find((h) => h.id === createdHabitId);
      expect(habit).toBeDefined();
      expect(habit!.todayCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("habits.addRecord", () => {
    it("should add a detailed record with value and note", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.addRecord({
        habitId: createdHabitId,
        value: "3",
        note: "测试备注",
        timestamp: Date.now(),
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  describe("habits.getRecords", () => {
    it("should return records within time range", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const now = Date.now();
      const result = await caller.habits.getRecords({
        habitId: createdHabitId,
        startTime: now - 24 * 60 * 60 * 1000,
        endTime: now + 1000,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("habits.update", () => {
    it("should update habit name and type", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.update({
        id: createdHabitId,
        name: "更新后的习惯",
        type: "count",
      });

      expect(result).toBeDefined();

      const habits = await caller.habits.list();
      const updated = habits.find((h) => h.id === createdHabitId);
      expect(updated?.name).toBe("更新后的习惯");
    });
  });

  describe("habits.updateSortOrders", () => {
    it("should update sort orders for habits", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const habits = await caller.habits.list();
      const orders = habits.map((h, i) => ({
        id: h.id,
        sortOrder: habits.length - 1 - i,
      }));

      const result = await caller.habits.updateSortOrders({ orders });
      expect(result).toBe(true);
    });
  });

  describe("habits.archive & restore", () => {
    it("should archive a habit", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.archive({ id: createdHabitId });
      expect(result).toBeDefined();

      const habits = await caller.habits.list();
      const archived = habits.find((h) => h.id === createdHabitId);
      expect(archived).toBeUndefined();
    });

    it("should show in archived list", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const archived = await caller.habits.archived();
      const found = archived.find((h) => h.id === createdHabitId);
      expect(found).toBeDefined();
    });

    it("should restore a habit", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.restore({ id: createdHabitId });
      expect(result).toBeDefined();

      const habits = await caller.habits.list();
      const restored = habits.find((h) => h.id === createdHabitId);
      expect(restored).toBeDefined();
    });
  });

  describe("habits.delete & permanentDelete", () => {
    it("should soft delete a habit", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.delete({ id: createdHabitId });
      expect(result).toBe(true);

      // Should not appear in active list
      const habits = await caller.habits.list();
      const found = habits.find((h) => h.id === createdHabitId);
      expect(found).toBeUndefined();
    });

    it("should show soft-deleted habit in archived list", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const archived = await caller.habits.archived();
      const found = archived.find((h) => h.id === createdHabitId);
      expect(found).toBeDefined();
      expect(found?.isDeleted).toBe(true);
    });

    it("should restore a soft-deleted habit back to active list", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Restore the soft-deleted habit
      const restored = await caller.habits.restore({ id: createdHabitId });
      expect(restored).toBeDefined();

      // Should appear in active list again
      const habits = await caller.habits.list();
      const found = habits.find((h) => h.id === createdHabitId);
      expect(found).toBeDefined();

      // Should no longer appear in archived list
      const archived = await caller.habits.archived();
      const archivedFound = archived.find((h) => h.id === createdHabitId);
      expect(archivedFound).toBeUndefined();
    });

    it("should soft delete again for permanent delete test", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.delete({ id: createdHabitId });
      expect(result).toBe(true);
    });

    it("should permanently delete a habit", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.habits.permanentDelete({
        id: createdHabitId,
      });
      expect(result).toBe(true);

      const archived = await caller.habits.archived();
      const found = archived.find((h) => h.id === createdHabitId);
      expect(found).toBeUndefined();
    });
  });
});
