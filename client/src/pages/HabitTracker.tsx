import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Archive,
  Trash2,
  Edit3,
  RotateCcw,
  GripVertical,
  TrendingUp,
  Hash,
  BarChart3,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

// ==================== Types ====================
type HabitWithStats = {
  id: number;
  userId: number;
  name: string;
  type: "count" | "value";
  unit: string;
  sortOrder: number;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: number;
  todayCount: number;
  todaySum: number;
  latestRecord: {
    id: number;
    habitId: number;
    value: string;
    note: string | null;
    timestamp: number;
    createdAt: number;
  } | null;
  previousRecord: {
    id: number;
    habitId: number;
    value: string;
    note: string | null;
    timestamp: number;
    createdAt: number;
  } | null;
};

// ==================== Tab Types ====================
type TabType = "dashboard" | "analytics" | "archive";

// ==================== Main Component ====================
export default function HabitTracker() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRecordSheet, setShowRecordSheet] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStats | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // ==================== Queries ====================
  const habitsQuery = trpc.habits.list.useQuery(undefined, { enabled: !!user });
  const archivedQuery = trpc.habits.archived.useQuery(undefined, { enabled: !!user && activeTab === "archive" });
  const utils = trpc.useUtils();

  // ==================== Mutations ====================
  const createMutation = trpc.habits.create.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      toast.success("习惯创建成功");
    },
    onError: () => toast.error("创建失败"),
  });

  const updateMutation = trpc.habits.update.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      toast.success("已更新");
    },
    onError: () => toast.error("更新失败"),
  });

  const archiveMutation = trpc.habits.archive.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      utils.habits.archived.invalidate();
      toast.success("已归档");
    },
    onError: () => toast.error("归档失败"),
  });

  const restoreMutation = trpc.habits.restore.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      utils.habits.archived.invalidate();
      toast.success("已恢复");
    },
    onError: () => toast.error("恢复失败"),
  });

  const deleteMutation = trpc.habits.delete.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      utils.habits.archived.invalidate();
      toast.success("已删除");
    },
    onError: () => toast.error("删除失败"),
  });

  const permanentDeleteMutation = trpc.habits.permanentDelete.useMutation({
    onSuccess: () => {
      utils.habits.archived.invalidate();
      toast.success("已彻底删除");
    },
    onError: () => toast.error("删除失败"),
  });

  const quickRecordMutation = trpc.habits.quickRecord.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
    },
    onError: () => toast.error("记录失败"),
  });

  const addRecordMutation = trpc.habits.addRecord.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      setShowRecordSheet(false);
      toast.success("记录已保存");
    },
    onError: () => toast.error("保存失败"),
  });

  const sortMutation = trpc.habits.updateSortOrders.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
    },
  });

  // ==================== Drag & Drop ====================
  const handleDragStart = useCallback((habitId: number) => {
    setDraggedId(habitId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, habitId: number) => {
    e.preventDefault();
    setDragOverId(habitId);
  }, []);

  const handleDrop = useCallback(
    (targetId: number) => {
      if (!draggedId || draggedId === targetId || !habitsQuery.data) return;

      const items = [...habitsQuery.data];
      const dragIndex = items.findIndex((h) => h.id === draggedId);
      const dropIndex = items.findIndex((h) => h.id === targetId);

      if (dragIndex === -1 || dropIndex === -1) return;

      const [moved] = items.splice(dragIndex, 1);
      items.splice(dropIndex, 0, moved);

      const orders = items.map((h, i) => ({ id: h.id, sortOrder: i }));
      sortMutation.mutate({ orders });

      setDraggedId(null);
      setDragOverId(null);
    },
    [draggedId, habitsQuery.data, sortMutation]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  // ==================== Handlers ====================
  const handleQuickRecord = useCallback(
    (habitId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      quickRecordMutation.mutate({ habitId });
    },
    [quickRecordMutation]
  );

  const handleCardClick = useCallback((habit: HabitWithStats) => {
    setSelectedHabit(habit);
    setShowRecordSheet(true);
  }, []);

  const handleArchive = useCallback(
    (habit: HabitWithStats, e: React.MouseEvent) => {
      e.stopPropagation();
      archiveMutation.mutate({ id: habit.id });
    },
    [archiveMutation]
  );

  const handleDelete = useCallback(
    (habit: HabitWithStats, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedHabit(habit);
      setShowDeleteAlert(true);
    },
    []
  );

  const handleEdit = useCallback(
    (habit: HabitWithStats, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedHabit(habit);
      setShowEditDialog(true);
    },
    []
  );

  // ==================== Format date ====================
  const formatDate = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
    return `${year}年${month}月${day}日 周${weekDays[now.getDay()]}`;
  }, []);

  // ==================== Render ====================
  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F9FAFB] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">习惯打卡</h1>
          <p className="text-sm text-gray-400 mt-0.5">{formatDate()}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === "dashboard"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              打卡
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === "analytics"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <span className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                统计
              </span>
            </button>
            <button
              onClick={() => setActiveTab("archive")}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === "archive"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5" />
                归档
              </span>
            </button>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="rounded-xl shadow-sm"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            新增习惯
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === "dashboard" && (
          <DashboardView
            habits={habitsQuery.data || []}
            isLoading={habitsQuery.isLoading}
            onQuickRecord={handleQuickRecord}
            onCardClick={handleCardClick}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            draggedId={draggedId}
            dragOverId={dragOverId}
          />
        )}
        {activeTab === "analytics" && (
          <AnalyticsView habits={habitsQuery.data || []} />
        )}
        {activeTab === "archive" && (
          <ArchiveView
            habits={archivedQuery.data || []}
            isLoading={archivedQuery.isLoading}
            onRestore={(id) => restoreMutation.mutate({ id })}
            onPermanentDelete={(id) => permanentDeleteMutation.mutate({ id })}
          />
        )}
      </div>

      {/* Dialogs */}
      <AddHabitDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={(name, type, unit) => {
          createMutation.mutate({ name, type, unit });
          setShowAddDialog(false);
        }}
      />

      <EditHabitDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        habit={selectedHabit}
        onSubmit={(id, name, type, unit) => {
          updateMutation.mutate({ id, name, type, unit });
          setShowEditDialog(false);
        }}
      />

      <RecordSheet
        open={showRecordSheet}
        onOpenChange={setShowRecordSheet}
        habit={selectedHabit}
        onSubmit={(data) => {
          addRecordMutation.mutate(data);
        }}
        isSubmitting={addRecordMutation.isPending}
      />

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              确认删除
            </AlertDialogTitle>
            <AlertDialogDescription>
              删除后习惯将移至归档区，您可以在归档中恢复或彻底删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">取消</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (selectedHabit) deleteMutation.mutate({ id: selectedHabit.id });
                setShowDeleteAlert(false);
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== Dashboard View ====================
function DashboardView({
  habits,
  isLoading,
  onQuickRecord,
  onCardClick,
  onArchive,
  onDelete,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedId,
  dragOverId,
}: {
  habits: HabitWithStats[];
  isLoading: boolean;
  onQuickRecord: (id: number, e: React.MouseEvent) => void;
  onCardClick: (habit: HabitWithStats) => void;
  onArchive: (habit: HabitWithStats, e: React.MouseEvent) => void;
  onDelete: (habit: HabitWithStats, e: React.MouseEvent) => void;
  onEdit: (habit: HabitWithStats, e: React.MouseEvent) => void;
  onDragStart: (id: number) => void;
  onDragOver: (e: React.DragEvent, id: number) => void;
  onDrop: (id: number) => void;
  onDragEnd: () => void;
  draggedId: number | null;
  dragOverId: number | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Target className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">还没有习惯</p>
        <p className="text-sm mt-1">点击右上角「新增习惯」开始追踪</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          onQuickRecord={onQuickRecord}
          onClick={() => onCardClick(habit)}
          onArchive={(e) => onArchive(habit, e)}
          onDelete={(e) => onDelete(habit, e)}
          onEdit={(e) => onEdit(habit, e)}
          isDragging={draggedId === habit.id}
          isDragOver={dragOverId === habit.id}
          onDragStart={() => onDragStart(habit.id)}
          onDragOver={(e) => onDragOver(e, habit.id)}
          onDrop={() => onDrop(habit.id)}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}

// ==================== Habit Card ====================
function HabitCard({
  habit,
  onQuickRecord,
  onClick,
  onArchive,
  onDelete,
  onEdit,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  habit: HabitWithStats;
  onQuickRecord: (id: number, e: React.MouseEvent) => void;
  onClick: () => void;
  onArchive: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const isCount = habit.type === "count";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group bg-white rounded-2xl p-5 cursor-pointer transition-all duration-200",
        "border border-gray-100 hover:border-gray-200",
        "shadow-sm hover:shadow-md",
        isDragging && "opacity-40 scale-95",
        isDragOver && "border-blue-300 bg-blue-50/30 scale-[1.02]"
      )}
    >
      {/* Top Row: Name + Menu */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 opacity-30 hover:opacity-60 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              isCount ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500"
            )}
          >
            {isCount ? <Hash className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 text-sm">{habit.name}</h3>
            <p className="text-xs text-gray-400">{isCount ? "记次数" : "记数值"}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity hover:bg-gray-100">
              <MoreHorizontal className="h-4 w-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl w-40">
            <DropdownMenuItem onClick={(e) => onEdit(e as unknown as React.MouseEvent)} className="rounded-lg">
              <Edit3 className="h-4 w-4 mr-2" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => onArchive(e as unknown as React.MouseEvent)} className="rounded-lg">
              <Archive className="h-4 w-4 mr-2" />
              归档
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => onDelete(e as unknown as React.MouseEvent)}
              className="rounded-lg text-red-500 focus:text-red-500"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            {isCount ? habit.todayCount : habit.latestRecord ? habit.latestRecord.value : "—"}
            {habit.unit && (
              <span className="text-sm font-normal text-gray-400 ml-1">{habit.unit}</span>
            )}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {isCount ? (
              <p className="text-xs text-gray-400">今日次数</p>
            ) : habit.latestRecord && habit.previousRecord ? (() => {
              const current = parseFloat(habit.latestRecord.value);
              const prev = parseFloat(habit.previousRecord.value);
              const diff = current - prev;
              if (diff > 0) return (
                <span className="flex items-center gap-0.5 text-xs text-red-500">
                  <ArrowUp className="h-3 w-3" />
                  +{diff.toFixed(1)}
                </span>
              );
              if (diff < 0) return (
                <span className="flex items-center gap-0.5 text-xs text-emerald-500">
                  <ArrowDown className="h-3 w-3" />
                  {diff.toFixed(1)}
                </span>
              );
              return (
                <span className="flex items-center gap-0.5 text-xs text-gray-400">
                  <Minus className="h-3 w-3" />
                  持平
                </span>
              );
            })() : (
              <p className="text-xs text-gray-400">{habit.latestRecord ? "最新记录" : "暂无记录"}</p>
            )}
          </div>
        </div>

        {isCount && (
          <button
            onClick={(e) => onQuickRecord(habit.id, e)}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              "bg-blue-500 text-white shadow-sm",
              "hover:bg-blue-600 hover:shadow-md active:scale-95",
              "transition-all duration-150"
            )}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}

        {!isCount && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className={cn(
              "flex items-center gap-1 px-3 py-2 rounded-xl text-sm",
              "bg-emerald-50 text-emerald-600",
              "hover:bg-emerald-100 active:scale-95",
              "transition-all duration-150"
            )}
          >
            记录
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ==================== Add Habit Dialog ====================
function AddHabitDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, type: "count" | "value", unit: string) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"count" | "value">("count");
  const [unit, setUnit] = useState("");

  // Auto-set default unit when type changes
  useEffect(() => {
    if (type === "count") {
      setUnit("次");
    } else {
      setUnit("");
    }
  }, [type]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("请输入习惯名称");
      return;
    }
    onSubmit(name.trim(), type, unit.trim());
    setName("");
    setType("count");
    setUnit("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>新增习惯</DialogTitle>
          <DialogDescription>创建一个新的习惯来追踪</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">习惯名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：抽烟、体重、跑步..."
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">习惯类型</label>
            <Select value={type} onValueChange={(v) => setType(v as "count" | "value")}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="count" className="rounded-lg">
                  <span className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-blue-500" />
                    记次数 — 每次点击 +1（如抽烟、喝水）
                  </span>
                </SelectItem>
                <SelectItem value="value" className="rounded-lg">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    记数值 — 输入具体数字（如体重、血压）
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">单位</label>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={type === "count" ? "次" : "例如：KG、ml、杯..."}
              className="rounded-xl"
              maxLength={20}
            />
            <p className="text-xs text-gray-400 mt-1">显示在数值后面，如 83.8 KG</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            取消
          </Button>
          <Button onClick={handleSubmit} className="rounded-xl">
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Edit Habit Dialog ====================
function EditHabitDialog({
  open,
  onOpenChange,
  habit,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: HabitWithStats | null;
  onSubmit: (id: number, name: string, type: "count" | "value", unit: string) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"count" | "value">("count");
  const [unit, setUnit] = useState("");

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setType(habit.type);
      setUnit(habit.unit || "");
    }
  }, [habit]);

  const handleSubmit = () => {
    if (!habit || !name.trim()) return;
    onSubmit(habit.id, name.trim(), type, unit.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>编辑习惯</DialogTitle>
          <DialogDescription>修改习惯的名称或类型</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">习惯名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">习惯类型</label>
            <Select value={type} onValueChange={(v) => setType(v as "count" | "value")}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="count" className="rounded-lg">
                  <span className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-blue-500" />
                    记次数
                  </span>
                </SelectItem>
                <SelectItem value="value" className="rounded-lg">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    记数值
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">单位</label>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={type === "count" ? "次" : "例如：KG、ml、杯..."}
              className="rounded-xl"
              maxLength={20}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            取消
          </Button>
          <Button onClick={handleSubmit} className="rounded-xl">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Record Sheet (Bottom Sheet) ====================
function RecordSheet({
  open,
  onOpenChange,
  habit,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: HabitWithStats | null;
  onSubmit: (data: { habitId: number; value: string; note?: string; timestamp: number }) => void;
  isSubmitting: boolean;
}) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [timestamp, setTimestamp] = useState("");

  useEffect(() => {
    if (open && habit) {
      setValue(habit.type === "count" ? "1" : "");
      setNote("");
      // Default to current time in local format
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setTimestamp(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
      );
    }
  }, [open, habit]);

  const handleSubmit = () => {
    if (!habit || !value.trim()) {
      toast.error("请输入数值");
      return;
    }
    const ts = new Date(timestamp).getTime();
    if (isNaN(ts)) {
      toast.error("时间格式不正确");
      return;
    }
    onSubmit({
      habitId: habit.id,
      value: value.trim(),
      note: note.trim() || undefined,
      timestamp: ts,
    });
  };

  if (!habit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md sm:max-w-lg !bottom-0 !top-auto sm:!top-[50%] sm:!bottom-auto sm:!translate-y-[-50%] !translate-y-0 sm:rounded-2xl rounded-b-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                habit.type === "count" ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500"
              )}
            >
              {habit.type === "count" ? <Hash className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            </div>
            {habit.name}
          </DialogTitle>
          <DialogDescription>
            {habit.latestRecord
              ? `上次记录: ${habit.latestRecord.value} (${new Date(habit.latestRecord.timestamp).toLocaleString("zh-CN")})`
              : "暂无历史记录"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Value Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              {habit.type === "count" ? "次数" : "数值"}
            </label>
            <Input
              type="number"
              step={habit.type === "value" ? "0.1" : "1"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={habit.type === "count" ? "1" : "例如: 75.5"}
              className="rounded-xl text-lg"
              autoFocus
            />
          </div>

          {/* Timestamp */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">记录时间</label>
            <Input
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">备注（可选）</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="添加备注信息..."
              className="rounded-xl resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            保存记录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Analytics View (Placeholder) ====================
function AnalyticsView({ habits }: { habits: HabitWithStats[] }) {
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter" | "year">("month");

  // Auto-select first habit
  useEffect(() => {
    if (habits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId]);

  const selectedHabit = useMemo(
    () => habits.find((h) => h.id === selectedHabitId),
    [habits, selectedHabitId]
  );

  // Calculate time range
  const { startTime, endTime } = useMemo(() => {
    const now = new Date();
    const end = now.getTime();
    let start: number;
    switch (timeRange) {
      case "week":
        start = end - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        start = end - 30 * 24 * 60 * 60 * 1000;
        break;
      case "quarter":
        start = end - 90 * 24 * 60 * 60 * 1000;
        break;
      case "year":
        start = end - 365 * 24 * 60 * 60 * 1000;
        break;
    }
    return { startTime: start, endTime: end };
  }, [timeRange]);

  const recordsQuery = trpc.habits.getRecords.useQuery(
    { habitId: selectedHabitId!, startTime, endTime },
    { enabled: !!selectedHabitId }
  );

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <BarChart3 className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">暂无数据</p>
        <p className="text-sm mt-1">创建习惯并开始打卡后，这里会显示统计图表</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={selectedHabitId?.toString() || ""}
            onValueChange={(v) => setSelectedHabitId(Number(v))}
          >
            <SelectTrigger className="rounded-xl w-48">
              <SelectValue placeholder="选择习惯" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {habits.map((h) => (
                <SelectItem key={h.id} value={h.id.toString()} className="rounded-lg">
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1">
          {(["week", "month", "quarter", "year"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                timeRange === range
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {{ week: "周", month: "月", quarter: "季度", year: "年" }[range]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      {recordsQuery.isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : selectedHabit?.type === "count" ? (
        <CountChart records={recordsQuery.data || []} timeRange={timeRange} />
      ) : (
        <ValueChart records={recordsQuery.data || []} timeRange={timeRange} />
      )}
    </div>
  );
}

// ==================== Count Chart (Bar/Heatmap) ====================
function CountChart({
  records,
  timeRange,
}: {
  records: { id: number; value: string; timestamp: number }[];
  timeRange: string;
}) {
  // Aggregate by day
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      const d = new Date(r.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + Number(r.value));
    });

    // Fill in missing days
    const days: { date: string; count: number }[] = [];
    const now = new Date();
    const daysCount = timeRange === "week" ? 7 : timeRange === "month" ? 30 : timeRange === "quarter" ? 90 : 365;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ date: key, count: map.get(key) || 0 });
    }
    return days;
  }, [records, timeRange]);

  const maxCount = Math.max(...dailyData.map((d) => d.count), 1);

  // For week/month show bar chart, for quarter/year show heatmap
  if (timeRange === "week" || timeRange === "month") {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-4">每日频次</h3>
        <div className="flex items-end gap-1 h-48">
          {dailyData.map((d) => {
            const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {d.date}: {d.count}次
                </div>
                <div
                  className="w-full rounded-t-md bg-blue-400 hover:bg-blue-500 transition-colors min-h-[2px]"
                  style={{ height: `${Math.max(height, 1)}%` }}
                />
                {timeRange === "week" && (
                  <span className="text-[10px] text-gray-400">
                    {new Date(d.date).toLocaleDateString("zh-CN", { weekday: "short" })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{dailyData[0]?.date}</span>
          <span>总计: {dailyData.reduce((s, d) => s + d.count, 0)} 次</span>
          <span>{dailyData[dailyData.length - 1]?.date}</span>
        </div>
      </div>
    );
  }

  // Heatmap for quarter/year
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-4">打卡热力图</h3>
      <div className="flex flex-wrap gap-1">
        {dailyData.map((d) => {
          const intensity = maxCount > 0 ? d.count / maxCount : 0;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.count}次`}
              className={cn(
                "w-3 h-3 rounded-sm transition-colors",
                intensity === 0
                  ? "bg-gray-100"
                  : intensity < 0.25
                    ? "bg-blue-200"
                    : intensity < 0.5
                      ? "bg-blue-300"
                      : intensity < 0.75
                        ? "bg-blue-400"
                        : "bg-blue-500"
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
        <span>少</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100" />
        <div className="w-3 h-3 rounded-sm bg-blue-200" />
        <div className="w-3 h-3 rounded-sm bg-blue-300" />
        <div className="w-3 h-3 rounded-sm bg-blue-400" />
        <div className="w-3 h-3 rounded-sm bg-blue-500" />
        <span>多</span>
        <span className="ml-auto">总计: {dailyData.reduce((s, d) => s + d.count, 0)} 次</span>
      </div>
    </div>
  );
}

// ==================== Value Chart (Line) ====================
function ValueChart({
  records,
  timeRange,
}: {
  records: { id: number; value: string; timestamp: number; note: string | null }[];
  timeRange: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => a.timestamp - b.timestamp),
    [records]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sortedRecords.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    const values = sortedRecords.map((r) => parseFloat(r.value));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const minTime = sortedRecords[0].timestamp;
    const maxTime = sortedRecords[sortedRecords.length - 1].timestamp;
    const timeSpan = maxTime - minTime || 1;

    // Grid lines
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Labels
      const val = maxVal - (range / 4) * i;
      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(val.toFixed(1), padding.left - 8, y + 4);
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    sortedRecords.forEach((r, i) => {
      const x = padding.left + ((r.timestamp - minTime) / timeSpan) * chartW;
      const y = padding.top + (1 - (parseFloat(r.value) - minVal) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area
    const lastRecord = sortedRecords[sortedRecords.length - 1];
    const lastX = padding.left + ((lastRecord.timestamp - minTime) / timeSpan) * chartW;
    ctx.lineTo(lastX, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.15)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Points
    sortedRecords.forEach((r) => {
      const x = padding.left + ((r.timestamp - minTime) / timeSpan) * chartW;
      const y = padding.top + (1 - (parseFloat(r.value) - minVal) / range) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [sortedRecords]);

  if (sortedRecords.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-4">数值趋势</h3>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <p>暂无记录数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-4">数值趋势</h3>
      <canvas ref={canvasRef} className="w-full h-48" />
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>{new Date(sortedRecords[0].timestamp).toLocaleDateString("zh-CN")}</span>
        <span>共 {sortedRecords.length} 条记录</span>
        <span>{new Date(sortedRecords[sortedRecords.length - 1].timestamp).toLocaleDateString("zh-CN")}</span>
      </div>
    </div>
  );
}

// ==================== Archive View ====================
function ArchiveView({
  habits,
  isLoading,
  onRestore,
  onPermanentDelete,
}: {
  habits: { id: number; name: string; type: "count" | "value"; createdAt: number; isArchived: boolean; isDeleted: boolean }[];
  isLoading: boolean;
  onRestore: (id: number) => void;
  onPermanentDelete: (id: number) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Archive className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">归档为空</p>
        <p className="text-sm mt-1">已删除或归档的习惯会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {habits.map((habit) => (
        <div
          key={habit.id}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                habit.type === "count" ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500"
              )}
            >
              {habit.type === "count" ? <Hash className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{habit.name}</h3>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                  habit.isDeleted ? "bg-red-50 text-red-400" : "bg-amber-50 text-amber-500"
                )}>
                  {habit.isDeleted ? "已删除" : "已归档"}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                创建于 {new Date(habit.createdAt).toLocaleDateString("zh-CN")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => onRestore(habit.id)}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              恢复
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => setConfirmDeleteId(habit.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              彻底删除
            </Button>
          </div>
        </div>
      ))}

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              彻底删除
            </AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销，习惯及其所有打卡记录将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">取消</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (confirmDeleteId) onPermanentDelete(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
