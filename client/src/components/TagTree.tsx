import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Tag, Folder, FolderOpen, MoreHorizontal, Edit2, Trash2, FolderInput } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface TagNode {
  name: string;
  fullPath: string;
  children: TagNode[];
  count: number;
}

interface TagTreeProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onRenameTag?: (oldTag: string, newTag: string) => void;
  onDeleteTag?: (tag: string) => void;
  onMoveTag?: (tag: string, newParent: string | null) => void;
  onAddTag?: (parentPath: string | null, tagName: string) => void;
}

// 将扁平的标签列表转换为树形结构
function buildTagTree(tags: string[]): TagNode[] {
  const root: TagNode[] = [];
  const nodeMap = new Map<string, TagNode>();

  // 对标签排序，确保父级先被处理
  const sortedTags = [...tags].sort();

  sortedTags.forEach((tag) => {
    const parts = tag.split("/");
    let currentPath = "";
    let currentLevel = root;

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      let node = nodeMap.get(currentPath);
      if (!node) {
        node = {
          name: part,
          fullPath: currentPath,
          children: [],
          count: 0,
        };
        nodeMap.set(currentPath, node);
        currentLevel.push(node);
      }
      
      // 只有完整路径才计数
      if (index === parts.length - 1) {
        node.count = 1;
      }
      
      currentLevel = node.children;
    });
  });

  return root;
}

// 获取所有可能的父级标签（用于移动标签）
function getAllParentOptions(tags: string[], excludeTag: string): string[] {
  const options = new Set<string>();
  
  tags.forEach(tag => {
    // 排除当前标签及其子标签
    if (tag === excludeTag || tag.startsWith(excludeTag + "/")) return;
    
    // 添加标签本身作为可能的父级
    options.add(tag);
    
    // 添加标签的所有父级
    const parts = tag.split("/");
    let path = "";
    parts.forEach((part, index) => {
      path = path ? `${path}/${part}` : part;
      if (index < parts.length - 1) {
        options.add(path);
      }
    });
  });
  
  return Array.from(options).sort();
}

