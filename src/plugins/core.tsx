import type { ComponentType, ReactNode } from 'react';
import type { PluginManifest } from '@/plugin-sdk/manifest';

export interface JilitePlugin extends PluginManifest {
  /** Nombre visible del plugin */
  name: string;
  
  /** Descripción de lo que hace el plugin */
  description: string;

  /** Ícono del plugin (componente JSX, ej: <List size={16} />) */
  icon: ReactNode;
  
  /** Componente React que se renderizará cuando el plugin esté activo. Recibe el objeto del proyecto como prop. */
  components: {
    ProjectView: ComponentType<{ project: any }>;
  };

  /** Suscripción a eventos del backend (ej: "task:status_changed") */
  events?: Record<string, (payload: any) => Promise<void> | void>;
}
