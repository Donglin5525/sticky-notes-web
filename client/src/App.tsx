import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotesFilterProvider, useNotesFilter } from "./contexts/NotesFilterContext";
import Home from "./pages/Home";
import DailyTodo from "./pages/DailyTodo";
import HabitTracker from "./pages/HabitTracker";
import { useAuth } from "./_core/hooks/useAuth";
import { useIsMobile } from "./hooks/useMobile";
import { cn } from "./lib/utils";
import { StickyNote, CheckSquare, Loader2, Target, Tag, ChevronDown, ChevronRight } from "lucide-react";
import { getLoginUrl } from "./const";
import { Button } from "./components/ui/button";
import { TagTree } from "./components/TagTree";
import { ScrollArea } from "./components/ui/scroll-area";
import { trpc } from "./lib/trpc";
import { useState, useEffect } from "react";

// Mobile Bottom Tab Navigation
function MobileTabBar() {
  const [location, setLocation] = useLocation();

  const isNotesTab = location === "/" || location === "/notes";
  const isTodoTab = location === "/todo";
  const isHabitTab = location === "/habits";

  const tabs = [
    { path: "/habits", label: "打卡", icon: Target, active: isHabitTab },
    { path: "/todo", label: "待办", icon: CheckSquare, active: isTodoTab },
    { path: "/", label: "便签", icon: StickyNote, active: isNotesTab },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => setLocation(tab.path)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
              tab.active
                ? "text-primary"
                : "text-muted-foreground active:text-foreground"
            )}
          >
            <tab.icon className={cn("h-5 w-5", tab.active && "stroke-[2.5]")} />
            <span className={cn("text-[10px] font-medium", tab.active && "font-semibold")}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// Desktop Sidebar Navigation with Tag Tree
function DesktopSidebar() {
  const [location, setLocation] = useLocation();
  const { filterTag, setFilterTag, allTags } = useNotesFilter();
  const [tagTreeExpanded, setTagTreeExpanded] = useState(true);

  const isNotesTab = location === "/" || location === "/notes";
  const isTodoTab = location === "/todo";
  const isHabitTab = location === "/habits";

  // Tag management mutations
  const utils = trpc.useUtils();
  const renameTagMutation = trpc.tags.rename.useMutation({
    onSuccess: () => utils.notes.list.invalidate(),
  });
  const deleteTagMutation = trpc.tags.delete.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      setFilterTag(null);
    },
  });
  const moveTagMutation = trpc.tags.move.useMutation({
    onSuccess: () => utils.notes.list.invalidate(),
  });
  const addTagMutation = trpc.tags.add.useMutation({
    onSuccess: () => utils.notes.list.invalidate(),
  });

  return (
    <aside className="w-64 border-r border-border/50 bg-sidebar/50 backdrop-blur-xl flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <StickyNote className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">工作便签</h1>
            <p className="text-xs text-muted-foreground">效率管理工具</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="p-3">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setLocation("/")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
              isNotesTab
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <StickyNote className="h-5 w-5" />
            <div>
              <p className="font-medium">便签笔记</p>
              <p className={cn("text-xs", isNotesTab ? "text-primary-foreground/70" : "text-muted-foreground")}>
                记录想法与灵感
              </p>
            </div>
          </button>

          <button
            onClick={() => setLocation("/todo")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
              isTodoTab
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckSquare className="h-5 w-5" />
            <div>
              <p className="font-medium">待办清单</p>
              <p className={cn("text-xs", isTodoTab ? "text-primary-foreground/70" : "text-muted-foreground")}>
                四象限任务管理
              </p>
            </div>
          </button>

          <button
            onClick={() => setLocation("/habits")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
              isHabitTab
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Target className="h-5 w-5" />
            <div>
              <p className="font-medium">习惯打卡</p>
              <p className={cn("text-xs", isHabitTab ? "text-primary-foreground/70" : "text-muted-foreground")}>
                追踪与量化习惯
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Tag Tree Section - visible when on notes page and has tags */}
      {allTags.length > 0 && (
        <div className="flex flex-col flex-1 overflow-hidden border-t border-border/50">
          {/* Tag Tree Header */}
          <button
            onClick={() => setTagTreeExpanded(!tagTreeExpanded)}
            className="flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
          >
            {tagTreeExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              标签
            </span>
            {filterTag && (
              <span className="ml-auto text-xs text-primary font-medium truncate max-w-[80px]">
                {filterTag}
              </span>
            )}
          </button>

          {/* Tag Tree Content */}
          {tagTreeExpanded && (
            <ScrollArea className="flex-1 px-3 pb-3">
              <TagTree
                tags={allTags}
                selectedTag={filterTag}
                onSelectTag={(tag) => {
                  setFilterTag(tag);
                  // If not on notes page, navigate to it
                  if (location !== "/" && location !== "/notes") {
                    // Use window to trigger navigation
                    window.dispatchEvent(new CustomEvent("navigate-to-notes"));
                  }
                }}
                onRenameTag={(oldTag, newTag) => renameTagMutation.mutate({ oldTag, newTag })}
                onDeleteTag={(tag) => deleteTagMutation.mutate({ tag })}
                onMoveTag={(tag, newParent) => moveTagMutation.mutate({ tag, newParent })}
                onAddTag={(parentPath, tagName) => addTagMutation.mutate({ parentPath, tagName })}
              />
            </ScrollArea>
          )}
        </div>
      )}

      {/* Spacer when no tags */}
      {allTags.length === 0 && <div className="flex-1" />}
    </aside>
  );
}

// Main layout with responsive navigation
function MainLayout() {
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  // Listen for navigate-to-notes event from sidebar tag click
  useEffect(() => {
    const handler = () => setLocation("/");
    window.addEventListener("navigate-to-notes", handler);
    return () => window.removeEventListener("navigate-to-notes", handler);
  }, [setLocation]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full glass rounded-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <StickyNote className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center">
              工作便签
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              便签笔记 + 待办清单，使用四象限法则管理您的任务和想法
            </p>
          </div>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            登录开始使用
          </Button>
        </div>
      </div>
    );
  }

  if (isMobile) {
    // Mobile Layout: full screen content + bottom tab bar
    // Default to /habits for mobile on first load
    return (
      <div className="flex flex-col h-[100dvh] overflow-hidden">
        <main className="flex-1 overflow-hidden pb-14">
          <Switch>
            <Route path="/" component={HabitTracker} />
            <Route path="/notes" component={Home} />
            <Route path="/todo" component={DailyTodo} />
            <Route path="/habits" component={HabitTracker} />
            <Route path="/404" component={NotFound} />
            <Route component={HabitTracker} />
          </Switch>
        </main>
        <MobileTabBar />
      </div>
    );
  }

  // Desktop Layout: sidebar + content
  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/notes" component={Home} />
          <Route path="/todo" component={DailyTodo} />
          <Route path="/habits" component={HabitTracker} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <NotesFilterProvider>
            <MainLayout />
          </NotesFilterProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
