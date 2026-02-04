import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Settings,
  History,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Calendar,
  GripVertical,
  CheckSquare,
  X,
  Move,
  Keyboard,
  FileText,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChangelogDialog, checkForNewVersion } from "@/components/ChangelogDialog";
import { APP_VERSION } from "@shared/version";

// Task quadrant types
type TaskQuadrant = "priority" | "strategic" | "trivial" | "trap";

interface Task {
  id: number;
  title: string;
  quadrant: TaskQuadrant;
  isCompleted: boolean;
  notes: string | null;
  taskDate: string;
  isCarriedOver: boolean;
  originalDate: string | null;
  createdAt: number;
  updatedAt: number;
}

// Quadrant configuration
const quadrantConfig: Record<TaskQuadrant, { name: string; description: string; subtitle: string; color: string; bgColor: string }> = {
  priority: {
    name: "优先事项",
    description: "重要且紧急",
    subtitle: "每天优先、集中精力完成",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
  },
  strategic: {
    name: "战略项目",
    description: "重要不紧急",
    subtitle: "长期、持续、有规划地投入",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  trivial: {
    name: "琐碎事务",
    description: "紧急不重要",
    subtitle: "批量处理，攒到一起快速搞定",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
  },
  trap: {
    name: "陷阱区域",
    description: "不重要不紧急",
    subtitle: "能拒绝就拒绝，能授权就授权",
    color: "text-gray-500",
    bgColor: "bg-gray-50 border-gray-200",
  },
};

// Keyboard shortcuts configuration
const shortcuts = [
  { key: "N", description: "新建任务", action: "newTask" },
  { key: "1-4", description: "切换象限 (1=优先, 2=战略, 3=琐碎, 4=陷阱)", action: "quadrant" },
  { key: "←/→", description: "切换日期", action: "date" },
  { key: "T", description: "返回今天", action: "today" },
  { key: "B", description: "批量操作模式", action: "batch" },
  { key: "Esc", description: "取消/关闭", action: "cancel" },
];

// Get today's date in YYYY-MM-DD format (Beijing time)
function getTodayDate(): string {
  const now = new Date();
  const beijingOffset = 8 * 60;
  const localOffset = now.getTimezoneOffset();
  const beijingTime = new Date(now.getTime() + (beijingOffset + localOffset) * 60 * 1000);
  return beijingTime.toISOString().split("T")[0];
}

// Format date for display
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${year}年${month}月${day}日 ${weekday}`;
}

// Add days to a date string
function addDays(dateStr: string, days: number): string {
  // 1. 创建本地时间对象
  const date = new Date(dateStr + "T00:00:00");
  // 2. 进行日期加减
  date.setDate(date.getDate() + days);
  // 3. 手动格式化为 YYYY-MM-DD，避免 toISOString 的时区转换问题
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Draggable Task Item Component
function DraggableTaskItem({
  task,
  isSelected,
  isSelectionMode,
  onToggleComplete,
  onEdit,
  onDelete,
  onSelect,
}: {
  task: Task;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onSelect: (taskId: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: task.id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-white/70 border border-white/50 group",
        task.isCompleted && "opacity-60",
        isDragging && "opacity-50 shadow-lg z-50",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {isSelectionMode ? (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(task.id)}
        />
      ) : (
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={() => onToggleComplete(task)}
        />
      )}

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            task.isCompleted && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        {task.notes && (
          <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
            {task.notes.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
              if (part.match(/^https?:\/\//)) {
                return (
                  <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {part}
                  </a>
                );
              }
              return part;
            })}
          </div>
        )}
        {task.isCarriedOver && (
          <p className="text-xs text-amber-600">延期自 {task.originalDate}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(task)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Droppable Quadrant Component
function DroppableQuadrant({
  quadrant,
  children,
  className,
}: {
  quadrant: TaskQuadrant;
  children: React.ReactNode;
  className?: string;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `quadrant-${quadrant}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "ring-2 ring-primary ring-offset-2 bg-primary/5"
      )}
    >
      {children}
    </div>
  );
}

