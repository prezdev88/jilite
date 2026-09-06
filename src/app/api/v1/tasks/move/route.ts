import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { taskId, newColumnId, newOrder } = await req.json();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { columnId: newColumnId, order: newOrder }
  });
  return NextResponse.json(task);
}
