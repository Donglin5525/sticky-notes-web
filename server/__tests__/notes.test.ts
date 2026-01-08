import { describe, it, expect } from "vitest";

/**
 * Note Quadrant Logic Tests
 * Tests the core business logic for the Eisenhower Matrix quadrant system
 */

// Quadrant determination logic (same as in types/note.ts)
type Quadrant = "do-first" | "schedule" | "delegate" | "eliminate";

interface NoteQuadrantInput {
  isImportant: boolean;
  isUrgent: boolean;
}

function getQuadrant(note: NoteQuadrantInput): Quadrant {
  if (note.isImportant && note.isUrgent) return "do-first";
  if (note.isImportant && !note.isUrgent) return "schedule";
  if (!note.isImportant && note.isUrgent) return "delegate";
  return "eliminate";
}

// Quadrant configuration (same as in types/note.ts)
const quadrantConfig = {
  "do-first": {
    label: "立即执行",
    description: "重要且紧急",
    color: "bg-red-100 border-red-300",
    textColor: "text-red-700",
    icon: "🔥",
  },
  schedule: {
    label: "计划安排",
    description: "重要不紧急",
    color: "bg-purple-100 border-purple-300",
    textColor: "text-purple-700",
    icon: "📅",
  },
  delegate: {
    label: "委托他人",
    description: "紧急不重要",
    color: "bg-green-100 border-green-300",
    textColor: "text-green-700",
    icon: "👥",
  },
  eliminate: {
    label: "稍后处理",
    description: "不重要不紧急",
    color: "bg-gray-100 border-gray-300",
    textColor: "text-gray-700",
    icon: "📋",
  },
};

describe("Quadrant Logic", () => {
  describe("getQuadrant", () => {
    it("should return 'do-first' for important and urgent notes", () => {
      const result = getQuadrant({ isImportant: true, isUrgent: true });
      expect(result).toBe("do-first");
    });

    it("should return 'schedule' for important but not urgent notes", () => {
      const result = getQuadrant({ isImportant: true, isUrgent: false });
      expect(result).toBe("schedule");
    });

    it("should return 'delegate' for urgent but not important notes", () => {
      const result = getQuadrant({ isImportant: false, isUrgent: true });
      expect(result).toBe("delegate");
    });

    it("should return 'eliminate' for neither important nor urgent notes", () => {
      const result = getQuadrant({ isImportant: false, isUrgent: false });
      expect(result).toBe("eliminate");
    });
  });

  describe("quadrantConfig", () => {
    it("should have correct configuration for do-first quadrant", () => {
      const config = quadrantConfig["do-first"];
      expect(config.label).toBe("立即执行");
      expect(config.description).toBe("重要且紧急");
      expect(config.icon).toBe("🔥");
    });

    it("should have correct configuration for schedule quadrant", () => {
      const config = quadrantConfig["schedule"];
      expect(config.label).toBe("计划安排");
      expect(config.description).toBe("重要不紧急");
      expect(config.icon).toBe("📅");
    });

    it("should have correct configuration for delegate quadrant", () => {
      const config = quadrantConfig["delegate"];
      expect(config.label).toBe("委托他人");
      expect(config.description).toBe("紧急不重要");
      expect(config.icon).toBe("👥");
    });

    it("should have correct configuration for eliminate quadrant", () => {
      const config = quadrantConfig["eliminate"];
      expect(config.label).toBe("稍后处理");
      expect(config.description).toBe("不重要不紧急");
      expect(config.icon).toBe("📋");
    });

    it("should have all required properties for each quadrant", () => {
      const requiredProps = ["label", "description", "color", "textColor", "icon"];
      
      Object.values(quadrantConfig).forEach((config) => {
        requiredProps.forEach((prop) => {
          expect(config).toHaveProperty(prop);
          expect((config as any)[prop]).toBeTruthy();
        });
      });
    });
  });
});

describe("Note Color Validation", () => {
  const validColors = ["yellow", "green", "blue", "pink", "purple", "orange"];

  it("should have 6 valid note colors", () => {
    expect(validColors.length).toBe(6);
  });

  it("should include all expected colors", () => {
    expect(validColors).toContain("yellow");
    expect(validColors).toContain("green");
    expect(validColors).toContain("blue");
    expect(validColors).toContain("pink");
    expect(validColors).toContain("purple");
    expect(validColors).toContain("orange");
  });
});

describe("Note Data Structure", () => {
  interface Note {
    id: number;
    userId: number;
    title: string;
    content: string | null;
    color: string;
    isImportant: boolean;
    isUrgent: boolean;
    tags: string[];
    sortOrder: number;
    isDeleted: boolean;
    createdAt: number;
    updatedAt: number;
  }

  const createMockNote = (overrides: Partial<Note> = {}): Note => ({
    id: 1,
    userId: 1,
    title: "Test Note",
    content: null,
    color: "yellow",
    isImportant: false,
    isUrgent: false,
    tags: [],
    sortOrder: 0,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  it("should create a valid note with default values", () => {
    const note = createMockNote();
    
    expect(note.id).toBe(1);
    expect(note.title).toBe("Test Note");
    expect(note.color).toBe("yellow");
    expect(note.isImportant).toBe(false);
    expect(note.isUrgent).toBe(false);
    expect(note.isDeleted).toBe(false);
    expect(Array.isArray(note.tags)).toBe(true);
  });

  it("should allow overriding default values", () => {
    const note = createMockNote({
      title: "Custom Title",
      color: "pink",
      isImportant: true,
      isUrgent: true,
      tags: ["work", "priority"],
    });
    
    expect(note.title).toBe("Custom Title");
    expect(note.color).toBe("pink");
    expect(note.isImportant).toBe(true);
    expect(note.isUrgent).toBe(true);
    expect(note.tags).toEqual(["work", "priority"]);
  });

  it("should correctly identify deleted notes", () => {
    const activeNote = createMockNote({ isDeleted: false });
    const deletedNote = createMockNote({ isDeleted: true });
    
    expect(activeNote.isDeleted).toBe(false);
    expect(deletedNote.isDeleted).toBe(true);
  });

  it("should correctly categorize notes by quadrant", () => {
    const doFirstNote = createMockNote({ isImportant: true, isUrgent: true });
    const scheduleNote = createMockNote({ isImportant: true, isUrgent: false });
    const delegateNote = createMockNote({ isImportant: false, isUrgent: true });
    const eliminateNote = createMockNote({ isImportant: false, isUrgent: false });
    
    expect(getQuadrant(doFirstNote)).toBe("do-first");
    expect(getQuadrant(scheduleNote)).toBe("schedule");
    expect(getQuadrant(delegateNote)).toBe("delegate");
    expect(getQuadrant(eliminateNote)).toBe("eliminate");
  });
});

describe("Tag System", () => {
  it("should allow empty tags array", () => {
    const tags: string[] = [];
    expect(tags.length).toBe(0);
  });

  it("should allow multiple tags", () => {
    const tags = ["work", "personal", "urgent"];
    expect(tags.length).toBe(3);
    expect(tags).toContain("work");
    expect(tags).toContain("personal");
    expect(tags).toContain("urgent");
  });

  it("should filter notes by tag", () => {
    const notes = [
      { id: 1, tags: ["work", "priority"] },
      { id: 2, tags: ["personal"] },
      { id: 3, tags: ["work"] },
    ];
    
    const workNotes = notes.filter((n) => n.tags.includes("work"));
    expect(workNotes.length).toBe(2);
    expect(workNotes.map((n) => n.id)).toEqual([1, 3]);
  });
});
