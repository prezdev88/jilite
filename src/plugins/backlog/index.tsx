import { List } from 'lucide-react';
import type { JilitePlugin } from '../core';
import BacklogView from './components/backlog-view';
import { backlogManifest } from './manifest';

export const BacklogPlugin: JilitePlugin = {
  ...backlogManifest,
  name: 'Backlog',
  description: 'Lista y gestiona todas las tareas del proyecto en un formato de lista simple.',
  icon: <List size={16} />,
  components: {
    ProjectView: BacklogView
  }
};
