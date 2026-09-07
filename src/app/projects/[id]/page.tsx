import { prisma } from '@/lib/prisma';
import { ProjectView } from './project-view';
import { notFound } from 'next/navigation';

import { WorkspaceShell } from '@/components/workspace-shell';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      statuses: { orderBy: { order: 'asc' } },
      labels: { orderBy: { name: 'asc' } },
      plugins: true,
      tasks: {
        orderBy: { order: 'asc' },
        include: { labels: { orderBy: { name: 'asc' } }, status: true },
      }
    }
  });

  if (!project) return notFound();

  const projects = await prisma.project.findMany({ select: { id: true, name: true, code: true } });

  return (
    <WorkspaceShell projects={projects} activeProject={project}>
      <ProjectView project={project} />
    </WorkspaceShell>
  );
}
