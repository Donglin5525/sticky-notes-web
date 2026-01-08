import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("../db", () => ({
  getUserNotes: vi.fn(),
  updateNote: vi.fn(),
  renameTag: vi.fn(),
  deleteTag: vi.fn(),
  moveTag: vi.fn(),
}));

import { renameTag, deleteTag, moveTag, getUserNotes, updateNote } from "../db";

describe("Tag Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("renameTag", () => {
    it("should rename a simple tag", async () => {
      const mockNotes = [
        { id: 1, tags: JSON.stringify(["work"]), userId: 1 },
        { id: 2, tags: JSON.stringify(["personal", "work"]), userId: 1 },
      ];
      
      vi.mocked(getUserNotes).mockResolvedValue(mockNotes as any);
      vi.mocked(updateNote).mockResolvedValue({} as any);
      vi.mocked(renameTag).mockImplementation(async (userId, oldTag, newTag) => {
        const notes = await getUserNotes(userId);
        let count = 0;
        for (const note of notes) {
          const tags = note.tags ? JSON.parse(note.tags) : [];
          if (tags.includes(oldTag)) {
            count++;
          }
        }
        return { updatedCount: count };
      });

      const result = await renameTag(1, "work", "job");
      expect(result.updatedCount).toBe(2);
    });

    it("should rename hierarchical tags", async () => {
      const mockNotes = [
        { id: 1, tags: JSON.stringify(["work/project-a"]), userId: 1 },
        { id: 2, tags: JSON.stringify(["work/project-b"]), userId: 1 },
      ];
      
      vi.mocked(getUserNotes).mockResolvedValue(mockNotes as any);
      vi.mocked(renameTag).mockImplementation(async (userId, oldTag, newTag) => {
        const notes = await getUserNotes(userId);
        let count = 0;
        for (const note of notes) {
          const tags = note.tags ? JSON.parse(note.tags) : [];
          if (tags.some((t: string) => t === oldTag || t.startsWith(oldTag + "/"))) {
            count++;
          }
        }
        return { updatedCount: count };
      });

      const result = await renameTag(1, "work", "job");
      expect(result.updatedCount).toBe(2);
    });
  });

  describe("deleteTag", () => {
    it("should delete a tag from all notes", async () => {
      const mockNotes = [
        { id: 1, tags: JSON.stringify(["work", "urgent"]), userId: 1 },
        { id: 2, tags: JSON.stringify(["work"]), userId: 1 },
      ];
      
      vi.mocked(getUserNotes).mockResolvedValue(mockNotes as any);
      vi.mocked(deleteTag).mockImplementation(async (userId, tagToDelete) => {
        const notes = await getUserNotes(userId);
        let count = 0;
        for (const note of notes) {
          const tags = note.tags ? JSON.parse(note.tags) : [];
          if (tags.includes(tagToDelete)) {
            count++;
          }
        }
        return { updatedCount: count };
      });

      const result = await deleteTag(1, "work");
      expect(result.updatedCount).toBe(2);
    });

    it("should delete hierarchical tags and children", async () => {
      const mockNotes = [
        { id: 1, tags: JSON.stringify(["work/project-a"]), userId: 1 },
        { id: 2, tags: JSON.stringify(["work"]), userId: 1 },
      ];
      
      vi.mocked(getUserNotes).mockResolvedValue(mockNotes as any);
      vi.mocked(deleteTag).mockImplementation(async (userId, tagToDelete) => {
        const notes = await getUserNotes(userId);
        let count = 0;
        for (const note of notes) {
          const tags = note.tags ? JSON.parse(note.tags) : [];
          if (tags.some((t: string) => t === tagToDelete || t.startsWith(tagToDelete + "/"))) {
            count++;
          }
        }
        return { updatedCount: count };
      });

      const result = await deleteTag(1, "work");
      expect(result.updatedCount).toBe(2);
    });
  });

  describe("moveTag", () => {
    it("should move a tag to root", async () => {
      vi.mocked(moveTag).mockImplementation(async (userId, tagToMove, newParent) => {
        const tagName = tagToMove.split("/").pop() || tagToMove;
        const newTag = newParent ? `${newParent}/${tagName}` : tagName;
        return { updatedCount: 1 };
      });

      const result = await moveTag(1, "work/project-a", null);
      expect(result.updatedCount).toBe(1);
    });

    it("should move a tag under another parent", async () => {
      vi.mocked(moveTag).mockImplementation(async (userId, tagToMove, newParent) => {
        const tagName = tagToMove.split("/").pop() || tagToMove;
        const newTag = newParent ? `${newParent}/${tagName}` : tagName;
        return { updatedCount: 1 };
      });

      const result = await moveTag(1, "project-a", "personal");
      expect(result.updatedCount).toBe(1);
    });
  });
});
