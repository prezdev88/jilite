import { List } from 'lucide-react';
import type { JilitePlugin } from '../core';
import BacklogView from './components/backlog-view';

export const BacklogPlugin: JilitePlugin = {
  id: 'jilite.backlog',
  name: 'Backlog',
  description: 'Lista y gestiona todas las tareas del proyecto en un formato de lista simple.',
  icon: <List size={16} />,
  components: {
    ProjectView: BacklogView
  }
};
