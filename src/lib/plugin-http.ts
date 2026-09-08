import type {
  PluginHttpDispatcher,
  PluginHttpMethod,
  ServerPluginContribution,
} from '@/plugin-sdk/server';

type PluginHttpDispatcherDependencies = {
  plugins: ReadonlyArray<ServerPluginContribution>;
  isPluginActive: (projectId: string, pluginId: string) => Promise<boolean>;
  reportError: (error: unknown, pluginId: string, path: string) => void;
};

export function createPluginHttpDispatcher({
  plugins,
  isPluginActive,
  reportError,
}: PluginHttpDispatcherDependencies): PluginHttpDispatcher {
  const pluginsById = new Map(plugins.map(plugin => [plugin.id, plugin]));

  return async function dispatchPluginHttpRequest(
    pluginId: string,
    path: string,
    method: PluginHttpMethod,
    request: Request,
  ) {
    const plugin = pluginsById.get(pluginId);
    if (!plugin) return jsonError('El plugin solicitado no está registrado.', 404);

    const route = plugin.http?.find(candidate => candidate.path === path);
    if (!route) return jsonError('La ruta solicitada no existe para este plugin.', 404);

    const handler = route.handlers[method];
    if (!handler) {
      const allowedMethods = Object.keys(route.handlers).join(', ');
      return jsonError('Método no permitido.', 405, { Allow: allowedMethods });
    }

    const projectId = route.getProjectId?.(request) || null;
    if (route.requiresActivePlugin !== false && projectId) {
      try {
        if (!await isPluginActive(projectId, pluginId)) {
          return jsonError('El plugin no está activo para este proyecto.', 403);
        }
      } catch (error) {
        reportError(error, pluginId, path);
        return jsonError('No se pudo comprobar el estado del plugin.', 500);
      }
    }

    return handler(request);
  };
}

function jsonError(error: string, status: number, headers?: HeadersInit) {
  return Response.json({ error }, { status, headers });
}
