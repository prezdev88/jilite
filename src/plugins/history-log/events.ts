import { prisma } from '@/lib/prisma';
import type {
  PluginEventHandler,
  PluginEventHandlers,
  PluginEventName,
  PluginEventPayload,
} from '@/plugin-sdk/server';

function createHandler<Name extends PluginEventName>(eventName: Name): PluginEventHandler<Name> {
  return async payload => {
    try {
      const projectId = getProjectId(payload);

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

function getProjectId(payload: PluginEventPayload) {
  if ('projectId' in payload) return payload.projectId;
  if ('task' in payload) return payload.task.projectId;
  if ('project' in payload) return payload.project.id;
  if ('label' in payload) return payload.label.projectId;
  if ('status' in payload) return payload.status.projectId;
  if ('plugin' in payload) return payload.plugin.projectId;
  return null;
}

export const historyLogEvents = {
  'task:created': createHandler('task:created'),
  'task:updated': createHandler('task:updated'),
  'task:deleted': createHandler('task:deleted'),
  'task:status_changed': createHandler('task:status_changed'),
  'project:created': createHandler('project:created'),
  'project:updated': createHandler('project:updated'),
  'label:created': createHandler('label:created'),
  'status:created': createHandler('status:created'),
  'plugin:activated': createHandler('plugin:activated'),
  'plugin:deactivated': createHandler('plugin:deactivated'),
} satisfies PluginEventHandlers;
