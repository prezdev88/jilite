export const JILITE_PLUGIN_API_VERSION = 1;

export type PluginManifest = {
  id: string;
  apiVersion: number;
  enabledByDefault?: boolean;
};

export type PluginCompatibilityIssue = 'not-registered' | 'incompatible' | null;

export type PluginManifestRegistry<Manifest extends PluginManifest = PluginManifest> = {
  all: () => ReadonlyArray<Manifest>;
  find: (pluginId: string) => Manifest | undefined;
  compatibilityIssue: (pluginId: string) => PluginCompatibilityIssue;
  defaultEnabled: () => ReadonlyArray<Manifest>;
};

export function assertUniquePluginIds(
  plugins: ReadonlyArray<{ id: string }>,
  registryName = 'plugin registry',
) {
  const pluginIds = new Set<string>();
  for (const plugin of plugins) {
    if (pluginIds.has(plugin.id)) {
      throw new Error(`Duplicate plugin id in ${registryName}: ${plugin.id}`);
    }
    pluginIds.add(plugin.id);
  }
}

export function createPluginManifestRegistry<Manifest extends PluginManifest>(
  manifests: ReadonlyArray<Manifest>,
  supportedApiVersion = JILITE_PLUGIN_API_VERSION,
): PluginManifestRegistry<Manifest> {
  assertUniquePluginIds(manifests, 'manifest registry');

  const manifestList = Object.freeze([...manifests]);
  const manifestsById = new Map<string, Manifest>();

  for (const manifest of manifestList) {
    manifestsById.set(manifest.id, manifest);
  }

  function compatibilityIssue(pluginId: string): PluginCompatibilityIssue {
    const manifest = manifestsById.get(pluginId);
    if (!manifest) return 'not-registered';
    return manifest.apiVersion === supportedApiVersion ? null : 'incompatible';
  }

  return {
    all: () => manifestList,
    find: pluginId => manifestsById.get(pluginId),
    compatibilityIssue,
    defaultEnabled: () => manifestList.filter(manifest =>
      manifest.enabledByDefault === true && compatibilityIssue(manifest.id) === null,
    ),
  };
}
