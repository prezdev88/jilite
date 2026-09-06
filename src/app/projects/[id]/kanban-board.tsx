'use client';

import { useState, useEffect, type FormEvent } from 'react';
import type { Column, Project, Task } from '@prisma/client';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { GripVertical, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TaskDetails } from '@/components/task-details';
import { ColumnStatus } from '@/components/column-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

type BoardProject = Project & { columns: Column[]; tasks: Task[] };

export default function KanbanBoard({ project }: { project: BoardProject }) {
  const router = useRouter();
  const [columns, setColumns] = useState(project.columns);
  const [tasks, setTasks] = useState(project.tasks);
  const [isMounted, setIsMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDetail, setNewTaskDetail] = useState('');
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const [renameError, setRenameError] = useState('');

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => { setTasks(project.tasks); setColumns(project.columns); }, [project.tasks, project.columns]);

  async function renameProject(event: FormEvent) {
    event.preventDefault();
    if (pending || !projectName.trim()) return;
    setPending(true);
    setRenameError('');
    try {
      const response = await fetch('/api/v1/projects', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, name: projectName.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        setRenameError(result.error || 'No pudimos cambiar el nombre.');
        return;
      }
      setIsRenaming(false);
      router.refresh();
    } catch { setRenameError('No pudimos cambiar el nombre. Inténtalo de nuevo.'); }
    finally { setPending(false); }
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
    if (!destination || pending || query) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const previousTasks = tasks;
    const movedTask = tasks.find(task => task.id === draggableId);
    if (!movedTask) return;
    const destinationTasks = tasks.filter(task => task.columnId === destination.droppableId && task.id !== draggableId);
    destinationTasks.splice(destination.index, 0, { ...movedTask, columnId: destination.droppableId });
    const remainingTasks = tasks.filter(task => task.columnId !== destination.droppableId && task.id !== draggableId);
    setTasks([...remainingTasks, ...destinationTasks.map((task, order) => ({ ...task, order }))]);
    setPending(true);
    setError('');
    try {
      await request('/api/v1/tasks/move', 'POST', { taskId: draggableId, newColumnId: destination.droppableId, newOrder: destination.index });
    } catch {
      setTasks(previousTasks);
      setError('No pudimos mover la tarea. Inténtalo de nuevo.');
    } finally { setPending(false); }
  }

  async function handleCreateTask(event: FormEvent, columnId: string) {
    event.preventDefault();
    if (!newTaskTitle.trim() || pending) return;
    setPending(true);
    setError('');
    try {
      const task: Task = await request('/api/v1/tasks', 'POST', { title: newTaskTitle.trim(), detail: newTaskDetail.trim(), projectId: project.id, columnId });
      setTasks(current => [...current, task]);
      setNewTaskTitle('');
      setNewTaskDetail('');
      setActiveColumn(null);
    } catch { setError('No pudimos crear la tarea. Inténtalo de nuevo.'); }
    finally { setPending(false); }
  }

  async function handleCreateColumn(event: FormEvent) {
    event.preventDefault();
    if (!newColumnName.trim() || pending) return;
    setPending(true);
    setError('');
    try {
      const column: Column = await request('/api/v1/columns', 'POST', { name: newColumnName.trim(), projectId: project.id, order: columns.length });
      setColumns(current => [...current, column]);
      setNewColumnName('');
      setIsAddingColumn(false);
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
      router.refresh();
    } catch { setError('No pudimos eliminar la tarea. Inténtalo de nuevo.'); }
    finally { setPending(false); }
  }

  function openTaskForm(columnId: string) {
    setActiveColumn(columnId);
    setNewTaskTitle('');
    setNewTaskDetail('');
    setError('');
    setQuery('');
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="entity-code project-heading-code">{project.code}</span>
          <div className="project-title-row"><h1>{project.name}</h1><button className="rename-project-button" aria-label="Cambiar nombre del proyecto" title="Cambiar nombre" disabled={pending} onClick={() => { setProjectName(project.name); setRenameError(''); setIsRenaming(true); }}><Pencil size={15} /></button></div>
          {project.description && <p className="page-description">{project.description}</p>}
        </div>
        <Button disabled={pending} onClick={() => columns.length ? openTaskForm(columns[0].id) : setIsAddingColumn(true)}><Plus size={16} /> {columns.length ? 'Nueva tarea' : 'Nueva lista'}</Button>
      </div>
      <div className="board-toolbar">
        <span className="board-summary">{tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}</span>
        <div className="search-field"><Search size={16} /><input aria-label="Buscar tareas" placeholder="Buscar tareas…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><X size={14} /></button>}</div>
      </div>
      {error && !selectedTask && <p role="alert" className="error-message">{error}</p>}
      {query && <p className="board-hint">Limpia la búsqueda para volver a mover las tarjetas.</p>}
      {!isMounted ? <div className="board-loading" role="status">Preparando tu tablero…</div> : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-scroll">
            {columns.map((column) => {
              const columnTasks = tasks.filter(task => task.columnId === column.id);
              const visibleTasks = columnTasks.filter(task => `${project.code}-${task.number} ${task.title}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
              return (
                <section key={column.id} className="kanban-column" aria-label={column.name}>
                  <div className="column-heading"><h2><ColumnStatus column={column} /></h2><span className="count-badge">{query ? visibleTasks.length + '/' : ''}{columnTasks.length}</span></div>
                  <Droppable droppableId={column.id} isDropDisabled={!!query || pending}>
                    {(provided, snapshot) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className={'task-dropzone' + (snapshot.isDraggingOver ? ' dragging-over' : '')}>
                        {visibleTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!!query || pending}>
                            {(provided, snapshot) => (
                              <article ref={provided.innerRef} {...provided.draggableProps} className={'task-card' + (snapshot.isDragging ? ' is-dragging' : '')}>
                                <div className="task-card-copy">
                                  <Link className="entity-code task-code" href={`/tasks/${project.code}-${task.number}`}>{project.code}-{task.number}</Link>
                                  <button className="task-open" onClick={() => { setError(''); setSelectedTask(task); }}><h3>{task.title}</h3></button>
                                </div>
                                <span {...provided.dragHandleProps} className="task-grip" aria-label={'Mover tarea: ' + task.title}><GripVertical size={16} /></span>
                              </article>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {!visibleTasks.length && !snapshot.isDraggingOver && <div className="column-empty">{query ? 'Sin coincidencias' : 'Sin tareas'}</div>}
                      </div>
                    )}
                  </Droppable>
                  {activeColumn === column.id ? (
                    <form className="task-create-form" onSubmit={event => handleCreateTask(event, column.id)}>
                      <label htmlFor={'task-title-' + column.id}>Nueva tarea</label>
                      <Input id={'task-title-' + column.id} autoFocus placeholder="¿Qué hay que hacer?" value={newTaskTitle} onChange={event => setNewTaskTitle(event.target.value)} required />
                      <Textarea aria-label="Descripción de la tarea" placeholder="Añade un poco de contexto (opcional)" value={newTaskDetail} onChange={event => setNewTaskDetail(event.target.value)} rows={3} />
                      <div className="flex gap-2"><Button size="sm" type="submit" disabled={pending || !newTaskTitle.trim()}>{pending ? 'Guardando…' : 'Crear tarea'}</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => setActiveColumn(null)}>Cancelar</Button></div>
                    </form>
                  ) : <button className="add-task-button" disabled={pending} onClick={() => openTaskForm(column.id)}><Plus size={16} /> Añadir tarea</button>}
                </section>
              );
            })}
            {isAddingColumn ? (
              <form className="column-create-form" onSubmit={handleCreateColumn}><label htmlFor="column-name">Nueva lista</label><Input id="column-name" autoFocus placeholder="Ej. En revisión" value={newColumnName} onChange={event => setNewColumnName(event.target.value)} required /><div className="flex gap-2"><Button size="sm" type="submit" disabled={pending || !newColumnName.trim()}>Crear lista</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => setIsAddingColumn(false)}>Cancelar</Button></div></form>
            ) : <button className="add-column-button" onClick={() => setIsAddingColumn(true)}><Plus size={17} /> Añadir lista</button>}
          </div>
        </DragDropContext>
      )}
      <Dialog open={!!selectedTask} onOpenChange={open => { if (!open && !pending) setSelectedTask(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogDescription><Link className="entity-code" href={`/tasks/${project.code}-${selectedTask?.number}`}>{project.code}-{selectedTask?.number}</Link> · <ColumnStatus column={columns.find(column => column.id === selectedTask?.columnId)} /></DialogDescription><DialogTitle>{selectedTask?.title}</DialogTitle></DialogHeader>
          {selectedTask && <TaskDetails key={selectedTask.id} task={selectedTask} disabled={pending} onBusyChange={setPending} onSaved={updated => {
            setTasks(current => current.map(task => task.id === updated.id ? updated : task));
            setSelectedTask(updated);
            router.refresh();
          }} />}
          {error && <p role="alert" className="error-message">{error}</p>}
          <DialogFooter className="sm:justify-between"><Button variant="destructive" disabled={pending} onClick={handleDeleteTask}><Trash2 size={15} /> Eliminar tarea</Button><Button variant="outline" disabled={pending} onClick={() => setSelectedTask(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isRenaming} onOpenChange={open => { if (!pending) setIsRenaming(open); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={renameProject} className="dialog-form">
            <DialogHeader><DialogTitle>Cambiar nombre</DialogTitle><DialogDescription>El código {project.code} y los códigos de las tareas se mantienen.</DialogDescription></DialogHeader>
            <div className="form-field"><label htmlFor="rename-project">Nombre del proyecto</label><Input id="rename-project" autoFocus value={projectName} onChange={event => setProjectName(event.target.value)} required maxLength={120} /></div>
            {renameError && <p className="error-message" role="alert">{renameError}</p>}
            <DialogFooter><Button variant="outline" type="button" disabled={pending} onClick={() => setIsRenaming(false)}>Cancelar</Button><Button type="submit" disabled={pending || !projectName.trim()}>{pending ? 'Guardando…' : 'Guardar nombre'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
