'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Folder, LayoutGrid, List, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ProjectSummary = { id: string; name: string; code: string; description: string | null; _count: { tasks: number; statuses: number } };

export default function ProjectOverview({ projects }: { projects: ProjectSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [isCreating, setIsCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [newCode, setNewCode] = useState('');
  const filtered = projects.filter(project => `${project.code} ${project.name} ${project.description || ''}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    if (!name || pending) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/v1/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code: newCode, description: String(data.get('description') || '').trim() }),
      });
      const project = await response.json();
      if (!response.ok) {
        setError(project.error || 'No pudimos crear el proyecto. Inténtalo de nuevo.');
        return;
      }
      router.push(`/projects/${project.id}`);
      router.refresh();
      setIsCreating(false);
    } catch { setError('No pudimos crear el proyecto. Inténtalo de nuevo.'); }
    finally { setPending(false); }
  }

  return (
    <>
      <div className="page-heading">
        <h1>Proyectos <span className="heading-count">{projects.length}</span></h1>
        <Button onClick={() => { setError(''); setNewCode(''); setIsCreating(true); }}>
          <Plus size={16} /> Nuevo proyecto
        </Button>
      </div>

      <section aria-label="Tus proyectos">
        <div className="section-toolbar">
          <div className="search-field">
            <Search size={16} />
            <input aria-label="Buscar proyectos" placeholder="Buscar proyectos…" value={query} onChange={event => setQuery(event.target.value)} />
            {query && <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={14} /></button>}
          </div>
          <div className="view-switch" aria-label="Presentación de proyectos">
            <button aria-label="Vista de cuadrícula" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><LayoutGrid size={16} /></button>
            <button aria-label="Vista de lista" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><List size={17} /></button>
          </div>
        </div>
        <div className={`project-grid ${layout === 'list' ? 'project-list' : ''}`}>
          {filtered.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`} className="project-card">
              <div className="project-card-top"><span className="entity-code">{project.code}</span><ArrowUpRight className="project-arrow" size={16} /></div>
              <div className="project-card-copy">
                <h2>{project.name}</h2>
                {project.description && <p>{project.description}</p>}
              </div>
              <div className="project-card-footer">
                <span>{project._count.tasks} {project._count.tasks === 1 ? 'tarea' : 'tareas'}</span>
                <span aria-hidden="true">·</span>
                <span>{project._count.statuses} listas</span>
              </div>
            </Link>
          ))}
        </div>
        {query && !filtered.length && (
          <div className="empty-search">
            <h2>No encontramos proyectos</h2>
            <Button variant="outline" onClick={() => setQuery('')}>Ver todos los proyectos</Button>
          </div>
        )}
        {!query && !projects.length && (
          <div className="empty-search">
            <Folder size={28} />
            <h2>Aún no hay proyectos</h2>
            <p>Crea tu primer proyecto para empezar.</p>
          </div>
        )}
      </section>

      <Dialog open={isCreating} onOpenChange={open => { if (!pending) setIsCreating(open); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={createProject} className="dialog-form">
            <DialogHeader>
              <DialogTitle>Nuevo proyecto</DialogTitle>
              <DialogDescription>Define el nombre y, si quieres, una descripción.</DialogDescription>
            </DialogHeader>
            <div className="form-field">
              <label htmlFor="project-name">Nombre del proyecto</label>
              <Input autoFocus id="project-name" name="name" placeholder="Ej. Sitio web" required maxLength={120} />
            </div>
            <div className="form-field">
              <label htmlFor="project-code">Código del proyecto</label>
              <Input id="project-code" name="code" placeholder="NPR" required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={newCode} onChange={event => setNewCode(event.target.value.toUpperCase())} aria-describedby="project-code-hint" />
              <p id="project-code-hint" className="field-hint">Tres letras únicas. Las tareas se identificarán como {newCode.length === 3 ? newCode : 'NPR'}-1, {newCode.length === 3 ? newCode : 'NPR'}-2…</p>
            </div>
            <div className="form-field">
              <label htmlFor="project-description">Descripción <span>(opcional)</span></label>
              <Textarea id="project-description" name="description" rows={3} />
            </div>
            {error && <p className="error-message" role="alert">{error}</p>}
            <DialogFooter>
              <Button variant="outline" type="button" disabled={pending} onClick={() => setIsCreating(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>{pending ? 'Creando…' : 'Crear proyecto'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
