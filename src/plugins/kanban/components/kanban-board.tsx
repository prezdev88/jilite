'use client';
import "./kanban.css";

import { useState, useEffect, type FormEvent } from 'react';
import type { Status, Label, Project } from '@prisma/client';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Plus, Search, Tag, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { LabelFilterCombobox } from '@/components/label-filter-combobox';
import { TaskDetails } from '@/components/task-details';
import { TaskLabels } from '@/components/task-labels';
import { TaskStatus } from '@/components/task-status';
import { TaskStatusSelector } from '@/components/task-status-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { moveBoardTask } from '../kanban-ordering';
import { matchesTaskFilters } from '@/lib/task-filtering';
import type { TaskWithLabels } from '@/lib/task-types';

type BoardProject = Project & { statuses: Status[]; labels: Label[]; tasks: TaskWithLabels[] };

export default function KanbanBoard({ project }: { project: BoardProject }) {
  const [statuses, setStatuses] = useState(project.statuses);
  const [labels, setLabels] = useState(project.labels);
  const [tasks, setTasks] = useState(project.tasks);
  const [isMounted, setIsMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [activeLabelIds, setActiveLabelIds] = useState<string[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDetail, setNewTaskDetail] = useState('');
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [newStatusName, setNewStatusName] = useState('');
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithLabels | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => {
    setTasks(project.tasks);
    setStatuses(project.statuses);
    setLabels(project.labels);
    setActiveLabelIds(current => current.filter(labelId =>
      project.labels.some(label => label.id === labelId),
    ));
    
  }, [project.tasks, project.statuses, project.labels, project.name]);

  const hasActiveFilters = !!query.trim() || activeLabelIds.length > 0;

  function matchesFilters(task: TaskWithLabels) {
    return matchesTaskFilters(task, project.code, query, activeLabelIds);
  }

  async function request(url: string, method: string, body?: object) {
    const response = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error();
    return response.json();
  }

  async function onDragEnd({ source, destination, draggableId }: DropResult) {
    if (!destination || pending) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const previousTasks = tasks;
    const visibleTaskIds = new Set(tasks.filter(matchesFilters).map(task => task.id));
    const move = moveBoardTask(
      tasks,
      draggableId,
      destination.droppableId,
      destination.index,
      visibleTaskIds,
    );
    if (!move) return;
    setTasks(move.tasks);
    setPending(true);
    setError('');
    try {
      await request('/api/v1/tasks/move', 'POST', {
        taskId: draggableId,
        newStatusId: destination.droppableId,
        newOrder: move.destinationOrder,
      });
    } catch {
      setTasks(previousTasks);
      setError('No pudimos mover la tarea. Inténtalo de nuevo.');
    } finally { setPending(false); }
  }

  async function handleCreateTask(event: FormEvent, statusId: string) {
    event.preventDefault();
    if (!newTaskTitle.trim() || pending) return;
    setPending(true);
    setError('');
    try {
      const task: TaskWithLabels = await request('/api/v1/tasks', 'POST', { title: newTaskTitle.trim(), detail: newTaskDetail.trim(), projectId: project.id, statusId });
      setTasks(current => [...current, task]);
      setNewTaskTitle('');
      setNewTaskDetail('');
      setActiveStatus(null);
    } catch { setError('No pudimos crear la tarea. Inténtalo de nuevo.'); }
    finally { setPending(false); }
  }

  async function handleCreateStatus(event: FormEvent) {
    event.preventDefault();
    if (!newStatusName.trim() || pending) return;
    setPending(true);
    setError('');
    try {
      const status: Status = await request('/api/v1/statuses', 'POST', { name: newStatusName.trim(), projectId: project.id, order: statuses.length });
      setStatuses(current => [...current, status]);
      setNewStatusName('');
      setIsAddingStatus(false);
    } catch { setError('No pudimos crear la lista. Inténtalo de nuevo.'); }
    finally { setPending(false); }
  }

  async function handleDeleteTask() {
    if (!selectedTask || pending) return;
    setPending(true);
    setError('');
    try {
      await request('/api/v1/tasks?taskId=' + selectedTask.id, 'DELETE');
      setTasks(current => current.filter(task => task.id !== selectedTask.id));
      setSelectedTask(null);
      setIsConfirmingDelete(false);
    } catch { setError('No pudimos eliminar la tarea. Inténtalo de nuevo.'); }
    finally { setPending(false); }
  }

  function openTaskForm(statusId: string) {
    setActiveStatus(statusId);
    setNewTaskTitle('');
    setNewTaskDetail('');
    setError('');
    setQuery('');
    setActiveLabelIds([]);
  }

  const visibleTaskCount = tasks.filter(matchesFilters).length;

  return (
    <>
      <div className="board-toolbar" style={{ marginTop: '1rem' }}>
        <div className="flex items-center gap-4">
          <Button disabled={pending} onClick={() => statuses.length ? openTaskForm(statuses[0].id) : setIsAddingStatus(true)}><Plus size={16} /> {statuses.length ? 'Nueva tarea' : 'Nueva lista'}</Button>
          <span className="board-summary">{hasActiveFilters ? `${visibleTaskCount} de ` : ''}{tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}</span>
        </div>
        <div className="search-field"><Search size={16} /><input aria-label="Buscar tareas" placeholder="Buscar tareas…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><X size={14} /></button>}</div>
      </div>
      {labels.length > 0 && (
        <div className="label-filter-bar">
          <span className="label-filter-title"><Tag size={14} /> Filtrar por etiquetas</span>
          <LabelFilterCombobox labels={labels} value={activeLabelIds} onChange={setActiveLabelIds} />
          {activeLabelIds.length > 0 && <button className="clear-label-filters" type="button" onClick={() => setActiveLabelIds([])}><X size={13} /> Limpiar</button>}
        </div>
      )}
      {error && !selectedTask && <p role="alert" className="error-message">{error}</p>}
      {hasActiveFilters && <p className="board-hint">Se muestran las tareas que coinciden con todos los filtros. Puedes moverlas sin alterar el orden relativo de las tareas ocultas.</p>}
      {!isMounted ? <div className="board-loading" role="status">Preparando tu tablero…</div> : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-scroll">
            {statuses.map((status) => {
              const statusTasks = tasks.filter(task => task.statusId === status.id);
              const visibleTasks = statusTasks.filter(matchesFilters);
              return (
                <section key={status.id} className="kanban-board-column" aria-label={status.name}>
                  <div className="status-heading"><h2><TaskStatus status={status} /></h2><span className="count-badge">{hasActiveFilters ? visibleTasks.length + '/' : ''}{statusTasks.length}</span></div>
                  <Droppable droppableId={status.id} isDropDisabled={pending}>
                    {(provided, snapshot) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className={'task-dropzone' + (snapshot.isDraggingOver ? ' dragging-over' : '')}>
                        {visibleTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={pending}>
                            {(provided, snapshot) => (
                              <article
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="task-card-wrapper"
                                style={
                                  snapshot.isDropAnimating && provided.draggableProps.style
                                    ? { ...provided.draggableProps.style, transitionDuration: '0.05s' }
                                    : provided.draggableProps.style
                                }
                              >
                                <div
                                  className={'task-card' + (snapshot.isDragging ? ' is-dragging' : '')}
                                  onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('a')) return;
                                    setError('');
                                    setSelectedTask(task);
                                  }}
                                >
                                  <div className="task-card-copy">
                                    <Link className="entity-code task-code" href={`/tasks/${project.code}-${task.number}`}>{project.code}-{task.number}</Link>
                                    <div className="task-open"><h3>{task.title}</h3></div>
                                    <TaskLabels labels={task.labels} className="task-card-labels" />
                                  </div>
                                </div>
                              </article>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {!visibleTasks.length && !snapshot.isDraggingOver && <div className="status-empty">{hasActiveFilters ? 'Sin coincidencias' : 'Sin tareas'}</div>}
                        {activeStatus === status.id ? (
                          <form className="task-create-form" onSubmit={event => handleCreateTask(event, status.id)}>
                            <label htmlFor={'task-title-' + status.id}>Nueva tarea</label>
                            <Input id={'task-title-' + status.id} autoFocus placeholder="¿Qué hay que hacer?" value={newTaskTitle} onChange={event => setNewTaskTitle(event.target.value)} required />
                            <div className="flex gap-2"><Button size="sm" type="submit" disabled={pending || !newTaskTitle.trim()}>{pending ? 'Guardando…' : 'Crear tarea'}</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => setActiveStatus(null)}>Cancelar</Button></div>
                          </form>
                        ) : <button className="add-task-button" disabled={pending} onClick={() => openTaskForm(status.id)}><Plus size={16} /> Añadir tarea</button>}
                      </div>
                    )}
                  </Droppable>
                </section>
              );
            })}
            {isAddingStatus ? (
              <form className="status-create-form" onSubmit={handleCreateStatus}><label htmlFor="status-name">Nueva lista</label><Input id="status-name" autoFocus placeholder="Ej. En revisión" value={newStatusName} onChange={event => setNewStatusName(event.target.value)} required /><div className="flex gap-2"><Button size="sm" type="submit" disabled={pending || !newStatusName.trim()}>Crear lista</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => setIsAddingStatus(false)}>Cancelar</Button></div></form>
            ) : <button className="add-status-button" onClick={() => setIsAddingStatus(true)}><Plus size={17} /> Añadir lista</button>}
          </div>
        </DragDropContext>
      )}
      <Dialog open={!!selectedTask} onOpenChange={open => { if (!open && !pending) setSelectedTask(null); }}>
        <DialogContent className="task-detail-dialog">
          <DialogHeader>
            <DialogDescription className="flex items-center gap-2">
              <Link className="entity-code" href={`/tasks/${project.code}-${selectedTask?.number}`}>
                {project.code}-{selectedTask?.number}
              </Link>
              <span>·</span>
              {selectedTask && (
                <TaskStatusSelector 
                  statusId={selectedTask.statusId} 
                  statuses={statuses} 
                  onChange={async (newStatusId) => {
                    const previousTasks = tasks;
                    setTasks(current => current.map(t => t.id === selectedTask.id ? { ...t, statusId: newStatusId } : t));
                    setSelectedTask(current => current ? { ...current, statusId: newStatusId } : null);
                    try {
                      await request('/api/v1/tasks/move', 'POST', { taskId: selectedTask.id, newStatusId, newOrder: selectedTask.order });
                    } catch {
                      setTasks(previousTasks);
                      setSelectedTask(previousTasks.find(t => t.id === selectedTask.id) || null);
                      setError('No pudimos mover la tarea.');
                    }
                  }} 
                  disabled={pending} 
                />
              )}
            </DialogDescription>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          {selectedTask && <TaskDetails key={selectedTask.id} task={selectedTask} availableLabels={labels} disabled={pending} onBusyChange={setPending} onLabelCreated={label => {
            setLabels(current => current.some(item => item.id === label.id)
              ? current
              : [...current, label].sort((first, second) => first.name.localeCompare(second.name, 'es')));
          }} onSaved={updated => {
            setTasks(current => current.map(task => task.id === updated.id ? updated : task));
            setSelectedTask(updated);
          }} />}
          {error && <p role="alert" className="error-message">{error}</p>}
          <DialogFooter className="sm:justify-between"><Button variant="destructive" disabled={pending} onClick={() => setIsConfirmingDelete(true)}><Trash2 size={15} /> Eliminar tarea</Button></DialogFooter>
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
    </>
  );
}
