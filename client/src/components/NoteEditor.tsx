import { Note, NoteColor, useNoteStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  X, 
  Trash2, 
  Image as ImageIcon, 
  MoreVertical, 
  Check,
  Clock,
  Tag,
  Plus
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from './ui/scroll-area';

interface NoteEditorProps {
  noteId: string;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const colors: { value: NoteColor; label: string; class: string }[] = [
  { value: 'yellow', label: 'Yellow', class: 'bg-note-yellow' },
  { value: 'green', label: 'Green', class: 'bg-note-green' },
  { value: 'blue', label: 'Blue', class: 'bg-note-blue' },
  { value: 'pink', label: 'Pink', class: 'bg-note-pink' },
  { value: 'purple', label: 'Purple', class: 'bg-note-purple' },
  { value: 'orange', label: 'Orange', class: 'bg-note-orange' },
];

const colorMap = {
  yellow: 'bg-note-yellow',
  green: 'bg-note-green',
  blue: 'bg-note-blue',
  pink: 'bg-note-pink',
  purple: 'bg-note-purple',
  orange: 'bg-note-orange',
};

export function NoteEditor({ noteId, onClose }: NoteEditorProps) {
  const { notes, updateNote, deleteNote, addImageToNote } = useNoteStore();
  const note = notes.find((n) => n.id === noteId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [noteId]);

  if (!note) return null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    updateNote(noteId, { title: newTitle });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    updateNote(noteId, { content: newContent });
  };

  const handleColorChange = (color: NoteColor) => {
    updateNote(noteId, { color });
  };

  const handleDelete = () => {
    deleteNote(noteId);
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        addImageToNote(noteId, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !note.tags?.includes(newTag.trim())) {
      const updatedTags = [...(note.tags || []), newTag.trim()];
      updateNote(noteId, { tags: updatedTags });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = note.tags?.filter(tag => tag !== tagToRemove) || [];
    updateNote(noteId, { tags: updatedTags });
  };

  return (
    <div className={cn(
      "flex flex-col h-full w-full rounded-[var(--radius)] shadow-2xl overflow-hidden transition-colors duration-500",
      colorMap[note.color]
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-black/5 bg-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-foreground/60">
          <Clock className="h-3 w-3" />
          <span>编辑于 {formatDistanceToNow(note.updatedAt, { addSuffix: true, locale: zhCN })}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black/5">
                <div className={cn("w-4 h-4 rounded-full border border-black/10", colorMap[note.color])} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-panel border-none p-2">
              <div className="grid grid-cols-3 gap-2">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    className={cn(
                      "w-8 h-8 rounded-full border border-black/10 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50",
                      c.class,
                      note.color === c.value && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => handleColorChange(c.value)}
                    title={c.label}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-black/5"
            onClick={() => fileInputRef.current?.click()}
            title="添加图片"
          >
            <ImageIcon className="h-4 w-4 text-foreground/70" />
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleImageUpload}
          />

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
            onClick={handleDelete}
            title="删除便签"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-black/5"
            onClick={onClose}
          >
            <X className="h-5 w-5 text-foreground/70" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="标题"
          className="w-full bg-transparent border-none text-2xl font-bold placeholder:text-foreground/30 focus:outline-none mb-4 text-foreground/90"
        />
        
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="开始输入..."
          className="w-full min-h-[300px] bg-transparent border-none resize-none text-lg leading-relaxed placeholder:text-foreground/30 focus:outline-none text-foreground/80 font-sans"
        />

        {/* Tags Section */}
        <div className="flex flex-wrap gap-2 mb-6">
          {note.tags?.map(tag => (
            <Badge key={tag} variant="secondary" className="bg-black/5 hover:bg-black/10 text-foreground/70 gap-1 pr-1">
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-primary px-2">
                <Plus className="h-3 w-3 mr-1" /> 添加标签
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="flex gap-2">
                <Input 
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="新标签..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button size="sm" className="h-8 w-8 p-0" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Images Grid */}
        {note.images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            {note.images.map((img, idx) => (
              <div key={idx} className="relative group rounded-lg overflow-hidden shadow-sm border border-black/5">
                <img src={img} alt={`Attachment ${idx + 1}`} className="w-full h-auto object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
