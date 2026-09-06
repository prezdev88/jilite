import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const projects = await prisma.project.findMany({
    include: { columns: { orderBy: { order: 'asc' } } }
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const { name, description } = await req.json();
  const project = await prisma.project.create({
    data: {
      name,
      description,
      columns: {
        create: [
          { name: 'Por hacer', order: 0 },
          { name: 'En curso', order: 1 },
          { name: 'Terminado', order: 2 }
        ]
      }
    }
  });
  return NextResponse.json(project);
}
