import { prisma } from '@/lib/prisma';
import KanbanBoard from './kanban-board';
import { notFound } from 'next/navigation';

import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      columns: { orderBy: { order: 'asc' } },
      tasks: { orderBy: { order: 'asc' } }
    }
  });

  if (!project) return notFound();

  return (
    <main className="p-8 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-8 flex-none">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:underline mb-2 inline-block">&larr; Volver</Link>
          <h1 className="text-3xl font-bold">{project.name}</h1>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <KanbanBoard project={project} />
      </div>
    </main>
  );
}
