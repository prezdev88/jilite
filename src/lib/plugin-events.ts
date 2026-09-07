import { eventEmitter } from './events';
import { prisma } from './prisma';
import { historyLogEvents } from '@/plugins/history-log/events';

/**
 * Server-side event handler map.
 * Maps pluginId -> { eventName -> handler }.
 * These are loaded at module init, NOT from the client-side registry.
 */
const serverEventHandlers: Record<string, Record<string, (payload: any) => Promise<void> | void>> = {
  'jilite.history-log': historyLogEvents,
};

/**
 * Dispatches an event to the global event emitter AND
 * routes it to any active plugins in the project that listen to it.
 */
export async function dispatchPluginEvent(projectId: string, eventName: string, payload: any) {
  // Emit to local node emitter just in case core needs it
  eventEmitter.emit(eventName, payload);

  try {
    // Find plugins active in this project
    const activePlugins = await prisma.projectPlugin.findMany({
      where: { projectId, isActive: true }
    });

    for (const active of activePlugins) {
      const handlers = serverEventHandlers[active.pluginId];
      if (handlers && typeof handlers[eventName] === 'function') {
        try {
          await handlers[eventName](payload);
        } catch (pluginError) {
          console.error(`Plugin ${active.pluginId} failed handling event ${eventName}:`, pluginError);
        }
      }
    }
  } catch (error) {
    console.error('Error dispatching plugin event:', error);
  }
}
