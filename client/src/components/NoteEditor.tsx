import { useState, useEffect, useCallback, useRef } from "react";
import { Note, NoteColor, noteColors, quadrantConfig, getQuadrant } from "@/types/note";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import {
  X,
  Trash2,
  Tag,
  Plus,
  AlertCircle,
  Clock,
  Check,
  Palette,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/dateUtils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { WysiwygEditor, WysiwygEditorRef } from "./WysiwygEditor";
import { TagSelector } from "./TagSelector";

interface NoteEditorProps {
  note: Note;
  onClose: () => void;
  onUpdate: (id: number, updates: Partial<Note>) => void;
  onDelete: (id: number) => void;
  allTags?: string[];
  onTagClick?: (tag: string) => void;
}

// 顶部装饰条颜色
const colorBarMap = {
  yellow: "bg-amber-400",
  green: "bg-emerald-400",
  blue: "bg-sky-400",
  pink: "bg-pink-400",
  purple: "bg-violet-400",
  orange: "bg-orange-400",
};

// 颜色选择器样式
const colorPickerMap = {
  yellow: "bg-amber-400",
  green: "bg-emerald-400",
  blue: "bg-sky-400",
  pink: "bg-pink-400",
  purple: "bg-violet-400",
  orange: "bg-orange-400",
};

export function NoteEditor({ note, onClose, onUpdate, onDelete, allTags = [], onTagClick }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");
  const [newTag, setNewTag] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [tagSelectorOpen, setTagSelectorOpen] = useState(false);
  const editorRef = useRef<WysiwygEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image upload mutation
  const uploadImageMutation = trpc.notes.uploadImage.useMutation({
    onError: () => toast.error("图片上传失败，请重试"),
  });

  // Sync with note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || "");
  }, [note.id, note.title, note.content]);

  // Auto focus editor for new notes
  useEffect(() => {
    if (!note.title && !note.content) {
      setTimeout(() => {
        editorRef.current?.focus();
      }, 100);
    }
  }, [note.id]);

  // Debounced save for title and content
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title !== note.title || content !== (note.content || "")) {
        onUpdate(note.id, { title, content });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [title, content, note.id, note.title, note.content, onUpdate]);

  // Handle image upload (for both paste and file input)
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return "";
    }

    setIsUploading(true);
    try {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            const result = await uploadImageMutation.mutateAsync({
              base64,
              filename: file.name || "pasted-image.png",
              contentType: file.type,
            });
            toast.success("图片上传成功");
            resolve(result.url);
          } catch (error) {
            console.error("Image upload failed:", error);
            resolve("");
          } finally {
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error("Image upload failed:", error);
      setIsUploading(false);
      return "";
    }
  }, [uploadImageMutation]);

  // Handle file input for image upload
  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await handleImageUpload(file);
    if (url && editorRef.current) {
      editorRef.current.insertImage(url, file.name);
    }
    e.target.value = "";
  }, [handleImageUpload]);

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

  const handleToggleTag = (tag: string) => {
    const currentTags = note.tags || [];
    if (currentTags.includes(tag)) {
      // Remove tag
      onUpdate(note.id, { tags: currentTags.filter((t) => t !== tag) });
    } else {
      // Add tag
      onUpdate(note.id, { tags: [...currentTags, tag] });
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

  // 提取内容中的 #标签
  const extractTagsFromContent = useCallback((text: string): string[] => {
    // 匹配 #标签 格式，支持中文、英文、数字、下划线、斜杠（用于层级标签）
    const tagRegex = /#([\u4e00-\u9fa5a-zA-Z0-9_\/]+)/g;
    const tags = new Set<string>();
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      const tag = match[1].trim();
      if (tag && tag.length > 0) {
        tags.add(tag);
      }
    }
    return Array.from(tags);
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    
    // 自动提取内容中的标签并添加到标签列表
    const contentTags = extractTagsFromContent(newContent);
    const currentTags = note.tags || [];
    
    // 找出内容中新出现的标签（不在当前标签列表中的）
    const newTags = contentTags.filter(tag => !currentTags.includes(tag));
    
    // 如果有新标签，添加到标签列表
    if (newTags.length > 0) {
      const updatedTags = [...currentTags, ...newTags];
      onUpdate(note.id, { tags: updatedTags });
    }
  }, [extractTagsFromContent, note.tags, note.id, onUpdate]);

  // Handle tag click from editor content
  const handleEditorTagClick = useCallback((tag: string) => {
    if (onTagClick) {
      onTagClick(tag);
      onClose();
    }
  }, [onTagClick, onClose]);

  const quadrant = getQuadrant(note);
  const quadrantInfo = quadrantConfig[quadrant];

  const timeAgo = formatRelativeTime(note.updatedAt);

  return (
    <div className="flex flex-col h-full w-full bg-white md:rounded-2xl shadow-xl overflow-hidden md:border border-gray-200">
      {/* 顶部颜色装饰条 */}
      <div className={cn("h-1.5 md:h-2 w-full", colorBarMap[note.color])} />
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>编辑于 {timeAgo}</span>
          </div>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              quadrantInfo.color,
              quadrantInfo.textColor
            )}
          >
            {quadrantInfo.icon} {quadrantInfo.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Image Upload */}
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
              disabled={isUploading}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-100"
              title="上传图片"
              asChild
            >
              <span>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-gray-500" />
                )}
              </span>
            </Button>
          </label>

          {/* Color Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-100"
                title="选择颜色"
              >
                <Palette className="h-4 w-4 text-gray-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-3">
              <p className="text-xs text-gray-500 mb-2">选择便签颜色</p>
              <div className="flex gap-2">
                {noteColors.map((c) => (
                  <button
                    key={c.value}
                    className={cn(
                      "w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none",
                      colorPickerMap[c.value],
                      note.color === c.value && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => handleColorChange(c.value)}
                    title={c.label}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-red-50 text-gray-500 hover:text-red-500"
            onClick={handleDelete}
            title="删除便签"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 md:px-4 pt-3 md:pt-4 pb-2">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题"
            className="w-full bg-transparent border-none text-lg md:text-xl font-bold placeholder:text-gray-300 focus:outline-none mb-3 text-gray-800"
          />

          {/* Priority Toggles */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={handleImportantToggle}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-all text-sm",
                note.isImportant
                  ? "border-red-400 bg-red-50 text-red-600"
                  : "border-gray-200 hover:border-red-300 text-gray-500 hover:text-red-500"
              )}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="font-medium">重要</span>
              {note.isImportant && <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={handleUrgentToggle}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-all text-sm",
                note.isUrgent
                  ? "border-orange-400 bg-orange-50 text-orange-600"
                  : "border-gray-200 hover:border-orange-300 text-gray-500 hover:text-orange-500"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">紧急</span>
              {note.isUrgent && <Check className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* WYSIWYG Editor */}
        <div className="flex-1 overflow-auto px-3 md:px-4 pb-2">
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white min-h-[200px]">
            <WysiwygEditor
              ref={editorRef}
              content={content}
              onChange={handleContentChange}
              onImageUpload={handleImageUpload}
              onTagClick={handleEditorTagClick}
              allTags={allTags}
              placeholder="支持 Markdown 语法，输入 - 空格 创建列表，输入 # 插入标签..."
              className="min-h-[200px]"
            />
          </div>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-3 border-t border-gray-100 bg-gray-50/30">
          {/* Tag Selector Button */}
          <Popover open={tagSelectorOpen} onOpenChange={setTagSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 hover:bg-gray-100",
                  tagSelectorOpen && "bg-primary/10 text-primary"
                )}
                title="选择标签"
              >
                <Tag className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0">
              <div className="p-2 border-b">
                <p className="text-sm font-medium">选择已有标签</p>
              </div>
              <TagSelector
                allTags={allTags}
                selectedTags={note.tags || []}
                onToggleTag={handleToggleTag}
              />
            </PopoverContent>
          </Popover>

          {/* Current Tags */}
          {note.tags?.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 gap-1 pr-1 cursor-pointer"
              onClick={() => onTagClick?.(tag)}
            >
              {tag}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="hover:text-red-500 ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {/* Add New Tag */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-gray-400 hover:text-primary px-2"
              >
                <Plus className="h-3 w-3 mr-1" /> 添加标签
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="新标签（如：工作/项目A）"
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
              <p className="text-xs text-gray-400 mt-2">
                支持层级标签，用 / 分隔
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
