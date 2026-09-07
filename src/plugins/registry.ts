import { KanbanPlugin } from './kanban';
import { BacklogPlugin } from './backlog';
import { HistoryLogPlugin } from './history-log';
import { JilitePlugin } from './core';

export const availablePlugins: JilitePlugin[] = [
  BacklogPlugin,
  KanbanPlugin,
  HistoryLogPlugin,
];
