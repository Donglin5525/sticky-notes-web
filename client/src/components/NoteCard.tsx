import { Note, useNoteStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Trash2, RotateCcw, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
  className?: string;
}

const colorMap = {
  yellow: 'bg-note-yellow',
  green: 'bg-note-green',
  blue: 'bg-note-blue',
  pink: 'bg-note-pink',
  purple: 'bg-note-purple',
  orange: 'bg-note-orange',
};

export function NoteCard({ note, onClick, className }: NoteCardProps) {
  const { restoreNote, permanentlyDeleteNote } = useNoteStore();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    permanentlyDeleteNote(note.id);
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    restoreNote(note.id);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col p-6 rounded-[var(--radius)] transition-all duration-300 cursor-pointer',
        'border border-white/20 shadow-sm hover:shadow-md',
        'backdrop-blur-md',
        colorMap[note.color],
        note.isDeleted ? 'opacity-70 grayscale-[0.5]' : 'hover:-translate-y-1',
        className
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg line-clamp-1 text-foreground/90">
          {note.title || '无标题便签'}
        </h3>
        {note.isDeleted && (
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-white/40"
              onClick={handleRestore}
              title="恢复"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-destructive/20 text-destructive"
              onClick={handleDelete}
              title="永久删除"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <div 
        className="text-sm text-foreground/70 line-clamp-4 mb-4 flex-grow whitespace-pre-wrap font-sans"
      >
        {note.content || '无内容...'}
      </div>

      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="bg-black/5 text-foreground/60 text-[10px] h-5 px-1.5">
              {tag}
            </Badge>
          ))}
          {note.tags.length > 3 && (
            <Badge variant="secondary" className="bg-black/5 text-foreground/60 text-[10px] h-5 px-1.5">
              +{note.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {note.images.length > 0 && (
        <div className="mb-4 relative h-24 w-full overflow-hidden rounded-md">
          <img 
            src={note.images[0]} 
            alt="Note attachment" 
            className="object-cover w-full h-full opacity-90 hover:opacity-100 transition-opacity"
          />
          {note.images.length > 1 && (
            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
              +{note.images.length - 1}
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex justify-between items-center text-xs text-foreground/50">
        <span>{formatDistanceToNow(note.updatedAt, { addSuffix: true, locale: zhCN })}</span>
      </div>
    </div>
  );
}
