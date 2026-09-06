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
    orderBy: { order: 'asc' },
    include: { labels: { orderBy: { name: 'asc' } } },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const projectId = typeof body?.projectId === 'string' ? body.projectId : '';
  const labelIds = body?.labelIds === undefined ? [] : body.labelIds;
  if (!title || !projectId || !Array.isArray(labelIds) || !labelIds.every(labelId => typeof labelId === 'string')) {
    return NextResponse.json({ error: 'Indica un título, un proyecto y etiquetas válidas.' }, { status: 400 });
  }
  const uniqueLabelIds = Array.from(new Set<string>(labelIds));
  const task = await prisma.$transaction(async tx => {
    if (uniqueLabelIds.length) {
      const matchingLabels = await tx.label.count({ where: { id: { in: uniqueLabelIds }, projectId } });
      if (matchingLabels !== uniqueLabelIds.length) throw new Error('INVALID_LABELS');
    }
    const project = await tx.project.update({
      where: { id: projectId },
      data: { nextTaskNumber: { increment: 1 } },
      select: { nextTaskNumber: true },
    });
    const count = await tx.task.count({ where: { columnId: body.columnId } });
    return tx.task.create({
      data: {
        title,
        detail: typeof body.detail === 'string' ? body.detail : null,
        projectId,
        columnId: typeof body.columnId === 'string' ? body.columnId : null,
        sprintId: typeof body.sprintId === 'string' ? body.sprintId : null,
        order: count,
        number: project.nextTaskNumber,
        labels: { connect: uniqueLabelIds.map(id => ({ id })) },
      },
      include: { labels: { orderBy: { name: 'asc' } } },
    });
  }).catch(error => {
    if (error instanceof Error && error.message === 'INVALID_LABELS') return null;
    throw error;
  });
  if (!task) {
    return NextResponse.json({ error: 'Todas las etiquetas deben pertenecer al proyecto.' }, { status: 400 });
  }
  return NextResponse.json(task, { status: 201 });
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
      (body.title === undefined && body.detail === undefined && body.labelIds === undefined)) {
    return NextResponse.json({ error: 'Indica la tarea y los detalles que quieres editar.' }, { status: 400 });
  }
  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
    return NextResponse.json({ error: 'El título no puede estar vacío.' }, { status: 400 });
  }
  if (body.detail !== undefined && body.detail !== null && typeof body.detail !== 'string') {
    return NextResponse.json({ error: 'La descripción debe ser texto.' }, { status: 400 });
  }
  if (body.labelIds !== undefined &&
      (!Array.isArray(body.labelIds) || !body.labelIds.every((labelId: unknown) => typeof labelId === 'string'))) {
    return NextResponse.json({ error: 'Las etiquetas no son válidas.' }, { status: 400 });
  }
  try {
    const currentTask = await prisma.task.findUnique({ where: { id: body.taskId }, select: { projectId: true } });
    if (!currentTask) {
      return NextResponse.json({ error: 'La tarea ya no existe.' }, { status: 404 });
    }
    const labelIds = body.labelIds === undefined ? undefined : Array.from(new Set<string>(body.labelIds));
    if (labelIds) {
      const matchingLabels = await prisma.label.count({
        where: { id: { in: labelIds }, projectId: currentTask.projectId },
      });
      if (matchingLabels !== labelIds.length) {
        return NextResponse.json({ error: 'Todas las etiquetas deben pertenecer al proyecto.' }, { status: 400 });
      }
    }
    const { project, ...task } = await prisma.task.update({
      where: { id: body.taskId },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.detail !== undefined ? { detail: body.detail || null } : {}),
        ...(labelIds !== undefined ? { labels: { set: labelIds.map(id => ({ id })) } } : {}),
      },
      include: {
        project: { select: { code: true } },
        labels: { orderBy: { name: 'asc' } },
      },
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
