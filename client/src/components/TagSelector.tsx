import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, FolderOpen, Tag } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";

interface TagSelectorProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  className?: string;
}

interface TagNode {
  name: string;
  fullPath: string;
  children: TagNode[];
}

// 将扁平标签列表转换为树形结构
function buildTagTree(tags: string[]): TagNode[] {
  const root: TagNode[] = [];

  tags.forEach((tag) => {
    const parts = tag.split("/");
    let currentLevel = root;

    parts.forEach((part, index) => {
      const fullPath = parts.slice(0, index + 1).join("/");
      let existingNode = currentLevel.find((n) => n.name === part);

      if (!existingNode) {
        existingNode = { name: part, fullPath, children: [] };
        currentLevel.push(existingNode);
      }

      currentLevel = existingNode.children;
    });
  });

  return root;
}

// 递归渲染标签节点
function TagNodeItem({
  node,
  level,
  selectedTags,
  onToggleTag,
  expandedPaths,
  onToggleExpand,
}: {
  node: TagNode;
  level: number;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPaths.has(node.fullPath);
  const isSelected = selectedTags.includes(node.fullPath);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
          "hover:bg-gray-100",
          isSelected && "bg-primary/10 text-primary"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onToggleTag(node.fullPath)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.fullPath);
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-4" />
        )}

        {hasChildren ? (
          <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
        ) : (
          <Tag className="h-3.5 w-3.5 text-gray-400" />
        )}

        <span className="flex-1 text-sm truncate">{node.name}</span>

        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TagNodeItem
              key={child.fullPath}
              node={child}
              level={level + 1}
              selectedTags={selectedTags}
              onToggleTag={onToggleTag}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TagSelector({
  allTags,
  selectedTags,
  onToggleTag,
  className,
}: TagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // 过滤标签
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return allTags;
    const query = searchQuery.toLowerCase();
    return allTags.filter((tag) => tag.toLowerCase().includes(query));
  }, [allTags, searchQuery]);

  // 构建树形结构
  const tagTree = useMemo(() => buildTagTree(filteredTags), [filteredTags]);

  const handleToggleExpand = (path: string) => {
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

  // 自动展开所有父级（搜索时）
  useMemo(() => {
    if (searchQuery.trim()) {
      const paths = new Set<string>();
      filteredTags.forEach((tag) => {
        const parts = tag.split("/");
        for (let i = 1; i < parts.length; i++) {
          paths.add(parts.slice(0, i).join("/"));
        }
      });
      setExpandedPaths(paths);
    }
  }, [searchQuery, filteredTags]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="p-2 border-b">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索标签..."
          className="h-8 text-sm"
        />
      </div>

      <ScrollArea className="flex-1 max-h-[300px]">
        <div className="p-2">
          {tagTree.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-400">
              {searchQuery ? "未找到匹配的标签" : "暂无标签"}
            </div>
          ) : (
            tagTree.map((node) => (
              <TagNodeItem
                key={node.fullPath}
                node={node}
                level={0}
                selectedTags={selectedTags}
                onToggleTag={onToggleTag}
                expandedPaths={expandedPaths}
                onToggleExpand={handleToggleExpand}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {selectedTags.length > 0 && (
        <div className="p-2 border-t bg-gray-50">
          <p className="text-xs text-gray-500 mb-1">
            已选择 {selectedTags.length} 个标签
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded"
              >
                {tag.split("/").pop()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
