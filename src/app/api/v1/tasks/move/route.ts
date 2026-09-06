import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventEmitter } from '@/lib/events';

export async function POST(req: Request) {
  const { taskId, newColumnId, newOrder } = await req.json();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { columnId: newColumnId, order: newOrder },
    include: { labels: { orderBy: { name: 'asc' } } },
  });
  eventEmitter.emit('update');
  return NextResponse.json(task);
}
