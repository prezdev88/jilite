import type { ServerPluginContribution } from '@/plugin-sdk/server';
import { assertUniquePluginIds } from '@/plugin-sdk/manifest';
import { historyLogServerPlugin } from './history-log/server';

const contributions = [
  historyLogServerPlugin,
] satisfies ReadonlyArray<ServerPluginContribution>;

assertUniquePluginIds(contributions, 'server plugin registry');

export const serverPluginContributions = contributions;
