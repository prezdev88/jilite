import { KanbanPlugin } from './kanban';
import { BacklogPlugin } from './backlog';
import { HistoryLogPlugin } from './history-log';
import type { JilitePlugin } from './core';
import { assertUniquePluginIds } from '@/plugin-sdk/manifest';

const clientPluginContributions: JilitePlugin[] = [
  BacklogPlugin,
  KanbanPlugin,
  HistoryLogPlugin,
];

assertUniquePluginIds(clientPluginContributions, 'client plugin registry');

export const availablePlugins = clientPluginContributions;
