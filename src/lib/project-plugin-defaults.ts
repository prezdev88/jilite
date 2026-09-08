import type { PluginManifestRegistry } from '@/plugin-sdk/manifest';

export function createDefaultProjectPlugins(registry: PluginManifestRegistry) {
  return registry.defaultEnabled().map(manifest => ({
    pluginId: manifest.id,
    isActive: true,
  }));
}
