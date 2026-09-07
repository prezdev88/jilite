import { eventEmitter } from './events';
import { prisma } from './prisma';
import { availablePlugins } from '@/plugins/registry';

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
      const plugin = availablePlugins.find(p => p.id === active.pluginId);
      if (plugin?.events && typeof plugin.events[eventName] === 'function') {
        // Execute the plugin's event handler securely
        try {
          await plugin.events[eventName](payload);
        } catch (pluginError) {
          console.error(`Plugin ${plugin.id} failed handling event ${eventName}:`, pluginError);
        }
      }
    }
  } catch (error) {
    console.error('Error dispatching plugin event:', error);
  }
}
