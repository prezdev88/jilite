import { ScrollText } from 'lucide-react';
import type { JilitePlugin } from '../core';
import HistoryLogView from './components/history-log-view';

export const HistoryLogPlugin: JilitePlugin = {
  id: 'jilite.history-log',
  name: 'Historial',
  description: 'Registra automáticamente cada acción del proyecto en un log de auditoría con filtros por fecha y tipo de evento.',
  icon: <ScrollText size={16} />,
  components: {
    ProjectView: HistoryLogView,
  },
};
