import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { APP_VERSION, VERSION_STORAGE_KEY } from "@shared/version";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

// 更新日志数据
// 发布新版本时，在此数组开头添加新条目，并更新 shared/version.ts 中的版本号
export const changelog: ChangelogEntry[] = [
  {
    version: "1.4.0",
    date: "2026-02-03",
    title: "任务管理优化",
    changes: [
      "新增批量新增任务功能，支持换行输入多个任务，AI 自动识别分类",
      "四象限添加副标题描述，帮助理解各象限的使用场景",
      "任务卡片显示备注内容，方便快速查看任务详情",
      "修复日期切换时区问题，解决点击箭头日期跳转异常",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-01-28",
    title: "功能增强更新",
    changes: [
      "新增任务拖拽排序功能，支持在四象限之间拖拽调整任务位置",
      "新增批量操作功能，支持多选任务进行批量删除或移动",
      "新增快捷键支持，提升操作效率",
      "新增更新日志入口，查看版本更新历史",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-01-28",
    title: "性能优化",
    changes: [
      "优化任务状态更新为异步批量上报模式",
      "实现乐观更新，点击复选框立即响应",
      "修复 useEffect 无限循环问题",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-01-27",
    title: "待办清单模块",
    changes: [
      "新增待办清单模块，支持四象限任务管理",
      "新增今日总结功能，记录收获与反思",
      "新增智能分析功能，AI 生成工作效率报告",
      "新增 Prompt 管理功能，自定义 AI 分析模板",
      "新增历史记录与数据看板，支持年/月/日维度查看",
      "新增未完成任务延期提示功能",
      "新增明日计划 AI 自动分配任务功能",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-01-20",
    title: "初始版本",
    changes: [
      "便签笔记功能，支持创建、编辑、删除便签",
      "Markdown 编辑器，支持实时预览",
      "图片上传功能，支持粘贴上传",
      "标签管理功能，支持层级标签",
      "颜色分类功能，支持多种颜色主题",
      "四象限视图，按重要/紧急分类",
      "回收站功能，支持恢复已删除便签",
    ],
  },
];

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 检查是否有新版本更新
 * 返回 true 表示用户还没看过当前版本的更新日志
 */
export function checkForNewVersion(): boolean {
  const lastSeenVersion = localStorage.getItem(VERSION_STORAGE_KEY);
  return lastSeenVersion !== APP_VERSION;
}

/**
 * 标记用户已查看当前版本更新日志
 */
export function markVersionAsSeen(): void {
  localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
}

export function ChangelogDialog({ open, onOpenChange }: ChangelogDialogProps) {
  // 当弹窗打开时，标记用户已查看
  useEffect(() => {
    if (open) {
      markVersionAsSeen();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>📋</span>
            更新日志
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 pl-2">
            {changelog.map((entry, index) => (
              <div
                key={entry.version}
                className="relative pl-6 pb-6 border-l-2 border-muted last:pb-0"
              >
                {/* Timeline dot */}
                <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                
                {/* Version header */}
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant={index === 0 ? "default" : "secondary"}>
                    v{entry.version}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {entry.date}
                  </span>
                  {index === 0 && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                      最新
                    </Badge>
                  )}
                </div>
                
                {/* Title */}
                <h3 className="font-semibold mb-2">{entry.title}</h3>
                
                {/* Changes list */}
                <ul className="space-y-1">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 新版本通知 Hook
 * 在页面加载时检查是否有新版本，如果有则自动弹出更新日志
 */
export function useNewVersionNotification() {
  const [showChangelog, setShowChangelog] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    const isNew = checkForNewVersion();
    setHasNewVersion(isNew);
    if (isNew) {
      // 延迟 500ms 弹出，让页面先加载完成
      const timer = setTimeout(() => {
        setShowChangelog(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    showChangelog,
    setShowChangelog,
    hasNewVersion,
  };
}
