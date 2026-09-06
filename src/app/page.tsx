import { prisma } from '@/lib/prisma';
import { WorkspaceShell } from '@/components/workspace-shell';
import ProjectOverview from './project-overview';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const projects = await prisma.project.findMany({
    include: { _count: { select: { tasks: true, columns: true } } },
  });

  return (
    <WorkspaceShell projects={projects}>
      <ProjectOverview projects={projects} />
    </WorkspaceShell>
  );
}
