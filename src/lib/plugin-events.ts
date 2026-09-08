import type {
  PluginDispatchFailure,
  PluginEventDispatcher,
  PluginEventHandler,
  PluginEventName,
  PluginEventPayloads,
  ServerPluginContribution,
} from '@/plugin-sdk/server';

type PluginEventDispatcherDependencies = {
  plugins: ReadonlyArray<ServerPluginContribution>;
  findActivePluginIds: (projectId: string) => Promise<ReadonlyArray<string>>;
  publishCoreEvent: <Name extends PluginEventName>(
    eventName: Name,
    payload: PluginEventPayloads[Name],
  ) => void;
  reportError: (error: unknown, failure: PluginDispatchFailure) => void;
};

export function createPluginEventDispatcher({
  plugins,
  findActivePluginIds,
  publishCoreEvent,
  reportError,
}: PluginEventDispatcherDependencies): PluginEventDispatcher {
  const pluginsById = new Map(plugins.map(plugin => [plugin.id, plugin]));

  return async function dispatchPluginEvent<Name extends PluginEventName>(
    projectId: string,
    eventName: Name,
    payload: PluginEventPayloads[Name],
  ) {
    publishCoreEvent(eventName, payload);

    let activePluginIds: ReadonlyArray<string>;
    try {
      activePluginIds = await findActivePluginIds(projectId);
    } catch (error) {
      reportError(error, { phase: 'active-plugin-lookup', projectId, eventName });
      return;
    }

    for (const pluginId of activePluginIds) {
      const plugin = pluginsById.get(pluginId);
      const handler = plugin?.events?.[eventName] as PluginEventHandler<Name> | undefined;
      if (handler) {
        try {
          await handler(payload);
        } catch (error) {
          reportError(error, { phase: 'plugin-handler', projectId, eventName, pluginId });
        }
      }
    }
  };
}
