import { createPluginManifestRegistry } from '@/plugin-sdk/manifest';
import { backlogManifest } from './backlog/manifest';
import { historyLogManifest } from './history-log/manifest';
import { kanbanManifest } from './kanban/manifest';

export const pluginManifestRegistry = createPluginManifestRegistry([
  backlogManifest,
  kanbanManifest,
  historyLogManifest,
]);
