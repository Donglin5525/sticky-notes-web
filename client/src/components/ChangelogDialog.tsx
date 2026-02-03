import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { APP_VERSION, VERSION_STORAGE_KEY } from "@shared/version";
import changelogData from "@shared/changelog.json";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

// 从 JSON 文件读取更新日志数据
// 发布新版本时，只需修改 shared/changelog.json 和 shared/version.ts
export const changelog: ChangelogEntry[] = changelogData.entries;

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
