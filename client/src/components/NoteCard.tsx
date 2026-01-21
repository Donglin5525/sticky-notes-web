import { cn } from "@/lib/utils";
import { Note, getQuadrant, quadrantConfig } from "@/types/note";
import { formatRelativeTime } from "@/lib/dateUtils";
import { Clock, Tag, RotateCcw, X, AlertCircle } from "lucide-react";
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

// 颜色映射 - 使用左侧边框颜色标识
const colorBorderMap = {
  yellow: "border-l-amber-400",
  green: "border-l-emerald-400",
  blue: "border-l-sky-400",
  pink: "border-l-pink-400",
  purple: "border-l-violet-400",
  orange: "border-l-orange-400",
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
  
  const timeAgo = formatRelativeTime(note.updatedAt);

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
        "group relative flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer",
        "bg-white border border-gray-200",
        "border-l-4",
        colorBorderMap[note.color],
        "transition-all duration-200",
        note.isDeleted 
          ? "opacity-70 grayscale-[0.3]" 
          : "hover:bg-gray-50 hover:border-gray-300",
        isSelected && "bg-primary/5 border-primary/30 ring-1 ring-primary/20",
        className
      )}
    >
      {/* Priority indicators */}
      <div className="flex gap-1 flex-shrink-0">
        {note.isImportant && (
          <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center" title="重要">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          </span>
        )}
        {note.isUrgent && (
          <span className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center" title="紧急">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
          </span>
        )}
        {!note.isImportant && !note.isUrgent && (
          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className={cn(
            "font-medium text-gray-800 truncate",
            !note.title && "text-gray-400 italic"
          )}>
            {note.title || "无标题"}
          </h3>
          
          {/* Tags inline */}
          {note.tags && note.tags.length > 0 && (
            <div className="hidden sm:flex gap-1 flex-shrink-0">
              {note.tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-gray-100 text-gray-500 text-[10px] h-4 px-1.5"
                >
                  {tag}
                </Badge>
              ))}
              {note.tags.length > 2 && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-400 text-[10px] h-4 px-1">
                  +{note.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <p className="text-sm text-gray-500 truncate">
          {plainContent || "暂无内容..."}
        </p>
      </div>

      {/* Right side info */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Quadrant badge */}
        {!note.isDeleted && (
          <span className={cn(
            "hidden md:inline-flex px-2 py-0.5 rounded text-[11px] font-medium",
            config.color,
            config.textColor
          )}>
            {config.label}
          </span>
        )}
        
        {/* Time */}
        <span className="text-xs text-gray-400 whitespace-nowrap min-w-[70px] text-right">
          {timeAgo}
        </span>

        {/* Trash Actions */}
        {note.isDeleted && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-gray-100"
              onClick={handleRestore}
              title="恢复"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-red-50 text-red-500"
              onClick={handleDelete}
              title="永久删除"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
