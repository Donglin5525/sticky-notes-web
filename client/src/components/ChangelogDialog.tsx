import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

const changelog: ChangelogEntry[] = [
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

export function ChangelogDialog({ open, onOpenChange }: ChangelogDialogProps) {
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
          <div className="space-y-6">
            {changelog.map((entry, index) => (
              <div
                key={entry.version}
                className="relative pl-6 pb-6 border-l-2 border-muted last:pb-0"
              >
                {/* Timeline dot */}
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary" />
                
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
