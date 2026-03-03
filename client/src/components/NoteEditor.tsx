import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
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
  Save,
  XCircle,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/dateUtils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { WysiwygEditor, WysiwygEditorRef } from "./WysiwygEditor";
import { TagSelector } from "./TagSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

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

export interface NoteEditorRef {
  save: () => void;
}

export const NoteEditor = forwardRef<NoteEditorRef, NoteEditorProps>(({ note, onClose, onUpdate, onDelete, allTags = [], onTagClick }, forwardedRef) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || "");
  const [newTag, setNewTag] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [tagSelectorOpen, setTagSelectorOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const editorRef = useRef<WysiwygEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 记录初始值，用于判断是否有修改
  const initialTitleRef = useRef(note.title);
  const initialContentRef = useRef(note.content || "");

  // 提取内容中已确认的 #标签（标签后面必须跟空格、换行或位于行尾才算确认）
  const extractConfirmedTags = useCallback((text: string): string[] => {
    const tagRegex = /#([\u4e00-\u9fa5a-zA-Z0-9_\/]+)(?=[\s\n]|$)/gm;
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

  // Image upload mutation
  const uploadImageMutation = trpc.notes.uploadImage.useMutation({
    onError: () => toast.error("图片上传失败，请重试"),
  });

  // Sync with note changes (when switching notes)
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || "");
    initialTitleRef.current = note.title;
    initialContentRef.current = note.content || "";
  }, [note.id, note.title, note.content]);

  // Auto focus editor for new notes
  useEffect(() => {
    if (!note.title && !note.content) {
      setTimeout(() => {
        editorRef.current?.focus();
      }, 100);
    }
  }, [note.id]);

  // 判断是否有未保存的修改
  const hasUnsavedChanges = useCallback(() => {
    return title !== initialTitleRef.current || content !== initialContentRef.current;
  }, [title, content]);

  // ── 暴露 save 方法给外部 ref ─────────────────────────────────────────────
  useImperativeHandle(forwardedRef, () => ({
    save: () => {
      // 只有有内容时才保存
      if (title.trim() || content.trim()) {
        const confirmedTags = extractConfirmedTags(content);
        const currentTags = note.tags || [];
        const newTags = confirmedTags.filter(tag => !currentTags.includes(tag));
        const updates: Partial<Note> = { title, content };
        if (newTags.length > 0) {
          updates.tags = [...currentTags, ...newTags];
        }
        onUpdate(note.id, updates);
        initialTitleRef.current = title;
        initialContentRef.current = content;
      }
    },
  }), [title, content, note.id, note.tags, onUpdate, extractConfirmedTags]);

  // ── 保存逻辑 ──────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    // 提取内容中已确认的标签
    const confirmedTags = extractConfirmedTags(content);
    const currentTags = note.tags || [];
    const newTags = confirmedTags.filter(tag => !currentTags.includes(tag));

    const updates: Partial<Note> = { title, content };
    if (newTags.length > 0) {
      updates.tags = [...currentTags, ...newTags];
    }

    onUpdate(note.id, updates);

    // 更新初始值引用，保存后不再视为"有修改"
    initialTitleRef.current = title;
    initialContentRef.current = content;

    toast.success("便签已保存");
  }, [title, content, note.id, note.tags, onUpdate, extractConfirmedTags]);

  // ── 取消逻辑 ──────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const confirmCancel = useCallback(() => {
    // 恢复到初始值，不保存
    setTitle(initialTitleRef.current);
    setContent(initialContentRef.current);
    setShowCancelConfirm(false);
    onClose();
  }, [onClose]);

  // ── 键盘快捷键 ─────────────────────────────────────────────────────────────
  // Note: Ctrl+Enter is handled inside WysiwygEditor (TipTap level) to prevent newline.
  // ESC is handled here at window level for the overall editor panel.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC → 取消（WysiwygEditor 内部的 ESC 用于关闭标签建议，不会冒泡到这里）
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        handleCancel();
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCancel]);

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
      onUpdate(note.id, { tags: currentTags.filter((t) => t !== tag) });
    } else {
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

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

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
  const isDirty = hasUnsavedChanges();

  return (
    <>
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
            {isDirty && (
              <span className="text-xs text-amber-500 font-medium">● 未保存</span>
            )}
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
              onClick={handleCancel}
              title="关闭 (ESC)"
            >
              <X className="h-4 w-4" />
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
                onSave={handleSave}
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

          {/* ── 保存 / 取消 操作栏 ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500 font-mono text-[10px]">Ctrl</kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500 font-mono text-[10px]">Enter</kbd>
              <span className="ml-1.5">保存</span>
              <span className="mx-2 text-gray-300">|</span>
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500 font-mono text-[10px]">ESC</kbd>
              <span className="ml-1.5">取消</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="h-8 text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="h-8 shadow-sm"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                保存
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 取消确认弹窗 ──────────────────────────────────────────────────── */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放弃编辑？</AlertDialogTitle>
            <AlertDialogDescription>
              当前便签有未保存的修改，确定要放弃这些更改吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              放弃修改
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
