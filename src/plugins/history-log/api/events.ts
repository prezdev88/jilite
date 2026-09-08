import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { PluginHttpRoute } from '@/plugin-sdk/server';
import { parseHistoryLogQuery } from './event-query';

async function getEvents(request: Request) {
  const result = parseHistoryLogQuery(request.url);
  if (!result.success) return Response.json({ error: result.error }, { status: 400 });

  const { projectId, event, from, to, page, limit } = result.query;
  const where: Prisma.EventLogWhereInput = {
    projectId,
    ...(event ? { event } : {}),
    ...(from || to ? {
      createdAt: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.eventLog.count({ where }),
  ]);

  return Response.json({
    events: events.map(entry => ({ ...entry, payload: parsePayload(entry.payload) })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

function parsePayload(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return { raw: payload, invalidJson: true };
  }
}

export const historyLogHttpRoutes = [
  {
    path: 'events',
    handlers: { GET: getEvents },
    getProjectId: request => new URL(request.url).searchParams.get('projectId'),
  },
] satisfies ReadonlyArray<PluginHttpRoute>;
