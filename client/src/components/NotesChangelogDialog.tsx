import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { markVersionAsSeen } from "@/components/ChangelogDialog";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.5.0",
    date: "2026-02-24",
    title: "移动端适配 & 体验优化",
    changes: [
      "全面移动端适配：手机访问自动切换移动端布局，底部 Tab 导航",
      "便签卡片移动端重新设计：紧凑布局、触摸友好、操作按钮始终可见",
      "便签编辑器移动端全屏模式，支持 safe-area 适配",
      "标签树移至左侧全局导航栏，支持展开/折叠、快速筛选",
      "全局触摸交互优化：触摸反馈、iOS 输入框缩放防止",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-01-28",
    title: "标签功能增强",
    changes: [
      "实现标签选择器弹窗，点击标签图标显示已创建标签列表",
      "实现编辑器内 # 标签提示功能",
      "实现标签点击跳转到筛选列表",
      "内容中 #标签 自动提取并添加到便签标签列表",
      "标签树默认展开所有层级，添加树状连接线",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-01-27",
    title: "Markdown 编辑器重构",
    changes: [
      "集成 TipTap WYSIWYG 编辑器",
      "实现列表实时渲染（`- ` 转换为圆点）",
      "实现智能退格删除（空列表项按 Backspace 清除整行）",
      "实现图片内联显示（上传图片直接显示而非 URL）",
      "支持图片粘贴上传到云端存储",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-01-26",
    title: "四象限管理与标签系统",
    changes: [
      "新增四象限视图，按重要/紧急分类",
      "实现标签层级支持（A/B/C 形式，树状展示）",
      "标签管理功能（编辑、重命名、移动到其他标签下）",
      "四象限 TODO 勾选功能",
      "便签选中交互优化（点击便签/空白处/ESC 取消选中）",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-01-20",
    title: "初始版本",
    changes: [
      "便签笔记功能，支持创建、编辑、删除便签",
      "颜色分类功能，支持多种颜色主题",
      "回收站功能，支持恢复已删除便签",
      "搜索功能，支持按标题和内容搜索",
      "响应式设计，支持移动端和桌面端",
    ],
  },
];

interface NotesChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotesChangelogDialog({ open, onOpenChange }: NotesChangelogDialogProps) {
  // 当弹窗打开时，标记用户已查看当前版本
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
            <span>📝</span>
            便签笔记更新日志
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
                <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-background" />
                
                {/* Version header */}
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant={index === 0 ? "default" : "secondary"} className={index === 0 ? "bg-amber-500" : ""}>
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
                      <span className="text-amber-500 mt-1">•</span>
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
