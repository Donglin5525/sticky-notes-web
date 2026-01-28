import { useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

interface TaskUpdate {
  id: number;
  isCompleted?: boolean;
  title?: string;
  quadrant?: "priority" | "strategic" | "trivial" | "trap";
  notes?: string;
  sortOrder?: number;
}

interface UseTaskBatchSyncOptions {
  /** Debounce interval in milliseconds (default: 2000ms) */
  debounceMs?: number;
  /** Callback when sync completes */
  onSyncComplete?: () => void;
  /** Callback when sync fails */
  onSyncError?: (error: Error) => void;
}

/**
 * Custom hook for batching task updates and syncing them to the server
 * with debounced requests to reduce network overhead and improve UX
 */
export function useTaskBatchSync(options: UseTaskBatchSyncOptions = {}) {
  const { debounceMs = 2000, onSyncComplete, onSyncError } = options;
  
  // Pending updates queue
  const pendingUpdates = useRef<Map<number, TaskUpdate>>(new Map());
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  
  const utils = trpc.useUtils();
  
  const batchUpdateMutation = trpc.dailyTasks.batchUpdate.useMutation({
    onSuccess: () => {
      isSyncingRef.current = false;
      onSyncComplete?.();
    },
    onError: (error) => {
      isSyncingRef.current = false;
      onSyncError?.(error as unknown as Error);
    },
  });
  
  // Flush pending updates to server
  const flushUpdates = useCallback(() => {
    if (pendingUpdates.current.size === 0 || isSyncingRef.current) {
      return;
    }
    
    isSyncingRef.current = true;
    const updates = Array.from(pendingUpdates.current.values());
    pendingUpdates.current.clear();
    
    batchUpdateMutation.mutate({ updates });
  }, [batchUpdateMutation]);
  
  // Schedule a sync after debounce period
  const scheduleSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      flushUpdates();
    }, debounceMs);
  }, [debounceMs, flushUpdates]);
  
  // Queue an update for a task
  const queueUpdate = useCallback((update: TaskUpdate) => {
    // Merge with existing pending update for the same task
    const existing = pendingUpdates.current.get(update.id);
    if (existing) {
      pendingUpdates.current.set(update.id, { ...existing, ...update });
    } else {
      pendingUpdates.current.set(update.id, update);
    }
    
    scheduleSync();
  }, [scheduleSync]);
  
  // Force immediate sync (e.g., before page unload)
  const forceSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    flushUpdates();
  }, [flushUpdates]);
  
  // Check if there are pending updates
  const hasPendingUpdates = useCallback(() => {
    return pendingUpdates.current.size > 0;
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      // Flush any remaining updates on unmount
      if (pendingUpdates.current.size > 0) {
        flushUpdates();
      }
    };
  }, [flushUpdates]);
  
  // Sync before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingUpdates.current.size > 0) {
        // Use sendBeacon for reliable delivery on page unload
        // Note: This is a simplified version; actual implementation might need adjustment
        forceSync();
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [forceSync]);
  
  return {
    queueUpdate,
    forceSync,
    hasPendingUpdates,
    isSyncing: batchUpdateMutation.isPending,
  };
}
