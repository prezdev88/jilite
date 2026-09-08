import { Columns3 } from 'lucide-react';
import type { JilitePlugin } from '../core';
import KanbanBoard from './components/kanban-board';
import { kanbanManifest } from './manifest';

export const KanbanPlugin: JilitePlugin = {
  ...kanbanManifest,
  name: 'Tablero Kanban',
  description: 'Gestiona las tareas en columnas visuales con drag and drop.',
  icon: <Columns3 size={16} />,
  components: {
    ProjectView: KanbanBoard
  }
};
