import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { automaticLabelColor, labelNameKey, parseLabelNames } from '@/lib/labels';
import { eventEmitter } from '@/lib/events';
import { dispatchPluginEvent } from '@/lib/plugin-events';

const MAX_LABELS_PER_REQUEST = 20;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'Indica el proyecto cuyas etiquetas quieres consultar.' }, { status: 400 });
  }

  const labels = await prisma.label.findMany({
    where: { projectId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(labels);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const projectId = typeof body?.projectId === 'string' ? body.projectId : '';
  const rawNames = Array.isArray(body?.names)
    ? body.names
    : typeof body?.name === 'string' ? body.name.split(',') : [];

  if (!projectId || !rawNames.every((name: unknown) => typeof name === 'string')) {
    return NextResponse.json({ error: 'Indica un proyecto y nombres de etiqueta válidos.' }, { status: 400 });
  }

  const names = parseLabelNames(rawNames.join(','));
  if (!names.length || names.length > MAX_LABELS_PER_REQUEST || names.some(name => name.length > 40)) {
    return NextResponse.json({ error: 'Indica entre 1 y 20 etiquetas de hasta 40 caracteres.' }, { status: 400 });
  }

  const existingLabels = await prisma.label.findMany({ where: { projectId } });
  const existingByName = new Map(existingLabels.map(label => [labelNameKey(label.name), label]));
  const namesToCreate = names.filter(name => !existingByName.has(labelNameKey(name)));

  try {
    const createdLabels = await prisma.$transaction(namesToCreate.map((name, index) => prisma.label.create({
      data: {
        name,
        color: automaticLabelColor(existingLabels.length + index),
        projectId,
      },
    })));
    const labelsByName = new Map(existingByName);
    createdLabels.forEach(label => labelsByName.set(labelNameKey(label.name), label));
    const labels = names.map(name => labelsByName.get(labelNameKey(name))!);
    if (createdLabels.length) {
      createdLabels.forEach(label => dispatchPluginEvent(projectId, 'label:created', { label }));
      eventEmitter.emit('update');
    }
    return NextResponse.json({ labels, created: createdLabels.length }, { status: createdLabels.length ? 201 : 200 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Una de las etiquetas ya fue creada. Actualiza la lista e inténtalo nuevamente.' }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json({ error: 'El proyecto ya no existe.' }, { status: 404 });
    }
    throw error;
  }
}
