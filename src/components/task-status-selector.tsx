import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TaskStatus } from '@/components/task-status';
import type { Status } from '@prisma/client';

export function TaskStatusSelector({ 
  statusId, 
  statuses, 
  onChange,
  disabled
}: { 
  statusId: string | null; 
  statuses: Status[]; 
  onChange: (statusId: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentStatus = statuses.find(s => s.id === statusId) || null;

  async function handleSelect(id: string) {
    if (id === statusId) return;
    setLoading(true);
    try {
      await onChange(id);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled || loading}>
        <button className={`hover:opacity-80 transition-opacity outline-none ${disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          <TaskStatus status={currentStatus} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {statuses.map(status => (
          <DropdownMenuItem 
            key={status.id} 
            onClick={(e) => { e.preventDefault(); handleSelect(status.id); }}
            className="cursor-pointer flex items-center justify-between"
          >
            <TaskStatus status={status} />
            {status.id === statusId && <span className="text-xs text-blue-400">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
