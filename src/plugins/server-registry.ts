import type { ServerPluginContribution } from '@/plugin-sdk/server';
import { historyLogServerPlugin } from './history-log/events';

export const serverPluginContributions = [
  historyLogServerPlugin,
] satisfies ReadonlyArray<ServerPluginContribution>;
