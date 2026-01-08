export type NoteColor = "yellow" | "green" | "blue" | "pink" | "purple" | "orange";

export type Quadrant = "do-first" | "schedule" | "delegate" | "eliminate";

export interface Note {
  id: number;
  userId: number;
  title: string;
  content: string | null;
  color: NoteColor;
  isImportant: boolean;
  isUrgent: boolean;
  isDeleted: boolean;
  tags: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export function getQuadrant(note: Note): Quadrant {
  if (note.isImportant && note.isUrgent) return "do-first";
  if (note.isImportant && !note.isUrgent) return "schedule";
  if (!note.isImportant && note.isUrgent) return "delegate";
  return "eliminate";
}

export const quadrantConfig = {
  "do-first": {
    label: "重要且紧急",
    description: "立即处理",
    color: "bg-red-500/10 border-red-500/30",
    textColor: "text-red-600",
    icon: "🔥",
  },
  "schedule": {
    label: "重要不紧急",
    description: "计划安排",
    color: "bg-purple-500/10 border-purple-500/30",
    textColor: "text-purple-600",
    icon: "📅",
  },
  "delegate": {
    label: "紧急不重要",
    description: "委托他人",
    color: "bg-green-500/10 border-green-500/30",
    textColor: "text-green-600",
    icon: "👥",
  },
  "eliminate": {
    label: "不重要不紧急",
    description: "考虑删除",
    color: "bg-gray-500/10 border-gray-500/30",
    textColor: "text-gray-500",
    icon: "🗑️",
  },
} as const;

export const noteColors = [
  { value: "yellow" as const, label: "黄色", class: "bg-note-yellow" },
  { value: "green" as const, label: "绿色", class: "bg-note-green" },
  { value: "blue" as const, label: "蓝色", class: "bg-note-blue" },
  { value: "pink" as const, label: "粉色", class: "bg-note-pink" },
  { value: "purple" as const, label: "紫色", class: "bg-note-purple" },
  { value: "orange" as const, label: "橙色", class: "bg-note-orange" },
] as const;
