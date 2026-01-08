import { cn } from "@/lib/utils";
import { Note, getQuadrant, quadrantConfig } from "@/types/note";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
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
        "group relative flex flex-col p-4 rounded-xl cursor-pointer",
        "bg-white border border-gray-200 shadow-sm",
        "border-l-4",
        colorBorderMap[note.color],
        "transition-all duration-200",
        note.isDeleted 
          ? "opacity-70 grayscale-[0.3]" 
          : "hover:-translate-y-1 hover:shadow-md hover:border-gray-300",
        isSelected && "ring-2 ring-primary ring-offset-2 shadow-md",
        className
      )}
    >
      {/* Header with priority badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={cn(
          "font-semibold text-gray-800 line-clamp-2 flex-1",
          !note.title && "text-gray-400 italic"
        )}>
          {note.title || "无标题"}
        </h3>
        
        {/* Priority indicators - inside card */}
        {(note.isImportant || note.isUrgent) && !note.isDeleted && (
          <div className="flex gap-1 flex-shrink-0">
            {note.isImportant && (
              <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center" title="重要">
                <AlertCircle className="w-3 h-3 text-red-500" />
              </span>
            )}
            {note.isUrgent && (
              <span className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center" title="紧急">
                <Clock className="w-3 h-3 text-orange-500" />
              </span>
            )}
          </div>
        )}

        {/* Trash Actions */}
        {note.isDeleted && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-gray-100"
              onClick={handleRestore}
              title="恢复"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-red-50 text-red-500"
              onClick={handleDelete}
              title="永久删除"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Content Preview */}
      <p className="text-sm text-gray-600 line-clamp-4 mb-3 flex-grow whitespace-pre-wrap">
        {plainContent || "暂无内容..."}
      </p>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-gray-100 text-gray-600 text-[10px] h-5 px-1.5"
            >
              <Tag className="w-2.5 h-2.5 mr-0.5" />
              {tag}
            </Badge>
          ))}
          {note.tags.length > 3 && (
            <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-[10px] h-5 px-1.5">
              +{note.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100">
        <span>{timeAgo}</span>
        {!note.isDeleted && (
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-medium",
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
