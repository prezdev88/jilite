import type { CSSProperties } from 'react';
import type { Label } from '@prisma/client';

export function taskLabelStyle(color: string): CSSProperties {
  return {
    '--task-label-color': color,
  } as CSSProperties;
}

export function TaskLabels({ labels, className = '' }: { labels: Label[]; className?: string }) {
  if (!labels.length) return null;

  return (
    <div className={`task-labels ${className}`.trim()} aria-label="Etiquetas">
      {labels.map(label => (
        <span className="task-label" style={taskLabelStyle(label.color)} key={label.id}>
          <span className="task-label-dot" aria-hidden="true" />
          {label.name}
        </span>
      ))}
    </div>
  );
}
