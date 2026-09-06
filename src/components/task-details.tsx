'use client';

import { useState, type FormEvent } from 'react';
import type { Task } from '@prisma/client';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function TaskDetails({ task, onSaved, onBusyChange, disabled = false }: {
  task: Task;
  onSaved: (task: Task) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [detail, setDetail] = useState(task.detail || '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending || disabled || !title.trim()) return;
    setPending(true);
    onBusyChange?.(true);
    setError('');
    try {
      const response = await fetch('/api/v1/tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, title: title.trim(), detail }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'No pudimos guardar los cambios.');
        return;
      }
      onSaved(result);
      setEditing(false);
    } catch { setError('No pudimos guardar los cambios. Inténtalo de nuevo.'); }
    finally { setPending(false); onBusyChange?.(false); }
  }

  if (!editing) {
    return (
      <div className="task-detail">
        <div className="task-detail-heading">
          <h2>Descripción</h2>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => {
            setTitle(task.title); setDetail(task.detail || ''); setError(''); setEditing(true);
          }}><Pencil size={14} /> Editar detalles</Button>
        </div>
        <p>{task.detail || 'Sin descripción.'}</p>
      </div>
    );
  }

  return (
    <form className="task-edit-form" onSubmit={save}>
      <div className="form-field"><label htmlFor={`title-${task.id}`}>Título</label><Input id={`title-${task.id}`} autoFocus value={title} onChange={event => setTitle(event.target.value)} required disabled={pending || disabled} /></div>
      <div className="form-field"><label htmlFor={`detail-${task.id}`}>Descripción</label><Textarea id={`detail-${task.id}`} value={detail} onChange={event => setDetail(event.target.value)} rows={7} disabled={pending || disabled} /></div>
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className="task-edit-actions"><Button type="button" variant="outline" disabled={pending || disabled} onClick={() => setEditing(false)}>Cancelar edición</Button><Button type="submit" disabled={pending || disabled || !title.trim()}>{pending ? 'Guardando…' : 'Guardar cambios'}</Button></div>
    </form>
  );
}
