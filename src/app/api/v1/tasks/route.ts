import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

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
  const task = await prisma.$transaction(async tx => {
    const project = await tx.project.update({
      where: { id: projectId },
      data: { nextTaskNumber: { increment: 1 } },
      select: { nextTaskNumber: true },
    });
    const count = await tx.task.count({ where: { columnId } });
    return tx.task.create({
      data: { title, detail, projectId, columnId, sprintId, order: count, number: project.nextTaskNumber },
    });
  });
  return NextResponse.json(task);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');
  
  if (!taskId) {
    return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
  }

  try {
    const task = await prisma.task.delete({
      where: { id: taskId },
      include: { project: { select: { code: true } } },
    });
    revalidatePath('/');
    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath(`/tasks/${task.project.code}-${task.number}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'La tarea ya no existe.' }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (typeof body?.taskId !== 'string' || !body.taskId ||
      (body.title === undefined && body.detail === undefined)) {
    return NextResponse.json({ error: 'Indica la tarea y los detalles que quieres editar.' }, { status: 400 });
  }
  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
    return NextResponse.json({ error: 'El título no puede estar vacío.' }, { status: 400 });
  }
  if (body.detail !== undefined && body.detail !== null && typeof body.detail !== 'string') {
    return NextResponse.json({ error: 'La descripción debe ser texto.' }, { status: 400 });
  }
  try {
    const { project, ...task } = await prisma.task.update({
      where: { id: body.taskId },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.detail !== undefined ? { detail: body.detail || null } : {}),
      },
      include: { project: { select: { code: true } } },
    });
    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath(`/tasks/${project.code}-${task.number}`);
    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'La tarea ya no existe.' }, { status: 404 });
    }
    throw error;
  }
}
