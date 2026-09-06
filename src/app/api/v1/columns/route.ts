import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventEmitter } from '@/lib/events';

export async function POST(req: Request) {
  const { name, projectId, order } = await req.json();
  const column = await prisma.column.create({
    data: { name, projectId, order }
  });
  eventEmitter.emit('update');
  return NextResponse.json(column);
}
