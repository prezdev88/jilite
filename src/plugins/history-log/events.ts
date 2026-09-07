import { prisma } from '@/lib/prisma';

const ALL_EVENTS = [
  'task:created',
  'task:updated',
  'task:deleted',
  'task:status_changed',
  'project:created',
  'project:updated',
  'label:created',
  'status:created',
  'plugin:activated',
  'plugin:deactivated',
];

function createHandler(eventName: string) {
  return async (payload: any) => {
    try {
      const projectId = payload.projectId
        || payload.task?.projectId
        || payload.project?.id
        || payload.label?.projectId
        || payload.status?.projectId
        || payload.plugin?.projectId;

      if (!projectId) {
        console.warn(`[history-log] No projectId found for event ${eventName}`);
        return;
      }

      await prisma.eventLog.create({
        data: {
          projectId,
          event: eventName,
          payload: JSON.stringify(payload),
        },
      });
    } catch (error) {
      console.error(`[history-log] Failed to log event ${eventName}:`, error);
    }
  };
}

/** Server-side event handlers map for history-log plugin */
export const historyLogEvents: Record<string, (payload: any) => Promise<void>> = {};
for (const eventName of ALL_EVENTS) {
  historyLogEvents[eventName] = createHandler(eventName);
}
