import { prisma } from '@/lib/prisma';
import KanbanBoard from './kanban-board';
import { notFound } from 'next/navigation';

import { WorkspaceShell } from '@/components/workspace-shell';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      columns: { orderBy: { order: 'asc' } },
      labels: { orderBy: { name: 'asc' } },
      tasks: {
        orderBy: { order: 'asc' },
        include: { labels: { orderBy: { name: 'asc' } } },
      }
    }
  });

  if (!project) return notFound();

  const projects = await prisma.project.findMany({ select: { id: true, name: true, code: true } });

  return (
    <WorkspaceShell projects={projects} activeProject={project}>
      <KanbanBoard project={project} />
    </WorkspaceShell>
  );
}
