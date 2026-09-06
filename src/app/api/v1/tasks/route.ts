import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  
  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: { order: 'asc' }
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const { title, detail, projectId, columnId, sprintId } = await req.json();
  const task = await prisma.task.create({
    data: { title, detail, projectId, columnId, sprintId }
  });
  return NextResponse.json(task);
}
