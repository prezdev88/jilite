'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Tag, Search } from 'lucide-react';
import { Project, Status, Task, Label } from '@prisma/client';
import { TaskWithLabels } from '@/lib/task-types';
import { TaskDetails } from '@/components/task-details';
import { TaskLabels } from '@/components/task-labels';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type BoardProject = Project & { 
  statuses: Status[]; 
  labels: Label[]; 
  tasks: TaskWithLabels[];
};

export default function BacklogView({ project }: { project: BoardProject }) {
  const [tasks, setTasks] = useState<TaskWithLabels[]>(project.tasks);
  const [labels, setLabels] = useState<Label[]>(project.labels);
  const [selectedTask, setSelectedTask] = useState<TaskWithLabels | null>(null);
  
  const [query, setQuery] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDetail, setNewTaskDetail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function handleCreateTask(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !newTaskTitle.trim()) return;
    setPending(true);
    setError('');

    try {
      const response = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          detail: newTaskDetail.trim(),
          projectId: project.id,
          // Not passing statusId intentionally so it stays in the backlog
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Hubo un error al crear la tarea.');
        return;
      }
      setTasks([...tasks, result]);
      setIsAddingTask(false);
      setNewTaskTitle('');
      setNewTaskDetail('');
    } catch {
      setError('Error de red al crear la tarea.');
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteTask() {
    if (!selectedTask || pending) return;
    setPending(true);
    try {
      await fetch(`/api/v1/tasks?taskId=${selectedTask.id}`, { method: 'DELETE' });
      setTasks(current => current.filter(t => t.id !== selectedTask.id));
      setSelectedTask(null);
      setIsConfirmingDelete(false);
    } catch {
      setError('No pudimos eliminar la tarea. Inténtalo de nuevo.');
    } finally {
      setPending(false);
    }
  }

  const visibleTasks = tasks.filter(task => 
    !query || task.title.toLowerCase().includes(query.toLowerCase()) || 
    task.number.toString().includes(query)
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="board-toolbar" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <div className="flex items-center gap-4">
          <Button disabled={pending} onClick={() => setIsAddingTask(true)}>
            <Plus size={16} /> Nueva tarea
          </Button>
          <span className="board-summary">{tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}</span>
        </div>
        <div className="search-field">
          <Search size={16} />
          <input aria-label="Buscar tareas" placeholder="Buscar tareas…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {isAddingTask && (
          <form className="task-create-form mb-4" onSubmit={handleCreateTask}>
            <label htmlFor="task-title-backlog">Nueva tarea en el Backlog</label>
            <Input id="task-title-backlog" autoFocus placeholder="¿Qué hay que hacer?" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required />
            <Textarea aria-label="Descripción de la tarea" placeholder="Añade un poco de contexto (opcional)" value={newTaskDetail} onChange={e => setNewTaskDetail(e.target.value)} rows={3} />
            <div className="flex gap-2">
              <Button size="sm" type="submit" disabled={pending || !newTaskTitle.trim()}>{pending ? 'Guardando…' : 'Crear tarea'}</Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setIsAddingTask(false)}>Cancelar</Button>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </form>
        )}

        <div className="flex flex-col gap-2">
          {visibleTasks.map(task => (
            <div 
              key={task.id} 
              className="flex items-center justify-between p-3 bg-[#1b1b20] border border-[#2e2e35] rounded-md hover:border-[#494952] cursor-pointer transition-colors"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex items-center gap-4">
                <span className="entity-code text-xs w-16">{project.code}-{task.number}</span>
                <span className="font-medium text-sm text-gray-200">{task.title}</span>
                {task.status ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    [
                      'bg-blue-900/30 text-blue-400 border-blue-800/50',
                      'bg-amber-900/30 text-amber-400 border-amber-800/50',
                      'bg-purple-900/30 text-purple-400 border-purple-800/50',
                      'bg-pink-900/30 text-pink-400 border-pink-800/50',
                      'bg-emerald-900/30 text-emerald-400 border-emerald-800/50'
                    ][Math.abs(task.status.order) % 5]
                  }`}>
                    {task.status.name}
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#29292f] text-gray-400 px-2 py-0.5 rounded-full border border-[#393941]">
                    Backlog
                  </span>
                )}
              </div>
              <div>
                <TaskLabels labels={task.labels} />
              </div>
            </div>
          ))}
          
          {visibleTasks.length === 0 && !isAddingTask && (
            <div className="text-center p-10 text-gray-500 text-sm border border-dashed border-[#2e2e35] rounded-md">
              No hay tareas en el backlog.
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedTask} onOpenChange={open => { if (!open && !pending) setSelectedTask(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogDescription>
              <Link className="entity-code" href={`/tasks/${project.code}-${selectedTask?.number}`}>{project.code}-{selectedTask?.number}</Link>
            </DialogDescription>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <TaskDetails 
              key={selectedTask.id} 
              task={selectedTask} 
              availableLabels={labels} 
              disabled={pending} 
              onBusyChange={setPending} 
              onLabelCreated={label => {
                setLabels(current => current.some(item => item.id === label.id)
                  ? current
                  : [...current, label].sort((first, second) => first.name.localeCompare(second.name, 'es')));
              }} 
              onSaved={updated => {
                setTasks(current => current.map(task => task.id === updated.id ? updated : task));
                setSelectedTask(updated);
              }} 
            />
          )}
          {error && <p role="alert" className="error-message">{error}</p>}
          <DialogFooter className="sm:justify-between">
            <Button variant="destructive" disabled={pending} onClick={() => setIsConfirmingDelete(true)}>
              <Trash2 size={15} /> Eliminar tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmingDelete} onOpenChange={open => { if (!pending) setIsConfirmingDelete(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar tarea</DialogTitle>
            <DialogDescription>¿Estás seguro de que quieres eliminar la tarea "{selectedTask?.title}"? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setIsConfirmingDelete(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={pending} onClick={handleDeleteTask}>{pending ? 'Eliminando…' : 'Sí, eliminar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
