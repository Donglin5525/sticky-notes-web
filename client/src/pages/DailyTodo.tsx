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
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

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
const quadrantConfig: Record<TaskQuadrant, { name: string; description: string; color: string; bgColor: string }> = {
  priority: {
    name: "优先事项",
    description: "重要且紧急",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
  },
  strategic: {
    name: "战略项目",
    description: "重要不紧急",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  trivial: {
    name: "琐碎事务",
    description: "紧急不重要",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
  },
  trap: {
    name: "陷阱区域",
    description: "不重要不紧急",
    color: "text-gray-500",
    bgColor: "bg-gray-50 border-gray-200",
  },
};

// Get today's date in YYYY-MM-DD format (Beijing time)
function getTodayDate(): string {
  const now = new Date();
  // Convert to Beijing time
  const beijingOffset = 8 * 60; // UTC+8
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
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskQuadrant, setNewTaskQuadrant] = useState<TaskQuadrant>("priority");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  
  // Summary state
  const [reflection, setReflection] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  
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
  
  // Mutations
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
    onSuccess: (data) => {
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
  
  // Group tasks by quadrant
  const tasksByQuadrant = useMemo(() => {
    const grouped: Record<TaskQuadrant, Task[]> = {
      priority: [],
      strategic: [],
      trivial: [],
      trap: [],
    };
    tasks.forEach((task: Task) => {
      grouped[task.quadrant as TaskQuadrant].push(task);
    });
    return grouped;
  }, [tasks]);
  
  // Task stats
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t: Task) => t.isCompleted).length;
    return { total, completed };
  }, [tasks]);
  
  // Handlers
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
  
  const handleToggleComplete = (task: Task) => {
    updateTaskMutation.mutate({
      id: task.id,
      isCompleted: !task.isCompleted,
    });
  };
  
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
  
  const handlePrevDay = () => {
    setSelectedDate(addDays(selectedDate, -1));
  };
  
  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };
  
  const handleToday = () => {
    setSelectedDate(getTodayDate());
  };
  
  const isToday = selectedDate === getTodayDate();
  
  return (
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
          <Button variant="outline" size="sm" onClick={() => setShowHistoryDialog(true)}>
            <History className="h-4 w-4 mr-2" />
            历史记录
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPromptDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Prompt 管理
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Four Quadrants */}
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(quadrantConfig) as TaskQuadrant[]).map((quadrant) => (
              <div
                key={quadrant}
                className={cn(
                  "rounded-xl p-4 border",
                  quadrantConfig[quadrant].bgColor
                )}
              >
                <div className="flex items-center justify-between mb-3">
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
                
                <div className="space-y-2">
                  {tasksByQuadrant[quadrant].map((task: Task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg bg-white/70 border border-white/50 group",
                        task.isCompleted && "opacity-60"
                      )}
                    >
                      <Checkbox
                        checked={task.isCompleted}
                        onCheckedChange={() => handleToggleComplete(task)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          task.isCompleted && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </p>
                        {task.isCarriedOver && (
                          <p className="text-xs text-amber-600">
                            延期自 {task.originalDate}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingTask(task)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
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
              </div>
            ))}
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
              {/* Today's Reflection */}
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
              
              {/* Tomorrow's Plan */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
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
                  className="min-h-[120px] bg-white/70 border-0 focus-visible:ring-blue-300 resize-none"
                />
              </div>
            </div>
            
            {/* AI Analysis Result */}
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
            
            <div className="flex justify-end mt-4">
              <Button onClick={handleSaveSummary} disabled={upsertSummaryMutation.isPending}>
                {upsertSummaryMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                保存总结
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
      
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
                      newTaskQuadrant === q
                        ? quadrantConfig[q].bgColor + " border-2"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                    onClick={() => setNewTaskQuadrant(q)}
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
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
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
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Carry Over Dialog */}
      <Dialog open={showCarryOverDialog} onOpenChange={setShowCarryOverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              有未完成的任务
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              以下任务在之前的日期未完成，是否延期到今天？
            </p>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {incompleteTasks.map((task: Task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50/50"
                >
                  <Checkbox
                    id={`carry-${task.id}`}
                    defaultChecked
                  />
                  <div className="flex-1">
                    <label htmlFor={`carry-${task.id}`} className="text-sm font-medium cursor-pointer">
                      {task.title}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      原日期: {task.taskDate} · {quadrantConfig[task.quadrant as TaskQuadrant].name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCarryOverDialog(false)}>
              暂不延期
            </Button>
            <Button
              onClick={() => {
                const taskIds = incompleteTasks.map((t: Task) => t.id);
                handleCarryOver(taskIds);
              }}
              disabled={carryOverMutation.isPending}
            >
              {carryOverMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              延期到今天
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Prompt Management Dialog */}
      <PromptManagementDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        templates={promptTemplates}
      />
      
      {/* History Dialog */}
      <HistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
      />
    </div>
  );
}

// Prompt Management Dialog Component
function PromptManagementDialog({
  open,
  onOpenChange,
  templates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: any[];
}) {
  const utils = trpc.useUtils();
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    promptContent: "",
    isDefault: false,
  });
  const [showNewForm, setShowNewForm] = useState(false);
  
  const createMutation = trpc.promptTemplates.create.useMutation({
    onSuccess: () => {
      utils.promptTemplates.list.invalidate();
      setShowNewForm(false);
      setNewTemplate({ name: "", description: "", promptContent: "", isDefault: false });
      toast.success("模板创建成功");
    },
    onError: () => toast.error("创建失败"),
  });
  
  const updateMutation = trpc.promptTemplates.update.useMutation({
    onSuccess: () => {
      utils.promptTemplates.list.invalidate();
      setEditingTemplate(null);
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Prompt 管理</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 rounded-xl border hover:border-primary/50 transition-colors"
              >
                {editingTemplate?.id === template.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      placeholder="模板名称"
                    />
                    <Input
                      value={editingTemplate.description || ""}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                      placeholder="模板描述"
                    />
                    <Textarea
                      value={editingTemplate.promptContent}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, promptContent: e.target.value })}
                      placeholder="Prompt 内容"
                      className="min-h-[100px]"
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={editingTemplate.isDefault}
                        onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, isDefault: checked })}
                      />
                      <label className="text-sm">设为默认</label>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateMutation.mutate(editingTemplate)}>
                        保存
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      <div className="flex items-center gap-2">
                        {template.isDefault && (
                          <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded">
                            使用中
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteMutation.mutate({ id: template.id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description || template.promptContent}
                    </p>
                  </>
                )}
              </div>
            ))}
            
            {showNewForm ? (
              <div className="p-4 rounded-xl border-2 border-dashed border-primary/50 space-y-3">
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="模板名称"
                />
                <Input
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="模板描述（可选）"
                />
                <Textarea
                  value={newTemplate.promptContent}
                  onChange={(e) => setNewTemplate({ ...newTemplate, promptContent: e.target.value })}
                  placeholder="Prompt 内容（可使用 {{tasks}} {{summary}} {{date}} 变量）"
                  className="min-h-[100px]"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={newTemplate.isDefault}
                    onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, isDefault: !!checked })}
                  />
                  <label className="text-sm">设为默认</label>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => createMutation.mutate(newTemplate)}
                    disabled={!newTemplate.name || !newTemplate.promptContent}
                  >
                    创建
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewForm(false)}>
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <button
                className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNewForm(true)}
              >
                <Plus className="h-4 w-4" />
                新建 Prompt 模板
              </button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// History Dialog Component
function HistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
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
    } else if (viewMode === "month") {
      const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
      const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
      return {
        startDate: `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`,
        endDate: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
      };
    }
    return { startDate: "", endDate: "" };
  }, [viewMode, selectedYear, selectedMonth]);
  
  const { data: stats } = trpc.dailySummaries.stats.useQuery(dateRange, {
    enabled: !!user && !!dateRange.startDate,
  });
  
  const { data: summaries = [] } = trpc.dailySummaries.listInRange.useQuery(dateRange, {
    enabled: !!user && !!dateRange.startDate,
  });
  
  const completionRate = stats ? (stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0) : 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>历史记录</DialogTitle>
        </DialogHeader>
        
        {/* View Mode & Date Selector */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex bg-muted rounded-lg p-1">
            {(["year", "month", "day"] as const).map((mode) => (
              <button
                key={mode}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  viewMode === mode ? "bg-background shadow-sm" : "hover:bg-background/50"
                )}
                onClick={() => setViewMode(mode)}
              >
                {mode === "year" ? "年" : mode === "month" ? "月" : "日"}
              </button>
            ))}
          </div>
          
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map((year) => (
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
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={String(month)}>
                    {month}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">总任务数</p>
            <p className="text-2xl font-bold text-indigo-600">{stats?.total || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">完成率</p>
            <p className="text-2xl font-bold text-emerald-600">{completionRate}%</p>
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
      </DialogContent>
    </Dialog>
  );
}
