import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { eventEmitter } from '@/lib/events';
import { dispatchPluginEvent } from '@/lib/plugin-events';

export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      statuses: { orderBy: { order: 'asc' } },
      labels: { orderBy: { name: 'asc' } },
    }
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : null;
  if (!name || name.length > 120 || !/^[A-Z]{3}$/.test(code)) {
    return NextResponse.json({ error: 'Introduce un nombre y un código de tres letras (A–Z).' }, { status: 400 });
  }
  try {
    const project = await prisma.project.create({
      data: {
        name,
        code,
        description,
        statuses: {
          create: [
            { name: 'Por hacer', order: 0 },
            { name: 'En curso', order: 1 },
            { name: 'Terminado', order: 2 }
          ]
        }
      }
    });
    dispatchPluginEvent(project.id, 'project:created', { project });
    eventEmitter.emit('update');
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ese código ya pertenece a otro proyecto.' }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : null;
  if (typeof body?.id !== 'string' || !name || name.length > 120) {
    return NextResponse.json({ error: 'Introduce un nombre de entre 1 y 120 caracteres.' }, { status: 400 });
  }
  try {
    const project = await prisma.project.update({ 
      where: { id: body.id }, 
      data: { name, description } 
    });
    dispatchPluginEvent(project.id, 'project:updated', { project });
    eventEmitter.emit('update');
    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'El proyecto ya no existe.' }, { status: 404 });
    }
    throw error;
  }
}
