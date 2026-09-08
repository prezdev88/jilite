import type { ServerPluginContribution } from '@/plugin-sdk/server';
import { historyLogHttpRoutes } from './api/events';
import { historyLogEvents } from './events';

export const historyLogServerPlugin = {
  id: 'jilite.history-log',
  events: historyLogEvents,
  http: historyLogHttpRoutes,
} satisfies ServerPluginContribution;
