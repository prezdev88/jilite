'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project, Status, Label } from '@prisma/client';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { TaskDetails } from '@/components/task-details';
import { KanbanStatus } from '@/plugins/kanban/components/kanban-status';
import { Button } from '@/components/ui/button';
import type { TaskWithLabels } from '@/lib/task-types';

type TaskWithContext = TaskWithLabels & { project: Project; status: Status | null };

export default function TaskPageView({ task: initialTask, availableLabels }: { task: TaskWithContext; availableLabels: Label[] }) {
  const [task, setTask] = useState(initialTask);
  const [labels, setLabels] = useState(availableLabels);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  useEffect(() => { setTask(initialTask); }, [initialTask]);

  async function deleteTask() {
    if (saving || deleting) return;
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(`/api/v1/tasks?taskId=${task.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) throw new Error();
      router.replace(`/projects/${task.projectId}`);
      router.refresh();
    } catch {
      setError('No pudimos eliminar la tarea. Inténtalo de nuevo.');
      setDeleting(false);
    }
  }

  return (
    <div className="task-page">
      <Link className="task-back-link" href={`/projects/${task.projectId}`}><ArrowLeft size={15} /> {task.project.name}</Link>
      <header className="task-page-heading">
        <div className="task-page-meta"><span className="entity-code">{task.project.code}-{task.number}</span><KanbanStatus status={task.status} /></div>
        <h1>{task.title}</h1>
      </header>
      <TaskDetails task={task} availableLabels={labels} disabled={deleting} onBusyChange={setSaving} onLabelCreated={label => {
        setLabels(current => [...current, label].sort((first, second) => first.name.localeCompare(second.name, 'es')));
      }} onSaved={updated => {
        setTask(current => ({ ...current, ...updated }));
        router.refresh();
      }} />
      <div className="task-page-footer">
        {error && <p className="error-message" role="alert">{error}</p>}
        <Button variant="destructive" disabled={saving || deleting} onClick={deleteTask}><Trash2 size={15} /> {deleting ? 'Eliminando…' : 'Eliminar tarea'}</Button>
      </div>
    </div>
  );
}
