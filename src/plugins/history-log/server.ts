import type { ServerPluginContribution } from '@/plugin-sdk/server';
import { historyLogHttpRoutes } from './api/events';
import { historyLogEvents } from './events';
import { historyLogManifest } from './manifest';

export const historyLogServerPlugin = {
  id: historyLogManifest.id,
  events: historyLogEvents,
  http: historyLogHttpRoutes,
} satisfies ServerPluginContribution;
