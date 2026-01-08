import { Note, getQuadrant, quadrantConfig, Quadrant } from "@/types/note";
import { NoteCard } from "./NoteCard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

interface QuadrantViewProps {
  notes: Note[];
  selectedNoteId: number | null;
  onNoteClick: (note: Note) => void;
  onRestore?: (id: number) => void;
  onPermanentDelete?: (id: number) => void;
}

const quadrantOrder: Quadrant[] = ["do-first", "schedule", "delegate", "eliminate"];

export function QuadrantView({
  notes,
  selectedNoteId,
  onNoteClick,
  onRestore,
  onPermanentDelete,
}: QuadrantViewProps) {
  // Group notes by quadrant
  const groupedNotes = quadrantOrder.reduce((acc, quadrant) => {
    acc[quadrant] = notes.filter((note) => getQuadrant(note) === quadrant);
    return acc;
  }, {} as Record<Quadrant, Note[]>);

  return (
    <div className="grid grid-cols-2 gap-4 h-full p-4">
      {quadrantOrder.map((quadrant) => {
        const config = quadrantConfig[quadrant];
        const quadrantNotes = groupedNotes[quadrant];

        return (
          <div
            key={quadrant}
            className={cn(
              "rounded-2xl border-2 overflow-hidden flex flex-col",
              "bg-card/50 backdrop-blur-sm",
              config.color
            )}
          >
            {/* Quadrant Header */}
            <div className="p-4 border-b border-black/5 bg-white/30">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <h3 className={cn("font-bold text-lg", config.textColor)}>
                    {config.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {config.description} · {quadrantNotes.length} 项
                  </p>
                </div>
              </div>
            </div>

            {/* Notes Grid */}
            <ScrollArea className="flex-1 p-3">
              {quadrantNotes.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  暂无便签
                </div>
              ) : (
                <div className="grid gap-3">
                  {quadrantNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => onNoteClick(note)}
                      isSelected={selectedNoteId === note.id}
                      onRestore={onRestore}
                      onPermanentDelete={onPermanentDelete}
                      className="h-auto"
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
