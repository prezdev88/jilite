import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventEmitter } from '@/lib/events';
import { dispatchPluginEvent } from '@/lib/plugin-events';

export async function POST(req: Request) {
  const { name, projectId, order } = await req.json();
  const status = await prisma.status.create({
    data: { name, projectId, order }
  });
  dispatchPluginEvent(projectId, 'status:created', { status });
  eventEmitter.emit('update');
  return NextResponse.json(status);
}
