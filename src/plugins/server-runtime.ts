import { eventEmitter } from '@/lib/events';
import { createPluginEventDispatcher } from '@/lib/plugin-events';
import { prisma } from '@/lib/prisma';
import { serverPluginContributions } from './server-registry';

export const dispatchPluginEvent = createPluginEventDispatcher({
  plugins: serverPluginContributions,
  findActivePluginIds: async projectId => {
    const activePlugins = await prisma.projectPlugin.findMany({
      where: { projectId, isActive: true },
      select: { pluginId: true },
    });
    return activePlugins.map(plugin => plugin.pluginId);
  },
  publishCoreEvent: (eventName, payload) => {
    eventEmitter.emit(eventName, payload);
  },
  reportError: (error, failure) => {
    if (failure.phase === 'plugin-handler') {
      console.error(
        `Plugin ${failure.pluginId} failed handling event ${failure.eventName}:`,
        error,
      );
      return;
    }
    console.error('Error dispatching plugin event:', error);
  },
});
