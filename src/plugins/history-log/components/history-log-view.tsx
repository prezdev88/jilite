'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

type EventLogEntry = {
  id: string;
  createdAt: string;
  projectId: string;
  event: string;
  payload: unknown;
};

type HistoryLogProject = {
  id: string;
};

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  'task:created':        { label: 'Tarea creada',        color: '#30A46C' },
  'task:updated':        { label: 'Tarea editada',       color: '#0091FF' },
  'task:deleted':        { label: 'Tarea eliminada',     color: '#DC4C64' },
  'task:status_changed': { label: 'Cambio de estado',    color: '#E57A2A' },
  'project:created':     { label: 'Proyecto creado',     color: '#5B5BD6' },
  'project:updated':     { label: 'Proyecto editado',    color: '#8E4EC6' },
  'label:created':       { label: 'Etiqueta creada',     color: '#12A594' },
  'status:created':      { label: 'Estado creado',       color: '#D8A400' },
  'plugin:activated':    { label: 'Plugin activado',     color: '#0E9888' },
  'plugin:deactivated':  { label: 'Plugin desactivado',  color: '#AB4ABA' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function summarize(event: string, payload: unknown): string {
  switch (event) {
    case 'task:created':
      return `Se creó la tarea "${nestedValue(payload, 'task', 'title')}" (#${nestedValue(payload, 'task', 'number')})`;
    case 'task:updated':
      return `Se editó la tarea "${nestedValue(payload, 'task', 'title')}" (#${nestedValue(payload, 'task', 'number')})`;
    case 'task:deleted':
      return `Se eliminó la tarea "${nestedValue(payload, 'task', 'title')}" (#${nestedValue(payload, 'task', 'number')})`;
    case 'task:status_changed':
      return `Tarea #${value(payload, 'taskNumber')} cambió de estado`;
    case 'project:created':
      return `Se creó el proyecto "${nestedValue(payload, 'project', 'name')}"`;
    case 'project:updated':
      return `Se editó el proyecto "${nestedValue(payload, 'project', 'name')}"`;
    case 'label:created':
      return `Se creó la etiqueta "${nestedValue(payload, 'label', 'name')}"`;
    case 'status:created':
      return `Se creó el estado "${nestedValue(payload, 'status', 'name')}"`;
    case 'plugin:activated':
      return `Se activó el plugin "${nestedValue(payload, 'plugin', 'pluginId')}"`;
    case 'plugin:deactivated':
      return `Se desactivó el plugin "${nestedValue(payload, 'plugin', 'pluginId')}"`;
    default:
      return event;
  }
}

function nestedValue(payload: unknown, container: string, property: string) {
  if (!isRecord(payload) || !isRecord(payload[container])) return '?';
  return printableValue(payload[container][property]);
}

function value(payload: unknown, property: string) {
  if (!isRecord(payload)) return '?';
  return printableValue(payload[property]);
}

function printableValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? value : '?';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export default function HistoryLogView({ project }: { project: HistoryLogProject }) {
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ projectId: project.id, page: String(page), limit: '30' });
    if (filterEvent) params.set('event', filterEvent);
    if (filterFrom) params.set('from', new Date(filterFrom).toISOString());
    if (filterTo) params.set('to', new Date(filterTo + 'T23:59:59').toISOString());

    try {
      const res = await fetch(`/api/v1/plugins/jilite.history-log/events?${params}`);
      const data = await res.json();
      setEvents(data.events || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [project.id, page, filterEvent, filterFrom, filterTo]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function handleFilterChange() {
    setPage(1);
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Tipo de evento</label>
          <select
            className="bg-[#131316] border border-[#2e2e35] h-9 px-3 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            value={filterEvent}
            onChange={e => { setFilterEvent(e.target.value); handleFilterChange(); }}
          >
            <option value="">Todos los eventos</option>
            {Object.entries(EVENT_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Desde</label>
          <Input type="date" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); handleFilterChange(); }} className="bg-[#131316] border-[#2e2e35] h-9 w-[160px]" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Hasta</label>
          <Input type="date" value={filterTo} onChange={e => { setFilterTo(e.target.value); handleFilterChange(); }} className="bg-[#131316] border-[#2e2e35] h-9 w-[160px]" />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchEvents} disabled={loading} className="h-9">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
        </Button>
        <span className="text-xs text-gray-500 ml-auto">{total} evento{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto border border-[#2e2e35] rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#1b1b20] z-10">
            <tr className="text-left text-xs text-gray-400 border-b border-[#2e2e35]">
              <th className="px-4 py-3 font-medium w-[180px]">Fecha</th>
              <th className="px-4 py-3 font-medium w-[160px]">Evento</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {loading && events.length === 0 && (
              <tr><td colSpan={3} className="text-center text-gray-500 py-12">Cargando…</td></tr>
            )}
            {!loading && events.length === 0 && (
              <tr><td colSpan={3} className="text-center text-gray-500 py-12">No hay eventos registrados{filterEvent || filterFrom || filterTo ? ' con estos filtros' : ''}.</td></tr>
            )}
            {events.map(evt => {
              const meta = EVENT_LABELS[evt.event] || { label: evt.event, color: '#888' };
              const expanded = expandedId === evt.id;
              return (
                <tr
                  key={evt.id}
                  className="border-b border-[#2e2e35] hover:bg-[#1b1b20] cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expanded ? null : evt.id)}
                >
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap font-mono">{formatDate(evt.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: `${meta.color}1a`,
                        color: meta.color,
                        border: `1px solid ${meta.color}33`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <div>{summarize(evt.event, evt.payload)}</div>
                    {expanded && (
                      <pre className="mt-2 p-3 bg-[#131316] rounded-md text-xs text-gray-400 overflow-x-auto max-h-[200px]">
                        {JSON.stringify(evt.payload, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={14} /> Anterior
          </Button>
          <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Siguiente <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
