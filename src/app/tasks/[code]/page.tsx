import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { WorkspaceShell } from '@/components/workspace-shell';
import TaskPageView from './task-page-view';

export const dynamic = 'force-dynamic';

export default async function TaskPage({ params }: { params: { code: string } }) {
  const match = /^([A-Z]{3})-([1-9]\d*)$/.exec(params.code.toUpperCase());
  if (!match || !Number.isSafeInteger(Number(match[2])) || Number(match[2]) > 2147483647) notFound();
  const task = await prisma.task.findFirst({
    where: { number: Number(match[2]), project: { code: match[1] } },
    include: {
      project: true,
      column: true,
      labels: { orderBy: { name: 'asc' } },
    },
  });
  if (!task) notFound();
  const [projects, labels] = await Promise.all([
    prisma.project.findMany({ select: { id: true, name: true, code: true } }),
    prisma.label.findMany({ where: { projectId: task.projectId }, orderBy: { name: 'asc' } }),
  ]);
  return (
    <WorkspaceShell projects={projects} activeProject={task.project}>
      <TaskPageView key={task.id} task={task} availableLabels={labels} />
    </WorkspaceShell>
  );
}
