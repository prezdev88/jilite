'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function KanbanBoard({ project }: { project: any }) {
  const [columns, setColumns] = useState(project.columns);
  const [tasks, setTasks] = useState(project.tasks);
  const [isMounted, setIsMounted] = useState(false);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDetail, setNewTaskDetail] = useState('');
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic UI update
    const newTasks = Array.from(tasks);
    const movedTaskIndex = newTasks.findIndex((t: any) => t.id === draggableId);
    const [movedTask] = newTasks.splice(movedTaskIndex, 1);
    
    (movedTask as any).columnId = destination.droppableId;
    newTasks.splice(destination.index, 0, movedTask);
    
    // Update order values based on index
    const updatedTasks = newTasks.map((t: any, index: number) => ({ ...t, order: index }));
    setTasks(updatedTasks);

    await fetch('/api/v1/tasks/move', {
      method: 'POST',
      body: JSON.stringify({ taskId: draggableId, newColumnId: destination.droppableId, newOrder: destination.index })
    }).catch(() => {});
  };

  const handleCreateTask = async (colId: string) => {
    if (!newTaskTitle) return;
    const res = await fetch('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: newTaskTitle, detail: newTaskDetail, projectId: project.id, columnId: colId })
    });
    const task = await res.json();
    setTasks([...tasks, task]);
    setNewTaskTitle('');
    setNewTaskDetail('');
    setActiveColumn(null);
  };

  const handleCreateColumn = async () => {
    if (!newColumnName) return;
    const res = await fetch('/api/v1/columns', {
      method: 'POST',
      body: JSON.stringify({ name: newColumnName, projectId: project.id, order: columns.length })
    });
    const col = await res.json();
    setColumns([...columns, col]);
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  if (!isMounted) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-6 h-full overflow-x-auto pb-4 items-start">
        {columns.map((col: any) => (
          <div key={col.id} className="flex-shrink-0 w-80 flex flex-col bg-slate-100 dark:bg-slate-900 rounded-lg p-4 max-h-full">
            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">{col.name}</h3>
            
            <Droppable droppableId={col.id}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex-1 min-h-[50px] overflow-y-auto"
                >
                  {tasks.filter((t: any) => t.columnId === col.id).map((task: any, index: number) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="mb-3"
                        >
                          <Card className="cursor-grab active:cursor-grabbing hover:border-primary shadow-sm border border-border bg-card">
                            <CardHeader className="p-4">
                              <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                              {task.detail && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{task.detail}</p>}
                            </CardHeader>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {activeColumn === col.id ? (
              <div className="mt-4 space-y-2 p-3 border rounded-md bg-card">
                <Input 
                  autoFocus
                  placeholder="Título de la tarjeta..." 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <Textarea 
                  placeholder="Descripción (opcional)..." 
                  value={newTaskDetail}
                  onChange={(e) => setNewTaskDetail(e.target.value)}
                  className="text-sm min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleCreateTask(col.id)}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setActiveColumn(null)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" className="mt-2 w-full justify-start text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => setActiveColumn(col.id)}>
                + Agregar tarjeta
              </Button>
            )}
          </div>
        ))}

        {isAddingColumn ? (
          <div className="flex-shrink-0 w-80 bg-slate-100 dark:bg-slate-900 rounded-lg p-4 space-y-2 border">
            <Input 
              autoFocus
              placeholder="Nombre de la lista..." 
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateColumn()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateColumn}>Añadir lista</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAddingColumn(false)}>X</Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="flex-shrink-0 w-80 h-[52px] justify-start bg-slate-50/50 dark:bg-slate-900/50 border-dashed"
            onClick={() => setIsAddingColumn(true)}
          >
            + Añadir otra lista
          </Button>
        )}
      </div>
    </DragDropContext>
  );
}
