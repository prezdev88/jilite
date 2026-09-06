import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { name, projectId, order } = await req.json();
  const column = await prisma.column.create({
    data: { name, projectId, order }
  });
  return NextResponse.json(column);
}
