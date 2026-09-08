import type { PluginEventName } from '@/plugin-sdk/server';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const EVENT_NAMES = new Set<PluginEventName>([
  'task:created',
  'task:updated',
  'task:deleted',
  'task:status_changed',
  'project:created',
  'project:updated',
  'label:created',
  'status:created',
  'plugin:activated',
  'plugin:deactivated',
]);

export type HistoryLogQuery = {
  projectId: string;
  event?: PluginEventName;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
};

export type HistoryLogQueryResult =
  | { success: true; query: HistoryLogQuery }
  | { success: false; error: string };

export function parseHistoryLogQuery(url: string): HistoryLogQueryResult {
  const searchParams = new URL(url).searchParams;
  const projectId = searchParams.get('projectId')?.trim() || '';
  if (!projectId || projectId.length > 191) {
    return invalid('Indica un projectId válido.');
  }

  const eventValue = searchParams.get('event')?.trim() || '';
  if (eventValue && !EVENT_NAMES.has(eventValue as PluginEventName)) {
    return invalid('El tipo de evento no es válido.');
  }

  const page = parsePositiveInteger(searchParams.get('page'), DEFAULT_PAGE);
  if (page === null) return invalid('La página debe ser un entero mayor que cero.');

  const limit = parsePositiveInteger(searchParams.get('limit'), DEFAULT_LIMIT);
  if (limit === null || limit > MAX_LIMIT) {
    return invalid(`El límite debe ser un entero entre 1 y ${MAX_LIMIT}.`);
  }

  const from = parseDate(searchParams.get('from'));
  if (from === null) return invalid('La fecha inicial no es válida.');

  const to = parseDate(searchParams.get('to'));
  if (to === null) return invalid('La fecha final no es válida.');
  if (from && to && from > to) {
    return invalid('La fecha inicial no puede ser posterior a la fecha final.');
  }

  return {
    success: true,
    query: {
      projectId,
      ...(eventValue ? { event: eventValue as PluginEventName } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      page,
      limit,
    },
  };
}

function parsePositiveInteger(value: string | null, fallback: number) {
  if (value === null || value === '') return fallback;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseDate(value: string | null) {
  if (value === null || value === '') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function invalid(error: string): HistoryLogQueryResult {
  return { success: false, error };
}
