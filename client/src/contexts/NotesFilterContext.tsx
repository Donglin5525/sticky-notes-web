import { createContext, useContext, useState, ReactNode } from "react";

interface NotesFilterContextType {
  filterTag: string | null;
  setFilterTag: (tag: string | null) => void;
  allTags: string[];
  setAllTags: (tags: string[]) => void;
}

const NotesFilterContext = createContext<NotesFilterContextType | null>(null);

export function NotesFilterProvider({ children }: { children: ReactNode }) {
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  return (
    <NotesFilterContext.Provider
      value={{ filterTag, setFilterTag, allTags, setAllTags }}
    >
      {children}
    </NotesFilterContext.Provider>
  );
}

export function useNotesFilter() {
  const context = useContext(NotesFilterContext);
  if (!context) {
    throw new Error("useNotesFilter must be used within NotesFilterProvider");
  }
  return context;
}
