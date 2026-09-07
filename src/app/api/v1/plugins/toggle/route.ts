import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventEmitter } from '@/lib/events';

export async function POST(req: Request) {
  const { projectId, pluginId, isActive } = await req.json();

  const plugin = await prisma.projectPlugin.upsert({
    where: { projectId_pluginId: { projectId, pluginId } },
    update: { isActive },
    create: { projectId, pluginId, isActive }
  });

  eventEmitter.emit('update');
  return NextResponse.json(plugin);
}