// 递归渲染标签节点
function TagNodeItem({
  node,
  level,
  selectedTag,
  onSelectTag,
  expandedPaths,
  toggleExpand,
  onRenameTag,
  onDeleteTag,
  onMoveTag,
  onAddTag,
  allTags,
  isLast,
}: {
  node: TagNode;
  level: number;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
  onRenameTag?: (oldTag: string, newTag: string) => void;
  onDeleteTag?: (tag: string) => void;
  onMoveTag?: (tag: string, newParent: string | null) => void;
  onAddTag?: (parentPath: string | null, tagName: string) => void;
  allTags: string[];
  isLast?: boolean;
}) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [newParent, setNewParent] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPaths.has(node.fullPath);
  const isSelected = selectedTag === node.fullPath;
  
  const parentOptions = useMemo(() => getAllParentOptions(allTags, node.fullPath), [allTags, node.fullPath]);

  const handleRename = () => {
    if (newName.trim() && newName !== node.name && onRenameTag) {
      // 计算新的完整路径
      const parts = node.fullPath.split("/");
      parts[parts.length - 1] = newName.trim();
      const newFullPath = parts.join("/");
      onRenameTag(node.fullPath, newFullPath);
    }
    setShowRenameDialog(false);
  };

  const handleMove = () => {
    if (onMoveTag) {
      onMoveTag(node.fullPath, newParent);
    }
    setShowMoveDialog(false);
  };

  const handleDelete = () => {
    if (onDeleteTag) {
      onDeleteTag(node.fullPath);
    }
  };

  return (
    <div className="relative">
      {/* 树状连接线 - 垂直线 */}
      {level > 0 && (
        <div 
          className="absolute border-l border-gray-300/50"
          style={{ 
            left: `${(level - 1) * 12 + 16}px`,
            top: 0,
            bottom: isLast ? '50%' : 0,
            width: '1px'
          }}
        />
      )}
      {/* 树状连接线 - 水平线 */}
      {level > 0 && (
        <div 
          className="absolute border-t border-gray-300/50"
          style={{ 
            left: `${(level - 1) * 12 + 16}px`,
            top: '50%',
            width: '10px',
            height: '1px'
          }}
        />
      )}
      <div className="group flex items-center">
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpand(node.fullPath);
            }
            onSelectTag(isSelected ? null : node.fullPath);
          }}
          className={cn(
            "flex-1 flex items-center gap-1.5 py-1.5 px-2 rounded-md text-sm transition-colors",
            "hover:bg-accent/50",
            isSelected && "bg-primary/10 text-primary font-medium"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {hasChildren ? (
            <span className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </span>
          ) : (
            <span className="w-4 h-4" />
          )}
          
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-amber-500" />
            )
          ) : (
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          
          <span className="flex-1 text-left truncate">{node.name}</span>
          
          {isSelected && (
            <span className="text-xs text-muted-foreground">×</span>
          )}
        </button>
        
        {/* Action menu */}
        {(onRenameTag || onDeleteTag || onMoveTag) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onRenameTag && (
                <DropdownMenuItem onClick={() => {
                  setNewName(node.name);
                  setShowRenameDialog(true);
                }}>
                  <Edit2 className="mr-2 h-3.5 w-3.5" />
                  重命名
                </DropdownMenuItem>
              )}
              {onAddTag && (
                <DropdownMenuItem onClick={() => {
                  setNewTagName("");
                  setShowAddDialog(true);
                }}>
                  <Folder className="mr-2 h-3.5 w-3.5" />
                  新增子标签
                </DropdownMenuItem>
              )}
              {onMoveTag && parentOptions.length > 0 && (
                <DropdownMenuItem onClick={() => {
                  setNewParent(null);
                  setShowMoveDialog(true);
                }}>
                  <FolderInput className="mr-2 h-3.5 w-3.5" />
                  移动到...
                </DropdownMenuItem>
              )}
              {onDeleteTag && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    删除标签
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div className="relative">
          {node.children.map((child, index) => (
            <TagNodeItem
              key={child.fullPath}
              node={child}
              level={level + 1}
              selectedTag={selectedTag}
              onSelectTag={onSelectTag}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
              onRenameTag={onRenameTag}
              onDeleteTag={onDeleteTag}
              onMoveTag={onMoveTag}
              onAddTag={onAddTag}
              allTags={allTags}
              isLast={index === node.children.length - 1}
            />
          ))}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>重命名标签</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="输入新名称"
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
            <p className="text-xs text-muted-foreground mt-2">
              当前路径: {node.fullPath}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              取消
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim() || newName === node.name}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>新增子标签</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm mb-3">
              在 <span className="font-medium">{node.fullPath}</span> 下新增:
            </p>
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="输入标签名称"
              onKeyDown={(e) => e.key === "Enter" && newTagName.trim() && onAddTag?.(node.fullPath, newTagName)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={() => {
              if (newTagName.trim() && onAddTag) {
                onAddTag(node.fullPath, newTagName);
                setShowAddDialog(false);
                setNewTagName("");
              }
            }} disabled={!newTagName.trim()}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>移动标签</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm mb-3">
              将 <span className="font-medium">{node.fullPath}</span> 移动到:
            </p>
            <Select value={newParent || "__root__"} onValueChange={(v) => setNewParent(v === "__root__" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="选择目标位置" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">根目录</SelectItem>
                {parentOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              取消
            </Button>
            <Button onClick={handleMove}>
              确认移动
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 获取所有需要展开的路径（所有有子节点的标签）
function getAllExpandablePaths(tags: string[]): Set<string> {
  const paths = new Set<string>();
  tags.forEach(tag => {
    const parts = tag.split("/");
    let currentPath = "";
    // 添加除最后一级外的所有父级路径
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (index < parts.length - 1) {
        paths.add(currentPath);
      }
    });
  });
  return paths;
}

export function TagTree({ tags, selectedTag, onSelectTag, onRenameTag, onDeleteTag, onMoveTag, onAddTag }: TagTreeProps) {
  // 默认展开所有层级
  const allExpandablePaths = useMemo(() => getAllExpandablePaths(tags), [tags]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(allExpandablePaths);

  // 当标签列表变化时，更新展开状态以包含新的可展开路径
  useMemo(() => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      allExpandablePaths.forEach(p => next.add(p));
      return next;
    });
  }, [allExpandablePaths]);

  const tagTree = useMemo(() => buildTagTree(tags), [tags]);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // 自动展开选中标签的父级
  useMemo(() => {
    if (selectedTag) {
      const parts = selectedTag.split("/");
      const pathsToExpand: string[] = [];
      let currentPath = "";
      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (index < parts.length - 1) {
          pathsToExpand.push(currentPath);
        }
      });
      if (pathsToExpand.length > 0) {
        setExpandedPaths((prev) => {
          const next = new Set(prev);
          pathsToExpand.forEach((p) => next.add(p));
          return next;
        });
      }
    }
  }, [selectedTag]);

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {tagTree.map((node) => (
        <TagNodeItem
          key={node.fullPath}
          node={node}
          level={0}
          selectedTag={selectedTag}
          onSelectTag={onSelectTag}
          expandedPaths={expandedPaths}
          toggleExpand={toggleExpand}
          onRenameTag={onRenameTag}
          onDeleteTag={onDeleteTag}
          onMoveTag={onMoveTag}
          onAddTag={onAddTag}
          allTags={tags}
        />
      ))}
    </div>
  );
}
