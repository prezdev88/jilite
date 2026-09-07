'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Pencil } from 'lucide-react';
import { Project, Status, Task, Label, ProjectPlugin } from '@prisma/client';
import { TaskWithLabels } from '@/lib/task-types';
import { availablePlugins } from '@/plugins/registry';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

type BoardProject = Project & { 
  statuses: Status[]; 
  labels: Label[]; 
  tasks: TaskWithLabels[];
  plugins: ProjectPlugin[];
};

export function ProjectView({ project }: { project: BoardProject }) {
  const router = useRouter();

  const [optimisticToggles, setOptimisticToggles] = useState<Record<string, boolean>>({});

  const isPluginActive = (pluginId: string) => {
    if (optimisticToggles[pluginId] !== undefined) return optimisticToggles[pluginId];
    return project.plugins.some(p => p.pluginId === pluginId && p.isActive);
  };

  // Local state for the header rename logic that used to be in KanbanBoard
  const [isRenaming, setIsRenaming] = useState(false);
  const [pending, setPending] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const [projectDescription, setProjectDescription] = useState(project.description || '');
  const [displayedProjectName, setDisplayedProjectName] = useState(project.name);
  const [displayedProjectDescription, setDisplayedProjectDescription] = useState(project.description || '');
  const [renameError, setRenameError] = useState('');

  // What plugins are active?
  const activePlugins = availablePlugins.filter(plugin => isPluginActive(plugin.id));

  const [activeTab, setActiveTab] = useState(activePlugins.length > 0 ? activePlugins[0].id : 'plugins');

  useEffect(() => {
    const eventSource = new EventSource('/api/v1/sync');
    eventSource.onmessage = () => {
      // Clear optimistic state when real server state arrives
      setOptimisticToggles({});
      router.refresh();
    };
    return () => eventSource.close();
  }, [router]);

  useEffect(() => {
    // If the active tab is a plugin that got disabled, switch to plugins config
    if (activeTab !== 'plugins' && !activePlugins.some(p => p.id === activeTab)) {
      setActiveTab('plugins');
    }
  }, [activePlugins, activeTab]);

  async function renameProject(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !projectName.trim()) return;
    setPending(true);
    setRenameError('');
    try {
      const response = await fetch('/api/v1/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, name: projectName.trim(), description: projectDescription.trim() || null })
      });
      if (!response.ok) throw new Error();
      const updated = await response.json();
      setDisplayedProjectName(updated.name);
      setDisplayedProjectDescription(updated.description || '');
      setIsRenaming(false);
    } catch {
      setRenameError('No se pudo guardar el proyecto. Inténtalo de nuevo.');
    } finally {
      setPending(false);
    }
  }

  // Find the active plugin component
  const ActivePluginComponent = activePlugins.find(p => p.id === activeTab)?.components.ProjectView;

  return (
    <div className="flex flex-col h-full">
      {/* Project Header (Extracted from KanbanBoard) */}
      <div className="page-heading">
        <div>
          <span className="entity-code project-heading-code">{project.code}</span>
          <div className="project-title-row">
            <h1>{displayedProjectName}</h1>
            <button className="rename-project-button" aria-label="Editar proyecto" title="Editar proyecto" disabled={pending} onClick={() => { setProjectName(displayedProjectName); setProjectDescription(displayedProjectDescription); setRenameError(''); setIsRenaming(true); }}>
              <Pencil size={15} />
            </button>
          </div>
          {displayedProjectDescription && <p className="page-description">{displayedProjectDescription}</p>}
        </div>
      </div>

      <div className="flex border-b border-[#2e2e35] mb-4 pb-0 space-x-6 px-1">
        <button
          className={`pb-3 border-b-2 text-sm font-medium flex items-center gap-2 ${activeTab === 'plugins' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          onClick={() => setActiveTab('plugins')}
        >
          <Settings size={15} /> Configuración / Plugins
        </button>
        {activePlugins.map(plugin => (
          <button 
            key={plugin.id}
            className={`pb-3 border-b-2 text-sm font-medium flex items-center gap-2 ${activeTab === plugin.id ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab(plugin.id)}
          >
            {plugin.icon} {plugin.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activePlugins.map(plugin => {
          const PluginComponent = plugin.components.ProjectView;
          return (
            <div key={plugin.id} style={{ display: activeTab === plugin.id ? 'block' : 'none', height: '100%' }}>
              {PluginComponent && <PluginComponent project={project} />}
            </div>
          );
        })}

        {activeTab === 'plugins' && (
          <div className="plugins-settings">
            <h2 className="text-lg font-medium text-white mb-4">Plugins Disponibles</h2>
            <div className="grid gap-4">
              {availablePlugins.map(plugin => {
                const isActive = isPluginActive(plugin.id);
                return (
                  <div key={plugin.id} className="border border-[#2e2e35] rounded-md p-4 bg-[#1b1b20]">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="flex items-center gap-2 text-md font-medium text-white">
                          {plugin.icon}
                          {plugin.name}
                        </h3>
                        <p className="text-sm text-gray-400">{plugin.description}</p>
                      </div>
                      <Switch 
                        checked={isActive}
                        onCheckedChange={async (checked) => {
                           setOptimisticToggles(prev => ({ ...prev, [plugin.id]: checked }));
                           await fetch('/api/v1/plugins/toggle', {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json' },
                             body: JSON.stringify({ projectId: project.id, pluginId: plugin.id, isActive: checked })
                           });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={isRenaming} onOpenChange={open => { if (!pending) setIsRenaming(open); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={renameProject} className="dialog-form">
            <DialogHeader><DialogTitle>Editar proyecto</DialogTitle><DialogDescription>El código {project.code} y los códigos de las tareas se mantienen.</DialogDescription></DialogHeader>
            <div className="form-field">
              <label htmlFor="rename-project">Nombre del proyecto</label>
              <Input id="rename-project" autoFocus value={projectName} onChange={event => setProjectName(event.target.value)} required maxLength={120} />
            </div>
            <div className="form-field">
              <label htmlFor="edit-project-desc">Descripción (opcional)</label>
              <Textarea id="edit-project-desc" value={projectDescription} onChange={event => setProjectDescription(event.target.value)} rows={3} placeholder="Añade un poco de contexto sobre este proyecto..." />
            </div>
            {renameError && <p className="error-message" role="alert">{renameError}</p>}
            <DialogFooter><Button variant="outline" type="button" disabled={pending} onClick={() => setIsRenaming(false)}>Cancelar</Button><Button type="submit" disabled={pending || !projectName.trim()}>{pending ? 'Guardando…' : 'Guardar'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
