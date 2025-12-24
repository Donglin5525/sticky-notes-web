import { useNoteStore } from '@/lib/store';
import { Download, Upload } from 'lucide-react';
import { useRef } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function BackupManager() {
  const { notes } = useNoteStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sticky-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup exported successfully');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedNotes = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedNotes)) {
          // In a real app, we'd validate the schema here
          // For now, we'll just merge them or replace them
          // Let's replace for simplicity, but warn user
          if (confirm('This will replace your current notes. Are you sure?')) {
            useNoteStore.setState({ notes: importedNotes });
            toast.success('Notes imported successfully');
          }
        } else {
          toast.error('Invalid backup file format');
        }
      } catch (error) {
        toast.error('Failed to parse backup file');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex gap-2 mt-4 px-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-1 bg-white/50 border-white/20 hover:bg-white/80"
        onClick={handleExport}
      >
        <Download className="mr-2 h-4 w-4" /> Backup
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex-1 bg-white/50 border-white/20 hover:bg-white/80"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" /> Restore
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".json"
        onChange={handleImport}
      />
    </div>
  );
}
