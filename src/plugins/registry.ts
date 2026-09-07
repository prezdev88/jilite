import { KanbanPlugin } from './kanban';
import { BacklogPlugin } from './backlog';
import { JilitePlugin } from './core';

export const availablePlugins: JilitePlugin[] = [
  BacklogPlugin,
  KanbanPlugin
];
