import { Columns3 } from 'lucide-react';
import type { JilitePlugin } from '../core';
import KanbanBoard from './components/kanban-board';

export const KanbanPlugin: JilitePlugin = {
  id: 'jilite.kanban',
  name: 'Tablero Kanban',
  description: 'Gestiona las tareas en columnas visuales con drag and drop.',
  icon: <Columns3 size={16} />,
  components: {
    ProjectView: KanbanBoard
  }
};
