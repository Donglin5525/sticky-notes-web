import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DailyTodo from "./pages/DailyTodo";
import HabitTracker from "./pages/HabitTracker";
import { useAuth } from "./_core/hooks/useAuth";
import { cn } from "./lib/utils";
import { StickyNote, CheckSquare, Loader2, Target } from "lucide-react";
import { getLoginUrl } from "./const";
import { Button } from "./components/ui/button";

// Main layout with tab navigation
function MainLayout() {
  const [location, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  
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
      <div className="flex items-center justify-center min-h-screen">
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
  
  const isNotesTab = location === "/" || location === "/notes";
  const isTodoTab = location === "/todo";
  const isHabitTab = location === "/habits";
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar with Tabs */}
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
        
        {/* Spacer */}
        <div className="flex-1" />
      </aside>
      
      {/* Main Content Area */}
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

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <MainLayout />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
