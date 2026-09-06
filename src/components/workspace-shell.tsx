import Link from 'next/link';
import { Layers2, LayoutGrid } from 'lucide-react';

type ProjectLink = { id: string; name: string; code: string };

export function WorkspaceShell({ children, projects, activeProject }: {
  children: React.ReactNode;
  projects: ProjectLink[];
  activeProject?: ProjectLink;
}) {
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Jilite, inicio">
          <span className="brand-mark"><Layers2 size={23} strokeWidth={2.2} /></span>
          jilite
        </Link>
        <nav aria-label="Navegación principal">
          <Link href="/" className={`nav-link ${!activeProject ? 'active' : ''}`} aria-current={!activeProject ? 'page' : undefined}><LayoutGrid size={17} /> Proyectos</Link>
          <span className="nav-caption project-caption">PROYECTOS</span>
          <div className="project-navigation">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className={`nav-link project-nav-link ${activeProject?.id === project.id ? 'active' : ''}`} aria-current={activeProject?.id === project.id ? 'page' : undefined}>
                <span className="entity-code nav-code">{project.code}</span><span className="truncate">{project.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>
      <div className="workspace-main">
        <main id="main-content" className={activeProject ? 'main-content board-page' : 'main-content'}>{children}</main>
      </div>
    </div>
  );
}
