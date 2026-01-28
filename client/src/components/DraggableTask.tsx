import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, GripVertical } from "lucide-react";

interface Task {
  id: number;
  title: string;
  quadrant: string;
  isCompleted: boolean;
  notes: string | null;
  taskDate: string;
  isCarriedOver: boolean;
  originalDate: string | null;
  createdAt: number;
  updatedAt: number;
}

interface DraggableTaskProps {
  task: Task;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onSelect?: (taskId: number) => void;
}

export function DraggableTask({
  task,
  isSelected = false,
  isSelectionMode = false,
  onToggleComplete,
  onEdit,
  onDelete,
  onSelect,
}: DraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-white/70 border border-white/50 group",
        task.isCompleted && "opacity-60",
        isDragging && "opacity-50 shadow-lg z-50",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Selection checkbox in selection mode */}
      {isSelectionMode ? (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect?.(task.id)}
        />
      ) : (
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={() => onToggleComplete(task)}
        />
      )}

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            task.isCompleted && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        {task.isCarriedOver && (
          <p className="text-xs text-amber-600">延期自 {task.originalDate}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(task)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
