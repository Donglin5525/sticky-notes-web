import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoteCard } from "@/components/NoteCard";
import { NoteEditor } from "@/components/NoteEditor";
import { QuadrantView } from "@/components/QuadrantView";
import { Note, NoteColor, noteColors, getQuadrant, quadrantConfig } from "@/types/note";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Grid3X3,
  List,
  Trash2,
  Tag,
  StickyNote,
  LogOut,
  User,
  Loader2,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TagTree } from "@/components/TagTree";

type ViewMode = "list" | "quadrant";

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColor, setFilterColor] = useState<NoteColor | "all">("all");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showTrash, setShowTrash] = useState(false);

  // tRPC queries
  const utils = trpc.useUtils();
  const { data: notes = [], isLoading: notesLoading } = trpc.notes.list.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: trashedNotes = [] } = trpc.notes.trash.useQuery(undefined, {
    enabled: !!user && showTrash,
  });

  // tRPC mutations
  const createNoteMutation = trpc.notes.create.useMutation({
    onSuccess: (newNote: Note) => {
      utils.notes.list.invalidate();
      setSelectedNoteId(newNote.id);
      toast.success("便签创建成功");
    },
    onError: () => toast.error("创建失败，请重试"),
  });

  const updateNoteMutation = trpc.notes.update.useMutation({
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await utils.notes.list.cancel();
      
      // Snapshot previous value
      const previousNotes = utils.notes.list.getData();
      
      // Optimistically update
      utils.notes.list.setData(undefined, (old) => {
        if (!old) return old;
        return old.map((note: Note) => 
          note.id === newData.id ? { ...note, ...newData, updatedAt: Date.now() } : note
        );
      });
      
      return { previousNotes };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        utils.notes.list.setData(undefined, context.previousNotes);
      }
      toast.error("保存失败，请重试");
    },
    onSettled: () => {
      // Always refetch after error or success
      utils.notes.list.invalidate();
    },
  });

  const deleteNoteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      utils.notes.trash.invalidate();
      setSelectedNoteId(null);
      toast.success("便签已移至回收站");
    },
    onError: () => toast.error("删除失败，请重试"),
  });

  const restoreNoteMutation = trpc.notes.restore.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      utils.notes.trash.invalidate();
      toast.success("便签已恢复");
    },
    onError: () => toast.error("恢复失败，请重试"),
  });

  const permanentDeleteMutation = trpc.notes.permanentDelete.useMutation({
    onSuccess: () => {
      utils.notes.trash.invalidate();
      toast.success("便签已永久删除");
    },
    onError: () => toast.error("删除失败，请重试"),
  });

  const emptyTrashMutation = trpc.notes.emptyTrash.useMutation({
    onSuccess: () => {
      utils.notes.trash.invalidate();
      toast.success("回收站已清空");
    },
    onError: () => toast.error("清空失败，请重试"),
  });

  // Tag management mutations
  const renameTagMutation = trpc.tags.rename.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      toast.success("标签已重命名");
    },
    onError: () => toast.error("重命名失败，请重试"),
  });

  const deleteTagMutation = trpc.tags.delete.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      setFilterTag(null);
      toast.success("标签已删除");
    },
    onError: () => toast.error("删除失败，请重试"),
  });

  const moveTagMutation = trpc.tags.move.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      toast.success("标签已移动");
    },
    onError: () => toast.error("移动失败，请重试"),
  });

  // Filter notes
  const filteredNotes = useMemo(() => {
    let result = notes;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (note: Note) =>
          note.title.toLowerCase().includes(query) ||
          (note.content?.toLowerCase().includes(query) ?? false)
      );
    }

    if (filterColor !== "all") {
      result = result.filter((note: Note) => note.color === filterColor);
    }

    if (filterTag) {
      result = result.filter((note: Note) => note.tags?.includes(filterTag));
    }

    return result;
  }, [notes, searchQuery, filterColor, filterTag]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((note: Note) => note.tags?.forEach((tag: string) => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [notes]);

  // Selected note
  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return notes.find((n: Note) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  // Close editor handler
  const closeEditor = useCallback(() => {
    setSelectedNoteId(null);
  }, []);

  // ESC key listener to close editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedNoteId) {
        closeEditor();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNoteId, closeEditor]);

  // Handlers
  const handleCreateNote = () => {
    createNoteMutation.mutate({
      color: filterColor !== "all" ? filterColor : "yellow",
      tags: filterTag ? [filterTag] : undefined,
    });
  };

  const handleUpdateNote = (id: number, updates: Partial<Note>) => {
    const { userId, createdAt, updatedAt, isDeleted, sortOrder, ...validUpdates } = updates as any;
    updateNoteMutation.mutate({ 
      id, 
      ...validUpdates,
      content: validUpdates.content ?? undefined,
    });
  };

  const handleDeleteNote = (id: number) => {
    deleteNoteMutation.mutate({ id });
  };

  const handleRestoreNote = (id: number) => {
    restoreNoteMutation.mutate({ id });
  };

  const handlePermanentDelete = (id: number) => {
    permanentDeleteMutation.mutate({ id });
  };

  // Toggle note completion (move to/from "eliminate" quadrant)
  const handleToggleComplete = (note: Note) => {
    const isCurrentlyCompleted = !note.isImportant && !note.isUrgent;
    if (isCurrentlyCompleted) {
      // Move back to "do-first" (important and urgent)
      handleUpdateNote(note.id, { isImportant: true, isUrgent: true });
    } else {
      // Move to "eliminate" (not important, not urgent)
      handleUpdateNote(note.id, { isImportant: false, isUrgent: false });
    }
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full glass rounded-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <StickyNote className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center">
              便签笔记
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              使用四象限法则管理您的任务和想法，提高工作效率
            </p>
          </div>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            登录开始使用
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-sidebar/50 backdrop-blur-xl flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <StickyNote className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">便签笔记</h1>
              <p className="text-xs text-muted-foreground">四象限管理</p>
            </div>
          </div>
        </div>

        {/* New Note Button */}
        <div className="p-4">
          <Button
            onClick={handleCreateNote}
            className="w-full gap-2 shadow-md"
            disabled={createNoteMutation.isPending}
          >
            {createNoteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            新建便签
          </Button>
        </div>

        {/* Filters */}
        <ScrollArea className="flex-1 px-4">
          {/* View Mode */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              视图模式
            </h3>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-1"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
                列表
              </Button>
              <Button
                variant={viewMode === "quadrant" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-1"
                onClick={() => setViewMode("quadrant")}
              >
                <Grid3X3 className="h-4 w-4" />
                四象限
              </Button>
            </div>
          </div>

          {/* Color Filter */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              颜色筛选
            </h3>
            <div className="grid grid-cols-5 gap-3 max-w-[200px]">
              <button
                onClick={() => setFilterColor("all")}
                className={cn(
                  "w-8 h-8 rounded-full transition-all hover:scale-110",
                  "bg-gradient-to-br from-note-yellow via-note-pink to-note-blue",
                  filterColor === "all"
                    ? "shadow-[0_0_0_3px_white,0_0_0_5px_hsl(var(--primary))]"
                    : ""
                )}
                title="全部颜色"
              />
              {noteColors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setFilterColor(c.value)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all hover:scale-110",
                    c.class,
                    filterColor === c.value
                      ? "shadow-[0_0_0_3px_white,0_0_0_5px_hsl(var(--primary))]"
                      : ""
                  )}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                标签
              </h3>
              <TagTree
                tags={allTags}
                selectedTag={filterTag}
                onSelectTag={setFilterTag}
                onRenameTag={(oldTag, newTag) => renameTagMutation.mutate({ oldTag, newTag })}
                onDeleteTag={(tag) => deleteTagMutation.mutate({ tag })}
                onMoveTag={(tag, newParent) => moveTagMutation.mutate({ tag, newParent })}
              />
            </div>
          )}

          {/* Trash */}
          <div className="mb-6">
            <Button
              variant={showTrash ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => {
                setShowTrash(!showTrash);
                setSelectedNoteId(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
              回收站
              {trashedNotes.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {trashedNotes.length}
                </Badge>
              )}
            </Button>
          </div>
        </ScrollArea>

        {/* User Menu */}
        <div className="p-4 border-t border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent/50 transition-colors">
                <Avatar className="h-9 w-9 border">
                  <AvatarFallback className="text-xs font-medium">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || "用户"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email || ""}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" />
                个人设置
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border/50 bg-background/50 backdrop-blur-xl flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">
              {showTrash ? "回收站" : "所有便签"}
            </h2>
            <Badge variant="secondary">
              {showTrash ? trashedNotes.length : filteredNotes.length} 项
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索便签..."
                className="pl-9 w-64 bg-white/50"
              />
            </div>

            {/* Empty Trash */}
            {showTrash && trashedNotes.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => emptyTrashMutation.mutate()}
                disabled={emptyTrashMutation.isPending}
              >
                {emptyTrashMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                清空回收站
              </Button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Notes List/Grid */}
          <div className={cn("flex-1 overflow-hidden", selectedNote && "hidden lg:block lg:w-1/2")}>
            {notesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : showTrash ? (
              // Trash View
              <ScrollArea className="h-full p-6">
                {trashedNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Trash2 className="h-12 w-12 mb-4 opacity-50" />
                    <p>回收站为空</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {trashedNotes.map((note: Note) => (
                      <NoteCard
                        key={note.id}
                        note={note as Note}
                        onRestore={handleRestoreNote}
                        onPermanentDelete={handlePermanentDelete}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            ) : viewMode === "quadrant" ? (
              // Quadrant View
              <QuadrantView
                notes={filteredNotes as Note[]}
                selectedNoteId={selectedNoteId}
                onNoteClick={(note) => setSelectedNoteId(note.id)}
                onToggleComplete={handleToggleComplete}
              />
            ) : (
              // List View
              <ScrollArea className="h-full p-6">
                {filteredNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <StickyNote className="h-12 w-12 mb-4 opacity-50" />
                    <p>暂无便签</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleCreateNote}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      创建第一个便签
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-w-3xl">
                    {filteredNotes.map((note: Note) => (
                      <NoteCard
                        key={note.id}
                        note={note as Note}
                        onClick={() => setSelectedNoteId(note.id)}
                        isSelected={selectedNoteId === note.id}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>

          {/* Editor Panel with Overlay */}
          {selectedNote && !showTrash && (
            <>
              {/* Overlay to close editor when clicking outside - visible on all screens */}
              <div 
                className="fixed inset-0 bg-black/10 lg:bg-transparent z-40 lg:absolute lg:inset-auto lg:left-0 lg:top-0 lg:right-1/2 lg:bottom-0"
                onClick={closeEditor}
              />
              <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] lg:relative lg:w-1/2 border-l border-border/50 bg-background z-50 lg:z-auto shadow-2xl lg:shadow-none">
                <NoteEditor
                  note={selectedNote as Note}
                  onClose={closeEditor}
                  onUpdate={handleUpdateNote}
                  onDelete={handleDeleteNote}
                  allTags={allTags}
                  onTagClick={(tag) => {
                    setFilterTag(tag);
                    closeEditor();
                  }}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
