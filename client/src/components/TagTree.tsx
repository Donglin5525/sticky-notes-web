import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Tag, Folder, FolderOpen } from "lucide-react";
import { Badge } from "./ui/badge";

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
  noteCountByTag?: Record<string, number>;
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

// 递归渲染标签节点
function TagNodeItem({
  node,
  level,
  selectedTag,
  onSelectTag,
  expandedPaths,
  toggleExpand,
}: {
  node: TagNode;
  level: number;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPaths.has(node.fullPath);
  const isSelected = selectedTag === node.fullPath;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            toggleExpand(node.fullPath);
          }
          onSelectTag(isSelected ? null : node.fullPath);
        }}
        className={cn(
          "w-full flex items-center gap-1.5 py-1.5 px-2 rounded-md text-sm transition-colors",
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
      
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TagNodeItem
              key={child.fullPath}
              node={child}
              level={level + 1}
              selectedTag={selectedTag}
              onSelectTag={onSelectTag}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TagTree({ tags, selectedTag, onSelectTag }: TagTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

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
        />
      ))}
    </div>
  );
}
