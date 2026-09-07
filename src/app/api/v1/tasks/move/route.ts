import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventEmitter } from '@/lib/events';
import { dispatchPluginEvent } from '@/lib/plugin-events';

export async function POST(req: Request) {
  const { taskId, newStatusId, newOrder } = await req.json();

  let oldStatusId: string | null = null;
  let projectId: string = '';

  const task = await prisma.$transaction(async tx => {
    const currentTask = await tx.task.findUnique({ where: { id: taskId } });
    if (!currentTask) throw new Error('Task not found');
    
    oldStatusId = currentTask.statusId;
    projectId = currentTask.projectId;

    if (currentTask.statusId === newStatusId) {
      if (currentTask.order < newOrder) {
        await tx.task.updateMany({
          where: { projectId: currentTask.projectId, statusId: newStatusId, order: { gt: currentTask.order, lte: newOrder } },
          data: { order: { decrement: 1 } }
        });
      } else if (currentTask.order > newOrder) {
        await tx.task.updateMany({
          where: { projectId: currentTask.projectId, statusId: newStatusId, order: { gte: newOrder, lt: currentTask.order } },
          data: { order: { increment: 1 } }
        });
      }
    } else {
      await tx.task.updateMany({
        where: { projectId: currentTask.projectId, statusId: currentTask.statusId, order: { gt: currentTask.order } },
        data: { order: { decrement: 1 } }
      });
      await tx.task.updateMany({
        where: { projectId: currentTask.projectId, statusId: newStatusId, order: { gte: newOrder } },
        data: { order: { increment: 1 } }
      });
    }

    return tx.task.update({
      where: { id: taskId },
      data: { statusId: newStatusId, order: newOrder },
      include: { labels: { orderBy: { name: 'asc' } } },
    });
  });

  if (oldStatusId !== newStatusId) {
    // Fire and forget plugin event
    dispatchPluginEvent(projectId, 'task:status_changed', {
      taskId: task.id,
      taskNumber: task.number,
      projectId: projectId,
      oldStatusId,
      newStatusId
    });
  }

  eventEmitter.emit('update');
  return NextResponse.json(task);
}
