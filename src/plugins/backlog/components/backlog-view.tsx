'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Search, X } from 'lucide-react';
import { Project, Status, Label } from '@prisma/client';
import { TaskWithLabels } from '@/lib/task-types';
import { TaskDetails } from '@/components/task-details';
import { TaskLabels, taskLabelStyle } from '@/components/task-labels';
import { automaticLabelColor, labelNameKey, normalizeLabelName, parseLabelNames } from '@/lib/labels';
import { TaskStatusSelector } from '@/components/task-status-selector';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

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
  const [newTaskStatusId, setNewTaskStatusId] = useState<string | null>(null);
  const [newTaskLabelIds, setNewTaskLabelIds] = useState<string[]>([]);
  const [newLabelNames, setNewLabelNames] = useState('');
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const lastSyncedTasks = useRef(project.tasks);
  const lastSyncedLabels = useRef(project.labels);

  useEffect(() => {
    if (pending || creatingLabel) {
      return;
    }

    if (lastSyncedTasks.current !== project.tasks) {
      setTasks(project.tasks);
      setSelectedTask(current => {
        if (!current) {
          return null;
        }

        return project.tasks.find(task => task.id === current.id) || null;
      });
      lastSyncedTasks.current = project.tasks;
    }

    if (lastSyncedLabels.current !== project.labels) {
      setLabels(project.labels);
      lastSyncedLabels.current = project.labels;
    }
  }, [creatingLabel, pending, project.labels, project.tasks]);

  
  async function createLabels() {
    const names = parseLabelNames(newLabelNames);
    if (pending || creatingLabel || !names.length) return;
    setCreatingLabel(true);
    setError('');
    try {
      const response = await fetch('/api/v1/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, projectId: project.id }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error || 'Error'); return; }
      setLabels(current => [...current, ...result.labels.filter((l: Label) => !current.some(item => item.id === l.id))].sort((a, b) => a.name.localeCompare(b.name, 'es')));
      setNewTaskLabelIds(current => Array.from(new Set([...current, ...result.labels.map((l: Label) => l.id)])));
      setNewLabelNames('');
    } catch { setError('No pudimos crear la etiqueta.'); }
    finally { setCreatingLabel(false); }
  }

  function handleNewLabelKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void createLabels();
    }
  }

  function selectExistingSuggestion(label: Label) {
    setNewTaskLabelIds(current => current.includes(label.id) ? current : [...current, label.id]);
    const lastComma = newLabelNames.lastIndexOf(',');
    setNewLabelNames(lastComma < 0 ? '' : `${newLabelNames.slice(0, lastComma).trim()}, `);
  }

  const draftNames = newLabelNames.split(',').map(normalizeLabelName).filter(Boolean);
  const currentDraft = normalizeLabelName(newLabelNames.split(',').at(-1) || '');
  const currentDraftKey = labelNameKey(currentDraft);
  const matchingLabels = currentDraftKey ? labels.filter(label => labelNameKey(label.name).includes(currentDraftKey)).slice(0, 5) : [];

  
  function resetForm() {
    setNewTaskTitle('');
    setNewTaskDetail('');
    setNewTaskStatusId(null);
    setNewTaskLabelIds([]);
    setNewLabelNames('');
    setError('');
    setIsAddingTask(false);
  }

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
          detail: newTaskDetail.trim() || undefined,
          projectId: project.id,
          statusId: newTaskStatusId,
          labelIds: newTaskLabelIds,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Hubo un error al crear la tarea.');
        return;
      }
      setTasks(current => current.some(task => task.id === result.id)
        ? current.map(task => task.id === result.id ? result : task)
        : [...current, result]);
      resetForm();
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
          <form className="mb-4 bg-[#1b1b20] border border-[#2e2e35] rounded-lg p-5 flex flex-col gap-4 shadow-sm" onSubmit={handleCreateTask}>
            <div className="flex items-center justify-between border-b border-[#2e2e35] pb-3">
              <h3 className="text-sm font-medium text-gray-200">Nueva tarea</h3>
              <button type="button" onClick={resetForm} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="task-title-backlog" className="text-xs text-gray-400">Título</label>
              <Input id="task-title-backlog" autoFocus placeholder="¿Qué hay que hacer?" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required className="bg-[#131316] border-[#2e2e35]" />
            </div>
            
            <div className="flex gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-xs text-gray-400">Estado inicial</label>
                <select className="bg-[#131316] border border-[#2e2e35] h-10 px-3 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" value={newTaskStatusId || ''} onChange={e => setNewTaskStatusId(e.target.value || null)}>
                  <option value="">Backlog</option>
                  {project.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2" data-color-mode="dark">
              <label className="text-xs text-gray-400">Descripción (opcional)</label>
              <MDEditor value={newTaskDetail} onChange={val => setNewTaskDetail(val || '')} textareaProps={{ placeholder: 'Añade un poco de contexto...' }} preview="edit" height={180} className="border-[#2e2e35]" />
            </div>

            <fieldset className="label-editor pt-2 border-none p-0 m-0">
              <legend className="text-xs text-gray-400 mb-2">Etiquetas</legend>
              {labels.length > 0 ? (
                <div className="label-options mb-2">
                  {labels.map(label => {
                    const selected = newTaskLabelIds.includes(label.id);
                    return (
                      <button key={label.id} type="button" className={`label-option${selected ? ' selected' : ''}`} style={taskLabelStyle(label.color)} aria-pressed={selected} disabled={pending || creatingLabel} onClick={() => { if (selected) setNewTaskLabelIds(newTaskLabelIds.filter(id => id !== label.id)); else setNewTaskLabelIds([...newTaskLabelIds, label.id]); }}>
                        <span className="task-label-dot" aria-hidden="true" />{label.name}
                      </button>
                    );
                  })}
                </div>
              ) : <p className="field-hint mb-2">Este proyecto todavía no tiene etiquetas.</p>}
              <div className="label-create-row mb-1">
                <Input aria-label="Nombres de las nuevas etiquetas" placeholder="Urgente, Backend, Diseño" value={newLabelNames} disabled={pending || creatingLabel} onChange={event => setNewLabelNames(event.target.value)} onKeyDown={handleNewLabelKeyDown} className="bg-[#131316] border-[#2e2e35]" />
                <Button type="button" variant="outline" size="icon" disabled={pending || creatingLabel || !parseLabelNames(newLabelNames).length} onClick={() => void createLabels()}><Plus size={16} /></Button>
              </div>
              <p className="field-hint mb-2">Separa varias etiquetas con comas. El color se asigna automáticamente.</p>
              
              {draftNames.length > 0 && (
                <div className="label-draft-list mb-2">
                  {draftNames.map((name, index) => {
                    const existing = labels.find(label => labelNameKey(label.name) === labelNameKey(name));
                    const repeated = draftNames.findIndex(candidate => labelNameKey(candidate) === labelNameKey(name)) !== index;
                    const newLabelIndex = draftNames.slice(0, index).filter((candidate, candidateIndex, all) => all.findIndex(item => labelNameKey(item) === labelNameKey(candidate)) === candidateIndex && !labels.some(label => labelNameKey(label.name) === labelNameKey(candidate))).length;
                    const color = existing?.color || automaticLabelColor(labels.length + newLabelIndex);
                    return (
                      <span className={`label-draft${existing || repeated ? ' existing' : ''}`} style={taskLabelStyle(color)} key={`${labelNameKey(name)}-${index}`}>
                        <span className="task-label-dot" aria-hidden="true" />{existing?.name || name}
                        <small>{repeated ? 'repetida' : existing ? 'ya existe' : 'nueva'}</small>
                      </span>
                    );
                  })}
                </div>
              )}
              {matchingLabels.length > 0 && (
                <div className="existing-label-suggestions">
                  <span>Coincidencias:</span>
                  {matchingLabels.map(label => (
                    <button type="button" style={taskLabelStyle(label.color)} disabled={pending || creatingLabel} onClick={() => selectExistingSuggestion(label)} key={label.id}>
                      <span className="task-label-dot" aria-hidden="true" /> {label.name}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>

            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            <div className="flex gap-3 justify-end pt-2 border-t border-[#2e2e35]">
              <Button size="sm" variant="ghost" disabled={pending} onClick={resetForm} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">Cancelar</Button>
              <Button size="sm" type="submit" disabled={pending || !newTaskTitle.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:border-emerald-700">{pending ? 'Guardando…' : 'Crear tarea'}</Button>
            </div>
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
        <DialogContent className="task-detail-dialog">
          <DialogHeader>
            <DialogDescription className="flex items-center gap-2">
              <Link className="entity-code" href={`/tasks/${project.code}-${selectedTask?.number}`}>{project.code}-{selectedTask?.number}</Link>
              <span>·</span>
              {selectedTask && (
                <TaskStatusSelector 
                  statusId={selectedTask.statusId} 
                  statuses={project.statuses} 
                  onChange={async (newStatusId) => {
                    const previousTasks = tasks;
                    setPending(true);
                    setError('');
                    setTasks(current => current.map(t => t.id === selectedTask.id ? { ...t, statusId: newStatusId, status: project.statuses.find(s => s.id === newStatusId) || null } : t));
                    setSelectedTask(current => current ? { ...current, statusId: newStatusId, status: project.statuses.find(s => s.id === newStatusId) || null } : null);
                    try {
                      await fetch('/api/v1/tasks/move', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ taskId: selectedTask.id, newStatusId, newOrder: selectedTask.order })
                      }).then(res => { if (!res.ok) throw new Error(); });
                    } catch {
                      setTasks(previousTasks);
                      setSelectedTask(previousTasks.find(t => t.id === selectedTask.id) || null);
                      setError('No pudimos mover la tarea.');
                    } finally {
                      setPending(false);
                    }
                  }} 
                  disabled={pending} 
                />
              )}
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
            <DialogDescription>¿Estás seguro de que quieres eliminar la tarea &quot;{selectedTask?.title}&quot;? Esta acción no se puede deshacer.</DialogDescription>
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
