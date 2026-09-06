'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Task, Project, Column } from '@prisma/client';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { TaskDetails } from '@/components/task-details';
import { ColumnStatus } from '@/components/column-status';
import { Button } from '@/components/ui/button';

type TaskWithContext = Task & { project: Project; column: Column | null };

export default function TaskPageView({ task: initialTask }: { task: TaskWithContext }) {
  const [task, setTask] = useState(initialTask);
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
        <div className="task-page-meta"><span className="entity-code">{task.project.code}-{task.number}</span><ColumnStatus column={task.column} /></div>
        <h1>{task.title}</h1>
      </header>
      <TaskDetails task={task} disabled={deleting} onBusyChange={setSaving} onSaved={updated => {
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
