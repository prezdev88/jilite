import { ComponentType } from 'react';

export interface JilitePlugin {
  /** Un identificador único para el plugin, ej: jilite.kanban */
  id: string;
  
  /** Nombre visible del plugin */
  name: string;
  
  /** Descripción de lo que hace el plugin */
  description: string;
  
  /** Componente React que se renderizará cuando el plugin esté activo. Recibe el objeto del proyecto como prop. */
  components: {
    ProjectView: ComponentType<{ project: any }>;
  };

  /** Suscripción a eventos del backend (ej: "task:status_changed") */
  events?: Record<string, (payload: any) => Promise<void> | void>;
}
