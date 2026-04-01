import { useState, useCallback } from "react";

export interface PlayerSelection {
  selectedIds: Set<string>;
  isSelectMode: boolean;
  toggleSelectMode: () => void;
  togglePlayer: (id: string) => void;
  clearSelection: () => void;
  setSelectedIds: (ids: Set<string>) => void;
}

export function usePlayerSelection(initialIds: string[] = [], initialMode?: boolean): PlayerSelection {
  const [selectedIds, setSelectedIdsState] = useState<Set<string>>(new Set(initialIds));
  const [isSelectMode, setIsSelectMode] = useState(initialMode ?? initialIds.length > 0);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => {
      const next = !prev;
      if (!next) setSelectedIdsState(new Set());
      return next;
    });
  }, []);

  const togglePlayer = useCallback((id: string) => {
    setSelectedIdsState((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIdsState(new Set());
    setIsSelectMode(false);
  }, []);

  const setSelectedIds = useCallback((ids: Set<string>) => {
    setSelectedIdsState(ids);
  }, []);

  return {
    selectedIds,
    isSelectMode,
    toggleSelectMode,
    togglePlayer,
    clearSelection,
    setSelectedIds,
  };
}
