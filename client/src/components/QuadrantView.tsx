import { Note, getQuadrant, quadrantConfig, Quadrant } from "@/types/note";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { Check, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Badge } from "./ui/badge";

interface QuadrantViewProps {
  notes: Note[];
  selectedNoteId: number | null;
  onNoteClick: (note: Note) => void;
  onToggleComplete?: (note: Note) => void;
  onRestore?: (id: number) => void;
  onPermanentDelete?: (id: number) => void;
}

const quadrantOrder: Quadrant[] = ["do-first", "schedule", "delegate", "eliminate"];

// 颜色映射 - 用于 TODO 项的左侧边框
const colorBorderMap = {
  yellow: "border-l-amber-400",
  green: "border-l-emerald-400",
  blue: "border-l-sky-400",
  pink: "border-l-pink-400",
  purple: "border-l-violet-400",
  orange: "border-l-orange-400",
};

// TODO 项组件
function TodoItem({
  note,
  isSelected,
  onClick,
  onToggleComplete,
}: {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
  onToggleComplete?: (note: Note) => void;
}) {
  const quadrant = getQuadrant(note);
  const isCompleted = quadrant === "eliminate"; // 不重要不紧急视为已完成
  
  const timeAgo = formatDistanceToNow(new Date(note.updatedAt), {
    addSuffix: true,
    locale: zhCN,
  });

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleComplete) {
      onToggleComplete(note);
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg cursor-pointer",
        "bg-white/80 border border-gray-200/50",
        "border-l-4",
        colorBorderMap[note.color],
        "transition-all duration-200",
        "hover:bg-white hover:shadow-sm",
        isSelected && "bg-primary/5 border-primary/30 ring-1 ring-primary/20",
        isCompleted && "opacity-60"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheckboxClick}
        className={cn(
          "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5",
          isCompleted
            ? "bg-green-500 border-green-500 text-white"
            : "border-gray-300 hover:border-primary hover:bg-primary/10"
        )}
      >
        {isCompleted && <Check className="w-3 h-3" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={cn(
            "font-medium text-sm truncate",
            isCompleted ? "text-gray-400 line-through" : "text-gray-800",
            !note.title && "text-gray-400 italic"
          )}>
            {note.title || "无标题"}
          </h4>
          
          {/* Priority indicators */}
          <div className="flex gap-1 flex-shrink-0">
            {note.isImportant && (
              <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center" title="重要">
                <AlertCircle className="w-2.5 h-2.5 text-red-500" />
              </span>
            )}
            {note.isUrgent && (
              <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center" title="紧急">
                <Clock className="w-2.5 h-2.5 text-orange-500" />
              </span>
            )}
          </div>
        </div>
        
        {/* Preview content */}
        {note.content && (
          <p className={cn(
            "text-xs truncate mb-1",
            isCompleted ? "text-gray-300" : "text-gray-500"
          )}>
            {note.content.replace(/<[^>]*>/g, "").trim().slice(0, 50)}
          </p>
        )}
        
        {/* Meta info */}
        <div className="flex items-center gap-2">
          {note.tags && note.tags.length > 0 && (
            <div className="flex gap-1">
              {note.tags.slice(0, 1).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-gray-100/80 text-gray-500 text-[10px] h-4 px-1.5"
                >
                  {tag}
                </Badge>
              ))}
              {note.tags.length > 1 && (
                <Badge variant="secondary" className="bg-gray-100/80 text-gray-400 text-[10px] h-4 px-1">
                  +{note.tags.length - 1}
                </Badge>
              )}
            </div>
          )}
          <span className="text-[10px] text-gray-400">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

export function QuadrantView({
  notes,
  selectedNoteId,
  onNoteClick,
  onToggleComplete,
  onRestore,
  onPermanentDelete,
}: QuadrantViewProps) {
  // Group notes by quadrant
  const groupedNotes = quadrantOrder.reduce((acc, quadrant) => {
    acc[quadrant] = notes.filter((note) => getQuadrant(note) === quadrant);
    return acc;
  }, {} as Record<Quadrant, Note[]>);

  return (
    <div className="grid grid-cols-2 gap-4 h-full p-4">
      {quadrantOrder.map((quadrant) => {
        const config = quadrantConfig[quadrant];
        const quadrantNotes = groupedNotes[quadrant];

        return (
          <div
            key={quadrant}
            className={cn(
              "rounded-2xl border-2 overflow-hidden flex flex-col",
              "bg-card/50 backdrop-blur-sm",
              config.color
            )}
          >
            {/* Quadrant Header */}
            <div className="p-4 border-b border-black/5 bg-white/30">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <h3 className={cn("font-bold text-lg", config.textColor)}>
                    {config.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {config.description} · {quadrantNotes.length} 项
                  </p>
                </div>
              </div>
            </div>

            {/* Notes as TODO List */}
            <ScrollArea className="flex-1 p-3">
              {quadrantNotes.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  暂无便签
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {quadrantNotes.map((note) => (
                    <TodoItem
                      key={note.id}
                      note={note}
                      isSelected={selectedNoteId === note.id}
                      onClick={() => onNoteClick(note)}
                      onToggleComplete={onToggleComplete}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
