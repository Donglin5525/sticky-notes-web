import { cn } from "@/lib/utils";
import { Note, getQuadrant, quadrantConfig, noteColors } from "@/types/note";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Clock, Tag, RotateCcw, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
  onRestore?: (id: number) => void;
  onPermanentDelete?: (id: number) => void;
}

const colorMap = {
  yellow: "bg-note-yellow",
  green: "bg-note-green",
  blue: "bg-note-blue",
  pink: "bg-note-pink",
  purple: "bg-note-purple",
  orange: "bg-note-orange",
};

export function NoteCard({ 
  note, 
  onClick, 
  isSelected, 
  className,
  onRestore,
  onPermanentDelete,
}: NoteCardProps) {
  const quadrant = getQuadrant(note);
  const config = quadrantConfig[quadrant];
  
  // Strip HTML tags for preview
  const plainContent = note.content
    ? note.content.replace(/<[^>]*>/g, "").trim()
    : "";
  
  const timeAgo = formatDistanceToNow(new Date(note.updatedAt), {
    addSuffix: true,
    locale: zhCN,
  });

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestore?.(note.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPermanentDelete?.(note.id);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col p-5 rounded-xl cursor-pointer note-card",
        "border border-white/30 shadow-sm",
        "backdrop-blur-sm",
        colorMap[note.color],
        note.isDeleted ? "opacity-70 grayscale-[0.3]" : "hover:-translate-y-1 hover:shadow-lg",
        isSelected && "ring-2 ring-primary ring-offset-2 shadow-lg scale-[1.02]",
        className
      )}
    >
      {/* Priority Indicator */}
      {(note.isImportant || note.isUrgent) && !note.isDeleted && (
        <div className="absolute -top-2 -right-2 flex gap-1">
          {note.isImportant && (
            <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
              !
            </span>
          )}
          {note.isUrgent && (
            <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-md">
              <Clock className="w-3 h-3" />
            </span>
          )}
        </div>
      )}

      {/* Trash Actions */}
      {note.isDeleted && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-white/40"
            onClick={handleRestore}
            title="恢复"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-destructive/20 text-destructive"
            onClick={handleDelete}
            title="永久删除"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Title */}
      <h3 className={cn(
        "font-semibold text-foreground/90 mb-2 line-clamp-2 pr-6",
        !note.title && "text-muted-foreground italic"
      )}>
        {note.title || "无标题"}
      </h3>

      {/* Content Preview - Show more content */}
      <p className="text-sm text-foreground/70 line-clamp-5 mb-3 flex-grow whitespace-pre-wrap">
        {plainContent || "暂无内容..."}
      </p>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-black/10 text-foreground/70 text-[10px] h-5 px-1.5"
            >
              <Tag className="w-2.5 h-2.5 mr-0.5" />
              {tag}
            </Badge>
          ))}
          {note.tags.length > 3 && (
            <Badge variant="secondary" className="bg-black/10 text-foreground/60 text-[10px] h-5 px-1.5">
              +{note.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-foreground/50 mt-auto pt-2 border-t border-black/5">
        <span>{timeAgo}</span>
        {!note.isDeleted && (
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-medium border",
            config.color,
            config.textColor
          )}>
            {config.label}
          </span>
        )}
      </div>
    </div>
  );
}
