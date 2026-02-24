import { cn } from "@/lib/utils";
import { Note, getQuadrant, quadrantConfig } from "@/types/note";
import { formatRelativeTime } from "@/lib/dateUtils";
import { Clock, Tag, RotateCcw, X, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useIsMobile } from "@/hooks/useMobile";

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
  const isMobile = useIsMobile();
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

  // Mobile card layout
  if (isMobile) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "relative rounded-xl cursor-pointer",
          "bg-white border border-gray-100",
          "border-l-4",
          colorBorderMap[note.color],
          "transition-all duration-200 active:scale-[0.98]",
          note.isDeleted 
            ? "opacity-70 grayscale-[0.3]" 
            : "",
          isSelected && "bg-primary/5 border-primary/30 ring-1 ring-primary/20",
          className
        )}
      >
        <div className="px-3.5 py-3">
          {/* Top row: title + time */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* Priority indicators - compact */}
              {note.isImportant && (
                <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                </span>
              )}
              {note.isUrgent && !note.isImportant && (
                <span className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3 h-3 text-orange-500" />
                </span>
              )}
              <h3 className={cn(
                "font-medium text-[15px] text-gray-800 truncate",
                !note.title && "text-gray-400 italic"
              )}>
                {note.title || "无标题"}
              </h3>
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0 pt-0.5">
              {timeAgo}
            </span>
          </div>

          {/* Content preview */}
          {plainContent && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-1.5 leading-relaxed">
              {plainContent}
            </p>
          )}

          {/* Bottom row: tags + quadrant + priority badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Priority badges (both important and urgent) */}
            {note.isImportant && note.isUrgent && (
              <Badge variant="secondary" className="bg-red-50 text-red-600 text-[10px] h-5 px-1.5">
                重要且紧急
              </Badge>
            )}
            {note.isImportant && !note.isUrgent && (
              <Badge variant="secondary" className="bg-red-50 text-red-500 text-[10px] h-5 px-1.5">
                重要
              </Badge>
            )}
            {!note.isImportant && note.isUrgent && (
              <Badge variant="secondary" className="bg-orange-50 text-orange-500 text-[10px] h-5 px-1.5">
                紧急
              </Badge>
            )}

            {/* Tags */}
            {note.tags && note.tags.length > 0 && (
              <>
                {note.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-gray-100 text-gray-500 text-[10px] h-5 px-1.5"
                  >
                    {tag}
                  </Badge>
                ))}
                {note.tags.length > 2 && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-400 text-[10px] h-5 px-1">
                    +{note.tags.length - 2}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>

        {/* Trash Actions - always visible on mobile */}
        {note.isDeleted && (
          <div className="flex gap-1 px-3.5 pb-2.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs flex-1"
              onClick={handleRestore}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              恢复
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs flex-1 text-red-500 hover:bg-red-50"
              onClick={handleDelete}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              删除
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Desktop card layout (original)
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
