import { NoteCard } from '@/components/NoteCard';
import { NoteEditor } from '@/components/NoteEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NoteColor, useNoteStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Trash2, 
  LayoutGrid, 
  Palette,
  Github,
  Menu
} from 'lucide-react';
import { BackupManager } from '@/components/BackupManager';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const colors: { value: NoteColor | 'all'; label: string; class: string }[] = [
  { value: 'all', label: 'All', class: 'bg-white border-2 border-gray-200' },
  { value: 'yellow', label: 'Yellow', class: 'bg-note-yellow' },
  { value: 'green', label: 'Green', class: 'bg-note-green' },
  { value: 'blue', label: 'Blue', class: 'bg-note-blue' },
  { value: 'pink', label: 'Pink', class: 'bg-note-pink' },
  { value: 'purple', label: 'Purple', class: 'bg-note-purple' },
  { value: 'orange', label: 'Orange', class: 'bg-note-orange' },
];

export default function Home() {
  const { 
    notes, 
    addNote, 
    searchQuery, 
    setSearchQuery, 
    filterColor, 
    setFilterColor,
    emptyTrash 
  } = useNoteStore();
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  const filteredNotes = notes.filter((note: import('@/lib/store').Note) => {
    const matchesSearch = (note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesColor = filterColor === 'all' || note.color === filterColor;
    const matchesTrash = showTrash ? note.isDeleted : !note.isDeleted;
    
    return matchesSearch && matchesColor && matchesTrash;
  });

  const handleAddNote = () => {
    const newId = addNote();
    setSelectedNoteId(newId);
    setShowTrash(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/20 bg-sidebar/50 backdrop-blur-xl p-4 gap-6 z-10">
        <div className="flex items-center gap-2 px-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
            Sticky Zen
          </h1>
        </div>

        <Button 
          size="lg" 
          className="w-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
          onClick={handleAddNote}
        >
          <Plus className="mr-2 h-5 w-5" /> New Note
        </Button>

        <div className="space-y-4">
          <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Filters
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search notes..." 
              className="pl-9 bg-white/50 border-white/20 focus:bg-white/80 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
              <Palette className="h-4 w-4" /> Colors
            </div>
            <div className="grid grid-cols-4 gap-2 px-2">
              {colors.map((c) => (
                <button
                  key={c.value}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50",
                    c.class,
                    filterColor === c.value && "ring-2 ring-primary ring-offset-2 scale-110 shadow-md"
                  )}
                  onClick={() => setFilterColor(c.value)}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          
          <BackupManager />
        </div>

        <div className="mt-auto pt-4 border-t border-white/10">
          <Button 
            variant={showTrash ? "secondary" : "ghost"} 
            className={cn("w-full justify-start", showTrash && "bg-white/50")}
            onClick={() => setShowTrash(!showTrash)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> 
            {showTrash ? 'View Notes' : 'Trash'}
          </Button>
          
          {showTrash && filteredNotes.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full mt-2"
              onClick={emptyTrash}
            >
              Empty Trash
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 bg-background/80 backdrop-blur-md border-b border-white/10 z-20">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg">Sticky Zen</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {/* Mobile Sidebar Content - Reused logic */}
            <div className="flex flex-col h-full p-4 gap-6 bg-sidebar/50">
              <Button size="lg" className="w-full" onClick={handleAddNote}>
                <Plus className="mr-2 h-5 w-5" /> New Note
              </Button>
              {/* ... (Simplified for brevity, would mirror desktop sidebar) ... */}
              <div className="space-y-4">
                <Input 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      className={cn("w-8 h-8 rounded-full", c.class)}
                      onClick={() => setFilterColor(c.value)}
                    />
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => setShowTrash(!showTrash)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> {showTrash ? 'Notes' : 'Trash'}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative h-full overflow-hidden flex flex-col md:flex-row">
        {/* Note List */}
        <div className={cn(
          "flex-1 h-full transition-all duration-500 ease-in-out p-4 md:p-8 overflow-hidden flex flex-col",
          selectedNoteId ? "hidden md:flex md:w-1/3 md:max-w-sm border-r border-white/10" : "w-full"
        )}>
          <div className="flex items-center justify-between mb-6 mt-16 md:mt-0">
            <h2 className="text-2xl font-bold text-foreground/80">
              {showTrash ? 'Trash' : filterColor === 'all' ? 'All Notes' : `${filterColor.charAt(0).toUpperCase() + filterColor.slice(1)} Notes`}
            </h2>
            <span className="text-sm text-muted-foreground bg-white/30 px-2 py-1 rounded-full">
              {filteredNotes.length}
            </span>
          </div>

          <ScrollArea className="flex-1 -mx-4 px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
              {/* Masonry-like grid for when no note is selected, single column when selected */}
              <div className={cn(
                "contents",
                selectedNoteId && "md:flex md:flex-col"
              )}>
                {filteredNotes.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      {showTrash ? <Trash2 className="h-8 w-8 opacity-50" /> : <LayoutGrid className="h-8 w-8 opacity-50" />}
                    </div>
                    <p>No notes found</p>
                  </div>
                ) : (
                  filteredNotes.map((note: import('@/lib/store').Note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={cn(
                        selectedNoteId === note.id && "ring-2 ring-primary ring-offset-2 scale-[1.02]"
                      )}
                    />
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
          
          {/* Mobile FAB */}
          <Button
            size="icon"
            className="md:hidden absolute bottom-6 right-6 h-14 w-14 rounded-full shadow-xl shadow-primary/30 z-30"
            onClick={handleAddNote}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* Editor Panel */}
        <div className={cn(
          "absolute inset-0 md:static md:flex-1 bg-background/50 backdrop-blur-3xl transition-all duration-500 ease-in-out z-40 md:z-0 p-4 md:p-8 flex items-center justify-center",
          selectedNoteId ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 md:translate-x-0 md:opacity-100 md:bg-transparent md:backdrop-blur-none"
        )}>
          {selectedNoteId ? (
            <div className="w-full max-w-3xl h-full md:h-[90%]">
              <NoteEditor 
                noteId={selectedNoteId} 
                onClose={() => setSelectedNoteId(null)} 
              />
            </div>
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center text-muted-foreground/50">
              <LayoutGrid className="h-24 w-24 mb-4 opacity-20" />
              <p className="text-xl font-medium">Select a note to view</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
