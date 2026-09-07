import { JilitePlugin } from '../core';
import KanbanBoard from './components/kanban-board';

export const KanbanPlugin: JilitePlugin = {
  id: 'jilite.kanban',
  name: 'Tablero Kanban',
  description: 'Gestiona las tareas en statusas visuales con drag and drop.',
  components: {
    ProjectView: KanbanBoard
  }
};
