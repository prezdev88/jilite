'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function KanbanBoard({ project }: { project: any }) {
  const [columns, setColumns] = useState(project.columns);
  const [tasks, setTasks] = useState(project.tasks);
  const [isMounted, setIsMounted] = useState(false);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic UI update
    const newTasks = Array.from(tasks);
    const movedTaskIndex = newTasks.findIndex((t: any) => t.id === draggableId);
    const [movedTask] = newTasks.splice(movedTaskIndex, 1);
    
    movedTask.columnId = destination.droppableId;
    newTasks.splice(destination.index, 0, movedTask);
    
    // Update order values based on index
    const updatedTasks = newTasks.map((t: any, index) => ({ ...t, order: index }));
    setTasks(updatedTasks);

    // Call API to save (simplified: not fully implemented in MVP API yet, but we'll simulate)
    await fetch('/api/v1/tasks/move', {
      method: 'POST',
      body: JSON.stringify({ taskId: draggableId, newColumnId: destination.droppableId, newOrder: destination.index })
    }).catch(() => {});
  };

  const handleCreateTask = async (colId: string) => {
    if (!newTaskTitle) return;
    const res = await fetch('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: newTaskTitle, projectId: project.id, columnId: colId })
    });
    const task = await res.json();
    setTasks([...tasks, task]);
    setNewTaskTitle('');
    setActiveColumn(null);
  };

  if (!isMounted) return null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-6 h-full overflow-x-auto pb-4">
        {columns.map((col: any) => (
          <div key={col.id} className="flex-shrink-0 w-80 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 rounded-lg p-4">
            <h3 className="font-semibold mb-4">{col.name}</h3>
            
            <Droppable droppableId={col.id}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex-1 min-h-[150px]"
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
                          <Card className="cursor-grab active:cursor-grabbing hover:border-primary">
                            <CardHeader className="p-4">
                              <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                              {task.detail && <p className="text-xs text-muted-foreground mt-1">{task.detail}</p>}
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
              <div className="mt-4 space-y-2">
                <Input 
                  autoFocus
                  placeholder="Título de la tarjeta..." 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTask(col.id)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleCreateTask(col.id)}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setActiveColumn(null)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" className="mt-4 w-full justify-start text-muted-foreground" onClick={() => setActiveColumn(col.id)}>
                + Agregar tarjeta
              </Button>
            )}
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
