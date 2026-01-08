import { useState, useEffect, useCallback } from "react";
import { Note, NoteColor, noteColors, quadrantConfig, getQuadrant } from "@/types/note";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  X,
  Trash2,
  Tag,
  Plus,
  AlertCircle,
  Clock,
  Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteEditorProps {
  note: Note;
  onClose: () => void;
  onUpdate: (id: number, updates: Partial<Note>) => void;
  onDelete: (id: number) => void;
}

const colorMap = {
  yellow: "bg-note-yellow",
  green: "bg-note-green",
  blue: "bg-note-blue",
  pink: "bg-note-pink",
  purple: "bg-note-purple",
  orange: "bg-note-orange",
};

export function NoteEditor({ note, onClose, onUpdate, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");
  const [newTag, setNewTag] = useState("");

  // Sync with note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || "");
  }, [note.id, note.title, note.content]);

  // Debounced save for title and content
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title !== note.title || content !== (note.content || "")) {
        onUpdate(note.id, { title, content });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [title, content, note.id, note.title, note.content, onUpdate]);

  const handleColorChange = (color: NoteColor) => {
    onUpdate(note.id, { color });
  };

  const handleImportantToggle = () => {
    onUpdate(note.id, { isImportant: !note.isImportant });
  };

  const handleUrgentToggle = () => {
    onUpdate(note.id, { isUrgent: !note.isUrgent });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !note.tags?.includes(newTag.trim())) {
      const updatedTags = [...(note.tags || []), newTag.trim()];
      onUpdate(note.id, { tags: updatedTags });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = note.tags?.filter((tag) => tag !== tagToRemove) || [];
    onUpdate(note.id, { tags: updatedTags });
  };

  const handleDelete = () => {
    onDelete(note.id);
    onClose();
  };

  const quadrant = getQuadrant(note);
  const quadrantInfo = quadrantConfig[quadrant];

  const timeAgo = formatDistanceToNow(new Date(note.updatedAt), {
    addSuffix: true,
    locale: zhCN,
  });

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full rounded-2xl shadow-2xl overflow-hidden transition-colors duration-500",
        colorMap[note.color]
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-black/5 bg-white/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-foreground/60">
            <Clock className="h-3 w-3" />
            <span>编辑于 {timeAgo}</span>
          </div>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium border",
              quadrantInfo.color,
              quadrantInfo.textColor
            )}
          >
            {quadrantInfo.icon} {quadrantInfo.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Color Picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-black/5"
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border border-black/10",
                    colorMap[note.color]
                  )}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-panel border-none p-2"
            >
              <div className="grid grid-cols-3 gap-2">
                {noteColors.map((c) => (
                  <button
                    key={c.value}
                    className={cn(
                      "w-8 h-8 rounded-full border border-black/10 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50",
                      c.class,
                      note.color === c.value &&
                        "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => handleColorChange(c.value)}
                    title={c.label}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
            onClick={handleDelete}
            title="删除便签"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-black/5"
            onClick={onClose}
          >
            <X className="h-5 w-5 text-foreground/70" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题"
          className="w-full bg-transparent border-none text-2xl font-bold placeholder:text-foreground/30 focus:outline-none mb-4 text-foreground/90"
        />

        {/* Priority Toggles */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleImportantToggle}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
              note.isImportant
                ? "border-red-500 bg-red-500/10 text-red-600"
                : "border-black/10 hover:border-red-500/50 text-foreground/60 hover:text-red-500"
            )}
          >
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">重要</span>
            {note.isImportant && <Check className="h-4 w-4" />}
          </button>
          <button
            onClick={handleUrgentToggle}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
              note.isUrgent
                ? "border-orange-500 bg-orange-500/10 text-orange-600"
                : "border-black/10 hover:border-orange-500/50 text-foreground/60 hover:text-orange-500"
            )}
          >
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">紧急</span>
            {note.isUrgent && <Check className="h-4 w-4" />}
          </button>
        </div>

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="开始输入..."
          className="w-full min-h-[300px] bg-transparent border-none resize-none text-lg leading-relaxed placeholder:text-foreground/30 focus:outline-none text-foreground/80 font-sans"
        />

        {/* Tags Section */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-black/5">
          <Tag className="h-4 w-4 text-foreground/50" />
          {note.tags?.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-black/5 hover:bg-black/10 text-foreground/70 gap-1 pr-1"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-primary px-2"
              >
                <Plus className="h-3 w-3 mr-1" /> 添加标签
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="新标签..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                />
                <Button
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleAddTag}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </ScrollArea>
    </div>
  );
}
