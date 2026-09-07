import { JilitePlugin } from '../core';
import HistoryLogView from './components/history-log-view';

export const HistoryLogPlugin: JilitePlugin = {
  id: 'jilite.history-log',
  name: 'Historial',
  description: 'Registra automáticamente cada acción del proyecto en un log de auditoría con filtros por fecha y tipo de evento.',
  components: {
    ProjectView: HistoryLogView,
  },
  // Events are registered server-side only via history-log/events.ts
  // to avoid importing prisma into the client bundle.
};
