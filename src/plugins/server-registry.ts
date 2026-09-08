import type { ServerPluginContribution } from '@/plugin-sdk/server';
import { historyLogServerPlugin } from './history-log/server';

export const serverPluginContributions = [
  historyLogServerPlugin,
] satisfies ReadonlyArray<ServerPluginContribution>;
