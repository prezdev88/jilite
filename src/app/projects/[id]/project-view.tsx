'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import KanbanBoard from './kanban-board';
import { Settings } from 'lucide-react';
import { Project, Column, Task, Label, ProjectPlugin } from '@prisma/client';
import { TaskWithLabels } from '@/lib/task-types';

type BoardProject = Project & { 
  columns: Column[]; 
  labels: Label[]; 
  tasks: TaskWithLabels[];
  plugins: ProjectPlugin[];
};

export function ProjectView({ project }: { project: BoardProject }) {
  const router = useRouter();
  const hasKanban = project.plugins.some(p => p.pluginId === 'jilite.kanban' && p.isActive);
  const [activeTab, setActiveTab] = useState(hasKanban ? 'kanban' : 'plugins');

  useEffect(() => {
    const eventSource = new EventSource('/api/v1/sync');
    eventSource.onmessage = () => {
      router.refresh();
    };
    return () => eventSource.close();
  }, [router]);

  useEffect(() => {
    if (activeTab === 'kanban' && !hasKanban) {
      setActiveTab('plugins');
    }
  }, [hasKanban, activeTab]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[#2e2e35] mb-4 pb-0 space-x-6 px-1">
        {hasKanban && (
          <button 
            className={`pb-3 border-b-2 text-sm font-medium ${activeTab === 'kanban' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('kanban')}
          >
            Tablero Kanban
          </button>
        )}
        <button 
          className={`pb-3 border-b-2 text-sm font-medium flex items-center gap-2 ${activeTab === 'plugins' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          onClick={() => setActiveTab('plugins')}
        >
          <Settings size={15} /> Configuración / Plugins
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'kanban' && hasKanban && (
          <KanbanBoard project={project} />
        )}
        {activeTab === 'plugins' && (
          <div className="plugins-settings">
            <h2 className="text-lg font-medium text-white mb-4">Plugins del Proyecto</h2>
            <div className="border border-[#2e2e35] rounded-md p-4 bg-[#1b1b20]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-medium text-white">Tablero Kanban</h3>
                  <p className="text-sm text-gray-400">Gestiona las tareas en columnas visuales.</p>
                </div>
                <button 
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${hasKanban ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                  onClick={async () => {
                     await fetch('/api/v1/plugins/toggle', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ projectId: project.id, pluginId: 'jilite.kanban', isActive: !hasKanban })
                     });
                  }}
                >
                  {hasKanban ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