export default function DailyTodo() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  // State
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showCarryOverDialog, setShowCarryOverDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showChangelogDialog, setShowChangelogDialog] = useState(false);
  const [showBatchMoveDialog, setShowBatchMoveDialog] = useState(false);
  const [showBatchAddDialog, setShowBatchAddDialog] = useState(false);
  const [batchAddText, setBatchAddText] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Batch selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [batchMoveQuadrant, setBatchMoveQuadrant] = useState<TaskQuadrant>("priority");
  
  // Drag state
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskQuadrant, setNewTaskQuadrant] = useState<TaskQuadrant>("priority");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  
  // Summary state
  const [reflection, setReflection] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  
  // 检查新版本，首次访问新版本时自动弹出更新日志
  useEffect(() => {
    if (checkForNewVersion()) {
      const timer = setTimeout(() => {
        setShowChangelogDialog(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // Queries
  const { data: tasks = [], isLoading: tasksLoading } = trpc.dailyTasks.list.useQuery(
    { date: selectedDate },
    { enabled: !!user }
  );
  
  const { data: incompleteTasks = [] } = trpc.dailyTasks.incompletePrevious.useQuery(
    { beforeDate: selectedDate },
    { enabled: !!user && selectedDate === getTodayDate() }
  );
  
  const { data: summary } = trpc.dailySummaries.get.useQuery(
    { date: selectedDate },
    { enabled: !!user }
  );
  
  const { data: promptTemplates = [] } = trpc.promptTemplates.list.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  // Update local state when summary changes
  useEffect(() => {
    if (summary) {
      setReflection(summary.reflection || "");
      setTomorrowPlan(summary.tomorrowPlan || "");
    } else {
      setReflection("");
      setTomorrowPlan("");
    }
  }, [summary]);
  
  // Show carry-over dialog when there are incomplete tasks from previous days
  useEffect(() => {
    if (incompleteTasks.length > 0 && selectedDate === getTodayDate()) {
      setShowCarryOverDialog(true);
    }
  }, [incompleteTasks, selectedDate]);
  
  // ==================== Optimistic Updates & Batch Sync ====================
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const pendingUpdatesRef = useRef<Map<number, { id: number; isCompleted: boolean }>>(new Map());
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const SYNC_DEBOUNCE_MS = 2000;
  
  const tasksJson = JSON.stringify(tasks);
  useEffect(() => {
    setLocalTasks(JSON.parse(tasksJson) as Task[]);
  }, [tasksJson]);
  
  const batchUpdateMutation = trpc.dailyTasks.batchUpdate.useMutation({
    onSuccess: () => {
      utils.dailyTasks.list.invalidate({ date: selectedDate });
    },
    onError: () => {
      toast.error("同步失败，正在重试...");
      utils.dailyTasks.list.invalidate({ date: selectedDate });
    },
  });
  
  const flushPendingUpdatesRef = useRef<() => void>(() => {});
  flushPendingUpdatesRef.current = () => {
    if (pendingUpdatesRef.current.size === 0) return;
    const updates = Array.from(pendingUpdatesRef.current.values());
    pendingUpdatesRef.current.clear();
    batchUpdateMutation.mutate({ updates });
  };
  
  const scheduleSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      flushPendingUpdatesRef.current?.();
    }, SYNC_DEBOUNCE_MS);
  }, []);
  
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      flushPendingUpdatesRef.current?.();
    };
  }, []);
  
  const prevDateRef = useRef(selectedDate);
  useEffect(() => {
    if (prevDateRef.current !== selectedDate) {
      flushPendingUpdatesRef.current?.();
      prevDateRef.current = selectedDate;
    }
  }, [selectedDate]);
  
  // ==================== Mutations ====================
  const createTaskMutation = trpc.dailyTasks.create.useMutation({
    onSuccess: () => {
      utils.dailyTasks.list.invalidate({ date: selectedDate });
      setShowAddTaskDialog(false);
      setNewTaskTitle("");
      setNewTaskNotes("");
      toast.success("任务创建成功");
    },
    onError: () => toast.error("创建失败，请重试"),
  });
  
  const updateTaskMutation = trpc.dailyTasks.update.useMutation({
    onSuccess: () => {
      utils.dailyTasks.list.invalidate({ date: selectedDate });
      setEditingTask(null);
      toast.success("任务更新成功");
    },
    onError: () => toast.error("更新失败，请重试"),
  });
  
  const deleteTaskMutation = trpc.dailyTasks.delete.useMutation({
    onSuccess: () => {
      utils.dailyTasks.list.invalidate({ date: selectedDate });
      toast.success("任务已删除");
    },
    onError: () => toast.error("删除失败，请重试"),
  });
  
  const carryOverMutation = trpc.dailyTasks.carryOver.useMutation({
    onSuccess: () => {
      utils.dailyTasks.list.invalidate({ date: selectedDate });
      utils.dailyTasks.incompletePrevious.invalidate({ beforeDate: selectedDate });
      setShowCarryOverDialog(false);
      toast.success("任务已延期到今天");
    },
    onError: () => toast.error("延期失败，请重试"),
  });
  
  const upsertSummaryMutation = trpc.dailySummaries.upsert.useMutation({
    onSuccess: () => {
      utils.dailySummaries.get.invalidate({ date: selectedDate });
      toast.success("总结已保存");
    },
    onError: () => toast.error("保存失败，请重试"),
  });
  
  const analyzeMutation = trpc.ai.analyze.useMutation({
    onSuccess: () => {
      utils.dailySummaries.get.invalidate({ date: selectedDate });
      toast.success("分析完成");
    },
    onError: () => toast.error("分析失败，请重试"),
  });
  
  const generateTasksMutation = trpc.ai.generateTomorrowTasks.useMutation({
    onSuccess: (data) => {
      const tomorrowDate = addDays(selectedDate, 1);
      utils.dailyTasks.list.invalidate({ date: tomorrowDate });
      toast.success(`已为明天创建 ${data.tasks.length} 个任务`);
    },
    onError: () => toast.error("创建任务失败，请重试"),
  });
  
  const batchCreateMutation = trpc.ai.batchCreateWithAI.useMutation({
    onSuccess: (data) => {
      utils.dailyTasks.list.invalidate({ date: selectedDate });
      setShowBatchAddDialog(false);
      setBatchAddText("");
      toast.success(`已创建 ${data.tasks.length} 个任务，AI 已自动分配象限`);
    },
    onError: () => toast.error("批量创建失败，请重试"),
  });
  
  // Group tasks by quadrant
  const tasksByQuadrant = useMemo(() => {
    const grouped: Record<TaskQuadrant, Task[]> = {
      priority: [],
      strategic: [],
      trivial: [],
      trap: [],
    };
    localTasks.forEach((task: Task) => {
      grouped[task.quadrant as TaskQuadrant].push(task);
    });
    return grouped;
  }, [localTasks]);
  
  // Task stats
  const taskStats = useMemo(() => {
    const total = localTasks.length;
    const completed = localTasks.filter((t: Task) => t.isCompleted).length;
    return { total, completed };
  }, [localTasks]);
  
  // ==================== Handlers ====================
  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      toast.error("请输入任务名称");
      return;
    }
    createTaskMutation.mutate({
      title: newTaskTitle.trim(),
      quadrant: newTaskQuadrant,
      taskDate: selectedDate,
      notes: newTaskNotes || undefined,
    });
  };
  
  const handleToggleComplete = useCallback((task: Task) => {
    const newIsCompleted = !task.isCompleted;
    setLocalTasks(prev => 
      prev.map(t => t.id === task.id ? { ...t, isCompleted: newIsCompleted } : t)
    );
    pendingUpdatesRef.current.set(task.id, {
      id: task.id,
      isCompleted: newIsCompleted,
    });
    scheduleSync();
  }, [scheduleSync]);
  
  const handleDeleteTask = (taskId: number) => {
    deleteTaskMutation.mutate({ id: taskId });
  };
  
  const handleSaveSummary = () => {
    upsertSummaryMutation.mutate({
      summaryDate: selectedDate,
      reflection,
      tomorrowPlan,
    });
  };
  
  const handleAnalyze = () => {
    analyzeMutation.mutate({
      date: selectedDate,
    });
  };
  
  const handleGenerateTomorrowTasks = () => {
    if (!tomorrowPlan.trim()) {
      toast.error("请先填写明日计划");
      return;
    }
    const tomorrowDate = addDays(selectedDate, 1);
    generateTasksMutation.mutate({
      planText: tomorrowPlan,
      tomorrowDate,
    });
  };
  
  const handleCarryOver = (taskIds: number[]) => {
    carryOverMutation.mutate({
      taskIds,
      newDate: selectedDate,
    });
  };
  
  const handlePrevDay = useCallback(() => {
    setSelectedDate(prev => addDays(prev, -1));
  }, []);
  
  const handleNextDay = useCallback(() => {
    setSelectedDate(prev => addDays(prev, 1));
  }, []);
  
  const handleToday = useCallback(() => {
    setSelectedDate(getTodayDate());
  }, []);
  
  // ==================== Drag & Drop Handlers ====================
  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as number;
    const task = localTasks.find(t => t.id === taskId);
    if (task) {
      setActiveTask(task);
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    
    if (!over) return;
    
    const taskId = active.id as number;
    const overId = over.id as string;
    
    // Check if dropped on a quadrant
    if (overId.startsWith("quadrant-")) {
      const newQuadrant = overId.replace("quadrant-", "") as TaskQuadrant;
      const task = localTasks.find(t => t.id === taskId);
      
      if (task && task.quadrant !== newQuadrant) {
        // Optimistic update
        setLocalTasks(prev =>
          prev.map(t => t.id === taskId ? { ...t, quadrant: newQuadrant } : t)
        );
        // Update on server
        updateTaskMutation.mutate({
          id: taskId,
          quadrant: newQuadrant,
        });
      }
    }
  };
  
  // ==================== Batch Operations ====================
  const handleToggleSelection = (taskId: number) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };
  
  const handleSelectAll = () => {
    if (selectedTaskIds.size === localTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(localTasks.map(t => t.id)));
    }
  };
  
  const handleBatchDelete = () => {
    if (selectedTaskIds.size === 0) {
      toast.error("请先选择任务");
      return;
    }
    selectedTaskIds.forEach(id => {
      deleteTaskMutation.mutate({ id });
    });
    setSelectedTaskIds(new Set());
    setIsSelectionMode(false);
    toast.success(`已删除 ${selectedTaskIds.size} 个任务`);
  };
  
  const handleBatchMove = () => {
    if (selectedTaskIds.size === 0) {
      toast.error("请先选择任务");
      return;
    }
    setShowBatchMoveDialog(true);
  };
  
  const handleConfirmBatchMove = () => {
    selectedTaskIds.forEach(id => {
      updateTaskMutation.mutate({
        id,
        quadrant: batchMoveQuadrant,
      });
    });
    setShowBatchMoveDialog(false);
    setSelectedTaskIds(new Set());
    setIsSelectionMode(false);
    toast.success(`已移动 ${selectedTaskIds.size} 个任务到${quadrantConfig[batchMoveQuadrant].name}`);
  };
  
  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedTaskIds(new Set());
  };
  
  // ==================== Keyboard Shortcuts ====================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Escape - close dialogs or exit selection mode
      if (e.key === "Escape") {
        if (isSelectionMode) {
          exitSelectionMode();
        } else if (showAddTaskDialog) {
          setShowAddTaskDialog(false);
        }
        return;
      }
      
      // N - New task
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setShowAddTaskDialog(true);
        return;
      }
      
      // T - Today
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        handleToday();
        return;
      }
      
      // B - Batch mode
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setIsSelectionMode(prev => !prev);
        if (isSelectionMode) {
          setSelectedTaskIds(new Set());
        }
        return;
      }
      
      // Arrow keys - navigate dates
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevDay();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextDay();
        return;
      }
      
      // 1-4 - Select quadrant for new task
      if (showAddTaskDialog) {
        if (e.key === "1") {
          setNewTaskQuadrant("priority");
        } else if (e.key === "2") {
          setNewTaskQuadrant("strategic");
        } else if (e.key === "3") {
          setNewTaskQuadrant("trivial");
        } else if (e.key === "4") {
          setNewTaskQuadrant("trap");
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelectionMode, showAddTaskDialog, selectedDate]);
  
  const isToday = selectedDate === getTodayDate();
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handlePrevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[200px]">
                <h2 className="font-semibold">{formatDisplayDate(selectedDate)}</h2>
                {!isToday && (
                  <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={handleToday}>
                    返回今天
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={handleNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                已完成 {taskStats.completed}
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                进行中 {taskStats.total - taskStats.completed}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Batch Operations */}
            {isSelectionMode ? (
              <>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {selectedTaskIds.size === localTasks.length ? "取消全选" : "全选"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleBatchMove} disabled={selectedTaskIds.size === 0}>
                  <Move className="h-4 w-4 mr-2" />
                  移动 ({selectedTaskIds.size})
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={selectedTaskIds.size === 0}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除 ({selectedTaskIds.size})
                </Button>
                <Button variant="ghost" size="sm" onClick={exitSelectionMode}>
                  <X className="h-4 w-4 mr-2" />
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsSelectionMode(true)}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  批量操作
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowShortcutsDialog(true)}>
                  <Keyboard className="h-4 w-4 mr-2" />
                  快捷键
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowHistoryDialog(true)}>
                  <History className="h-4 w-4 mr-2" />
                  历史记录
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowPromptDialog(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Prompt 管理
                </Button>
              </>
            )}
          </div>
        </header>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Four Quadrants with Drag & Drop */}
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(quadrantConfig) as TaskQuadrant[]).map((quadrant) => (
                <DroppableQuadrant
                  key={quadrant}
                  quadrant={quadrant}
                  className={cn(
                    "rounded-xl p-4 border min-h-[200px] transition-all",
                    quadrantConfig[quadrant].bgColor
                  )}
                >
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", {
                          "bg-red-500": quadrant === "priority",
                          "bg-blue-500": quadrant === "strategic",
                          "bg-amber-500": quadrant === "trivial",
                          "bg-gray-400": quadrant === "trap",
                        })} />
                        <h3 className={cn("font-semibold", quadrantConfig[quadrant].color)}>
                          {quadrantConfig[quadrant].name}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {quadrantConfig[quadrant].description}
                        </span>
                      </div>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", {
                        "bg-red-100 text-red-600": quadrant === "priority",
                        "bg-blue-100 text-blue-600": quadrant === "strategic",
                        "bg-amber-100 text-amber-600": quadrant === "trivial",
                        "bg-gray-100 text-gray-600": quadrant === "trap",
                      })}>
                        {tasksByQuadrant[quadrant].length} 项
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-5">
                      {quadrantConfig[quadrant].subtitle}
                    </p>
                  </div>
                  
                  <div className="space-y-2 min-h-[60px]">
                    {tasksByQuadrant[quadrant].map((task: Task) => (
                      <DraggableTaskItem
                        key={task.id}
                        task={task}
                        isSelected={selectedTaskIds.has(task.id)}
                        isSelectionMode={isSelectionMode}
                        onToggleComplete={handleToggleComplete}
                        onEdit={setEditingTask}
                        onDelete={handleDeleteTask}
                        onSelect={handleToggleSelection}
                      />
                    ))}
                  </div>
                  
                  <Button
                    variant="ghost"
                    className="w-full mt-3 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setNewTaskQuadrant(quadrant);
                      setShowAddTaskDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    添加任务
                  </Button>
                </DroppableQuadrant>
              ))}
            </div>
            
            {/* Batch Add Button */}
            <div className="flex justify-end mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBatchAddDialog(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                批量新增
              </Button>
            </div>
            
            {/* Daily Summary */}
            <div className="bg-white rounded-xl p-5 border border-border/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold">今日总结</h3>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  智能分析
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* 今日收获与反思 */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🎯</span>
                    <h4 className="font-medium text-emerald-700">今日收获与反思</h4>
                  </div>
                  <Textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="记录今天的成就、收获和反思..."
                    className="min-h-[120px] bg-white/70 border-0 focus-visible:ring-emerald-300 resize-none"
                  />
                </div>
                
                {/* 明日计划 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      <h4 className="font-medium text-blue-700">明日计划</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateTomorrowTasks}
                      disabled={generateTasksMutation.isPending || !tomorrowPlan.trim()}
                      className="text-xs"
                    >
                      {generateTasksMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3 mr-1" />
                      )}
                      生成任务
                    </Button>
                  </div>
                  <Textarea
                    value={tomorrowPlan}
                    onChange={(e) => setTomorrowPlan(e.target.value)}
                    placeholder="每行一个任务，AI 会自动分配到四象限..."
                    className="flex-1 min-h-[120px] bg-white/70 border-0 focus-visible:ring-blue-300 resize-none"
                  />
                  {/* 保存总结按钮 - 放在明日计划区域右下角 */}
                  <div className="flex justify-end mt-3">
                    <Button onClick={handleSaveSummary} disabled={upsertSummaryMutation.isPending}>
                      {upsertSummaryMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      保存总结
                    </Button>
                  </div>
                </div>
              </div>
              
              {summary?.aiAnalysis && (
                <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <h4 className="font-medium text-purple-700">AI 分析结果</h4>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <Streamdown>{summary.aiAnalysis}</Streamdown>
                  </div>
                </div>
              )}
            </div>
            
            {/* Changelog Button */}
            <div className="flex justify-center pb-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowChangelogDialog(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                更新日志 v{APP_VERSION}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white border shadow-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Checkbox checked={activeTask.isCompleted} disabled />
              <span className="text-sm font-medium">{activeTask.title}</span>
            </div>
          )}
        </DragOverlay>
        
        {/* Add Task Dialog */}
        <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新任务</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">任务名称</label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="输入任务名称..."
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">所属象限 (按 1-4 快速选择)</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(quadrantConfig) as TaskQuadrant[]).map((q, index) => (
                    <button
                      key={q}
                      type="button"
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                        newTaskQuadrant === q
                          ? quadrantConfig[q].bgColor + " border-2"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                      onClick={() => setNewTaskQuadrant(q)}
                    >
                      <span className="text-xs text-muted-foreground">{index + 1}</span>
                      <div className={cn("w-3 h-3 rounded-full", {
                        "bg-red-500": q === "priority",
                        "bg-blue-500": q === "strategic",
                        "bg-amber-500": q === "trivial",
                        "bg-gray-400": q === "trap",
                      })} />
                      <span className="text-sm font-medium">{quadrantConfig[q].name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">备注（可选）</label>
                <Textarea
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="添加任务备注..."
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                添加任务
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Task Dialog */}
        <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑任务</DialogTitle>
            </DialogHeader>
            {editingTask && (
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">任务名称</label>
                  <Input
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">所属象限</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(quadrantConfig) as TaskQuadrant[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                          editingTask.quadrant === q
                            ? quadrantConfig[q].bgColor + " border-2"
                            : "border-gray-200 hover:bg-gray-50"
                        )}
                        onClick={() => setEditingTask({ ...editingTask, quadrant: q })}
                      >
                        <div className={cn("w-3 h-3 rounded-full", {
                          "bg-red-500": q === "priority",
                          "bg-blue-500": q === "strategic",
                          "bg-amber-500": q === "trivial",
                          "bg-gray-400": q === "trap",
                        })} />
                        <span className="text-sm font-medium">{quadrantConfig[q].name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">备注</label>
                  <Textarea
                    value={editingTask.notes || ""}
                    onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                    className="resize-none"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTask(null)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  if (editingTask) {
                    updateTaskMutation.mutate({
                      id: editingTask.id,
                      title: editingTask.title,
                      quadrant: editingTask.quadrant,
                      notes: editingTask.notes || undefined,
                    });
                  }
                }}
                disabled={updateTaskMutation.isPending}
              >
                {updateTaskMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                保存修改
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Batch Move Dialog */}
        <Dialog open={showBatchMoveDialog} onOpenChange={setShowBatchMoveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>批量移动任务</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                将选中的 {selectedTaskIds.size} 个任务移动到：
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(quadrantConfig) as TaskQuadrant[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                      batchMoveQuadrant === q
                        ? quadrantConfig[q].bgColor + " border-2"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                    onClick={() => setBatchMoveQuadrant(q)}
                  >
                    <div className={cn("w-3 h-3 rounded-full", {
                      "bg-red-500": q === "priority",
                      "bg-blue-500": q === "strategic",
                      "bg-amber-500": q === "trivial",
                      "bg-gray-400": q === "trap",
                    })} />
                    <span className="text-sm font-medium">{quadrantConfig[q].name}</span>
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBatchMoveDialog(false)}>
                取消
              </Button>
              <Button onClick={handleConfirmBatchMove}>
                确认移动
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Batch Add Dialog */}
        <Dialog open={showBatchAddDialog} onOpenChange={setShowBatchAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                批量新增任务
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-3">
                每行输入一个任务，AI 会自动识别并分配到对应的四象限
              </p>
              <Textarea
                value={batchAddText}
                onChange={(e) => setBatchAddText(e.target.value)}
                placeholder="例如：\n完成项目报告\n回复客户邮件\n学习 React 新特性\n整理桌面文件"
                className="min-h-[200px] resize-none"
              />
              <div className="mt-3 text-xs text-muted-foreground">
                <p>提示：</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>优先事项：重要且紧急的任务（如紧急会议、今日截止）</li>
                  <li>战略项目：重要不紧急的任务（如学习新技能、规划设计）</li>
                  <li>琐碎事务：紧急不重要的任务（如回复消息、处理邮件）</li>
                  <li>陷阱区域：不重要不紧急的任务（如无意义的会议）</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBatchAddDialog(false)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  if (!batchAddText.trim()) {
                    toast.error("请输入任务内容");
                    return;
                  }
                  batchCreateMutation.mutate({
                    tasksText: batchAddText,
                    taskDate: selectedDate,
                  });
                }}
                disabled={batchCreateMutation.isPending}
              >
                {batchCreateMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                AI 智能分配
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Shortcuts Dialog */}
        <Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                键盘快捷键
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-3">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Changelog Dialog */}
        <ChangelogDialog open={showChangelogDialog} onOpenChange={setShowChangelogDialog} />
        
        {/* Carry Over Dialog */}
        <Dialog open={showCarryOverDialog} onOpenChange={setShowCarryOverDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                未完成任务提醒
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                您有 {incompleteTasks.length} 个未完成的任务，是否延期到今天？
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {incompleteTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Checkbox checked={false} disabled />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        来自 {task.taskDate}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCarryOverDialog(false)}>
                暂不处理
              </Button>
              <Button onClick={() => handleCarryOver(incompleteTasks.map((t: any) => t.id))}>
                全部延期到今天
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Prompt Management Dialog */}
        <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Prompt 模板管理</DialogTitle>
            </DialogHeader>
            <PromptManager templates={promptTemplates} />
          </DialogContent>
        </Dialog>
        
        {/* History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>历史记录</DialogTitle>
            </DialogHeader>
            <HistoryViewer />
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}

// Prompt Manager Component
function PromptManager({ templates }: { templates: any[] }) {
  const utils = trpc.useUtils();
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const createMutation = trpc.promptTemplates.create.useMutation({
    onSuccess: () => {
      utils.promptTemplates.list.invalidate();
      setNewName("");
      setNewContent("");
      toast.success("模板创建成功");
    },
    onError: () => toast.error("创建失败"),
  });
  
  const updateMutation = trpc.promptTemplates.update.useMutation({
    onSuccess: () => {
      utils.promptTemplates.list.invalidate();
      setEditingId(null);
      toast.success("模板更新成功");
    },
    onError: () => toast.error("更新失败"),
  });
  
  const deleteMutation = trpc.promptTemplates.delete.useMutation({
    onSuccess: () => {
      utils.promptTemplates.list.invalidate();
      toast.success("模板已删除");
    },
    onError: () => toast.error("删除失败"),
  });
  
  // Use update mutation to set default
  const setDefaultMutation = trpc.promptTemplates.update.useMutation({
    onSuccess: () => {
      utils.promptTemplates.list.invalidate();
      toast.success("已设为默认模板");
    },
    onError: () => toast.error("设置失败"),
  });
  
  return (
    <div className="space-y-4 py-4">
      {/* Create new template */}
      <div className="p-4 border rounded-lg space-y-3">
        <h4 className="font-medium">新建模板</h4>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="模板名称"
        />
        <Textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Prompt 内容，可使用变量：{{tasks}}, {{reflection}}, {{date}}"
          className="min-h-[100px]"
        />
        <Button
          size="sm"
          onClick={() => createMutation.mutate({ name: newName, promptContent: newContent })}
          disabled={!newName.trim() || !newContent.trim() || createMutation.isPending}
        >
          {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          创建模板
        </Button>
      </div>
      
      {/* Template list */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无模板</p>
          ) : (
            templates.map((template: any) => (
              <div key={template.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{template.name}</h4>
                    {template.isDefault && (
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        默认
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!template.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate({ id: template.id, isDefault: true })}
                      >
                        设为默认
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingId(template.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteMutation.mutate({ id: template.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.content}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// History Viewer Component
function HistoryViewer() {
  const [viewMode, setViewMode] = useState<"year" | "month" | "day">("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === "year") {
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear + 1}-01-01`,
      };
    } else {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
      const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
      return { startDate, endDate };
    }
  }, [viewMode, selectedYear, selectedMonth]);
  
  const { data: stats } = trpc.dailySummaries.stats.useQuery(dateRange);
  
  const { data: summaries = [] } = trpc.dailySummaries.listInRange.useQuery(dateRange);
  
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">视图：</span>
          <div className="flex rounded-lg border overflow-hidden">
            {(["year", "month", "day"] as const).map((mode) => (
              <button
                key={mode}
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors",
                  viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
                onClick={() => setViewMode(mode)}
              >
                {mode === "year" ? "年" : mode === "month" ? "月" : "日"}
              </button>
            ))}
          </div>
        </div>
        
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {viewMode !== "year" && (
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={String(month)}>
                  {month}月
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">总任务数</p>
          <p className="text-2xl font-bold text-emerald-600">{stats?.total || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">完成率</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">总结天数</p>
          <p className="text-2xl font-bold text-amber-600">{summaries.length}</p>
        </div>
      </div>
      
      {/* Quadrant Distribution */}
      {stats?.byQuadrant && Object.keys(stats.byQuadrant).length > 0 && (
        <div className="py-4">
          <h4 className="text-sm font-medium mb-3">四象限分布</h4>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(quadrantConfig) as TaskQuadrant[]).map((q) => {
              const qStats = stats.byQuadrant[q] || { total: 0, completed: 0 };
              const qRate = qStats.total > 0 ? Math.round((qStats.completed / qStats.total) * 100) : 0;
              return (
                <div key={q} className={cn("p-3 rounded-lg", quadrantConfig[q].bgColor)}>
                  <p className={cn("text-xs font-medium", quadrantConfig[q].color)}>
                    {quadrantConfig[q].name}
                  </p>
                  <p className="text-lg font-bold">{qStats.total}</p>
                  <p className="text-xs text-muted-foreground">完成率 {qRate}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Summaries List */}
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-3 py-4">
          {summaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无记录</p>
            </div>
          ) : (
            summaries.map((summary: any) => (
              <div key={summary.id} className="p-4 rounded-xl border hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{formatDisplayDate(summary.summaryDate)}</h4>
                </div>
                {summary.reflection && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {summary.reflection}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
