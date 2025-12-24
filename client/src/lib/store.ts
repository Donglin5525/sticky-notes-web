import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type NoteColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange';

export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
  images: string[]; // Base64 strings for simplicity in this static version
}

interface NoteState {
  notes: Note[];
  searchQuery: string;
  filterColor: NoteColor | 'all';
  
  // Actions
  addNote: () => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void; // Move to trash
  restoreNote: (id: string) => void; // Restore from trash
  permanentlyDeleteNote: (id: string) => void;
  emptyTrash: () => void;
  setSearchQuery: (query: string) => void;
  setFilterColor: (color: NoteColor | 'all') => void;
  addImageToNote: (id: string, imageBase64: string) => void;
}

type NoteStoreCreator = StateCreator<NoteState, [["zustand/persist", unknown]]>;

const createNoteStore: NoteStoreCreator = (set, get) => ({
  notes: [],
  searchQuery: '',
  filterColor: 'all',

  addNote: () => {
    const newNote: Note = {
      id: nanoid(),
      title: '',
      content: '',
      color: 'yellow',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
      images: [],
    };
    set((state) => ({ notes: [newNote, ...state.notes] }));
    return newNote.id;
  },

  updateNote: (id: string, updates: Partial<Note>) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id
          ? { ...note, ...updates, updatedAt: Date.now() }
          : note
      ),
    }));
  },

  deleteNote: (id: string) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, isDeleted: true, updatedAt: Date.now() } : note
      ),
    }));
  },

  restoreNote: (id: string) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, isDeleted: false, updatedAt: Date.now() } : note
      ),
    }));
  },

  permanentlyDeleteNote: (id: string) => {
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
    }));
  },

  emptyTrash: () => {
    set((state) => ({
      notes: state.notes.filter((note) => !note.isDeleted),
    }));
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  
  setFilterColor: (color: NoteColor | 'all') => set({ filterColor: color }),

  addImageToNote: (id: string, imageBase64: string) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id
          ? { ...note, images: [...note.images, imageBase64], updatedAt: Date.now() }
          : note
      ),
    }));
  },
});

export const useNoteStore = create<NoteState>()(
  persist(
    createNoteStore,
    {
      name: 'sticky-notes-storage',
    }
  )
);
