'use client';

import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Label } from '@prisma/client';
import { Pencil, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });
const MDPreview = dynamic(() => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown), { ssr: false });
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TaskLabels, taskLabelStyle } from './task-labels';
import { automaticLabelColor, labelNameKey, normalizeLabelName, parseLabelNames } from '@/lib/labels';
import type { TaskWithLabels } from '@/lib/task-types';

export function TaskDetails({ task, availableLabels, onSaved, onLabelCreated, onBusyChange, disabled = false }: {
  task: TaskWithLabels;
  availableLabels: Label[];
  onSaved: (task: TaskWithLabels) => void;
  onLabelCreated?: (label: Label) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [detail, setDetail] = useState(task.detail || '');
  const [labels, setLabels] = useState(availableLabels);
  const [selectedLabelIds, setSelectedLabelIds] = useState(task.labels.map(label => label.id));
  const [newLabelNames, setNewLabelNames] = useState('');
  const [pending, setPending] = useState(false);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [error, setError] = useState('');
  const [labelError, setLabelError] = useState('');

  useEffect(() => { setLabels(availableLabels); }, [availableLabels]);

  function beginEditing() {
    setTitle(task.title);
    setDetail(task.detail || '');
    setSelectedLabelIds(task.labels.map(label => label.id));
    setNewLabelNames('');
    setError('');
    setLabelError('');
    setEditing(true);
  }

  function toggleLabel(labelId: string) {
    setSelectedLabelIds(current => current.includes(labelId)
      ? current.filter(id => id !== labelId)
      : [...current, labelId]);
  }

  async function createLabels() {
    const names = parseLabelNames(newLabelNames);
    if (pending || creatingLabel || disabled || !names.length) return;
    setCreatingLabel(true);
    onBusyChange?.(true);
    setLabelError('');
    try {
      const response = await fetch('/api/v1/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, projectId: task.projectId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setLabelError(result.error || 'No pudimos crear la etiqueta.');
        return;
      }
      setLabels(current => [...current, ...result.labels.filter((label: Label) => !current.some(item => item.id === label.id))]
        .sort((first, second) => first.name.localeCompare(second.name, 'es')));
      setSelectedLabelIds(current => Array.from(new Set([...current, ...result.labels.map((label: Label) => label.id)])));
      setNewLabelNames('');
      result.labels.forEach((label: Label) => onLabelCreated?.(label));
    } catch {
      setLabelError('No pudimos crear la etiqueta. Inténtalo de nuevo.');
    } finally {
      setCreatingLabel(false);
      onBusyChange?.(false);
    }
  }

  function handleNewLabelKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void createLabels();
  }

  function selectExistingSuggestion(label: Label) {
    setSelectedLabelIds(current => current.includes(label.id) ? current : [...current, label.id]);
    const lastComma = newLabelNames.lastIndexOf(',');
    setNewLabelNames(lastComma < 0 ? '' : `${newLabelNames.slice(0, lastComma).trim()}, `);
  }

  const draftNames = newLabelNames.split(',').map(normalizeLabelName).filter(Boolean);
  const currentDraft = normalizeLabelName(newLabelNames.split(',').at(-1) || '');
  const currentDraftKey = labelNameKey(currentDraft);
  const matchingLabels = currentDraftKey
    ? labels.filter(label => labelNameKey(label.name).includes(currentDraftKey)).slice(0, 5)
    : [];

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending || creatingLabel || disabled || !title.trim()) return;
    setPending(true);
    onBusyChange?.(true);
    setError('');
    try {
      const response = await fetch('/api/v1/tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, title: title.trim(), detail, labelIds: selectedLabelIds }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'No pudimos guardar los cambios.');
        return;
      }
      onSaved(result);
      setEditing(false);
    } catch { setError('No pudimos guardar los cambios. Inténtalo de nuevo.'); }
    finally { setPending(false); onBusyChange?.(false); }
  }

  if (!editing) {
    return (
      <div className="task-detail">
        <div className="task-detail-heading">
          <h2>Etiquetas</h2>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={beginEditing}><Pencil size={14} /> Editar tarea</Button>
        </div>
        {task.labels.length ? <TaskLabels labels={task.labels} className="task-detail-labels" /> : <p className="task-detail-empty">Sin etiquetas.</p>}
        <div className="task-description">
          <h2>Descripción</h2>
          {task.detail ? (
            <div data-color-mode="dark" style={{ background: 'transparent' }}>
              <MDPreview source={task.detail} style={{ background: 'transparent' }} />
            </div>
          ) : <p>{'Sin descripción.'}</p>}
        </div>
      </div>
    );
  }

  return (
    <form className="task-edit-form" onSubmit={save}>
      <div className="form-field"><label htmlFor={`title-${task.id}`}>Título</label><Input id={`title-${task.id}`} autoFocus value={title} onChange={event => setTitle(event.target.value)} required disabled={pending || creatingLabel || disabled} /></div>
      <div className="form-field" data-color-mode="dark">
        <label>Descripción</label>
        <MDEditor value={detail} onChange={val => setDetail(val || '')} textareaProps={{ placeholder: 'Añade un poco de contexto...' }} preview="edit" height={250} />
      </div>
      <fieldset className="label-editor">
        <legend>Etiquetas</legend>
        {labels.length ? (
          <div className="label-options">
            {labels.map(label => {
              const selected = selectedLabelIds.includes(label.id);
              return (
                <button
                  className={`label-option${selected ? ' selected' : ''}`}
                  style={taskLabelStyle(label.color)}
                  type="button"
                  aria-pressed={selected}
                  disabled={pending || creatingLabel || disabled}
                  onClick={() => toggleLabel(label.id)}
                  key={label.id}
                >
                  <span className="task-label-dot" aria-hidden="true" />
                  {label.name}
                </button>
              );
            })}
          </div>
        ) : <p className="field-hint">Este proyecto todavía no tiene etiquetas.</p>}
        <div className="label-create-row">
          <Input aria-label="Nombres de las nuevas etiquetas" placeholder="Urgente, Backend, Diseño" value={newLabelNames} disabled={pending || creatingLabel || disabled} onChange={event => setNewLabelNames(event.target.value)} onKeyDown={handleNewLabelKeyDown} />
          <Button type="button" variant="outline" disabled={pending || creatingLabel || disabled || !parseLabelNames(newLabelNames).length} onClick={() => void createLabels()}><Plus size={14} /> {creatingLabel ? 'Añadiendo…' : 'Añadir'}</Button>
        </div>
        <p className="field-hint">Separa varias etiquetas con comas. El color se asigna automáticamente.</p>
        {draftNames.length > 0 && (
          <div className="label-draft-list" aria-label="Vista previa de etiquetas">
            {draftNames.map((name, index) => {
              const existing = labels.find(label => labelNameKey(label.name) === labelNameKey(name));
              const repeated = draftNames.findIndex(candidate => labelNameKey(candidate) === labelNameKey(name)) !== index;
              const newLabelIndex = draftNames.slice(0, index).filter((candidate, candidateIndex, all) =>
                all.findIndex(item => labelNameKey(item) === labelNameKey(candidate)) === candidateIndex &&
                !labels.some(label => labelNameKey(label.name) === labelNameKey(candidate))).length;
              const color = existing?.color || automaticLabelColor(labels.length + newLabelIndex);
              return (
                <span className={`label-draft${existing || repeated ? ' existing' : ''}`} style={taskLabelStyle(color)} key={`${labelNameKey(name)}-${index}`}>
                  <span className="task-label-dot" aria-hidden="true" />
                  {existing?.name || name}
                  <small>{repeated ? 'repetida' : existing ? 'ya existe' : 'nueva'}</small>
                </span>
              );
            })}
          </div>
        )}
        {matchingLabels.length > 0 && (
          <div className="existing-label-suggestions">
            <span>Coincidencias existentes:</span>
            {matchingLabels.map(label => (
              <button type="button" style={taskLabelStyle(label.color)} disabled={pending || creatingLabel || disabled} onClick={() => selectExistingSuggestion(label)} key={label.id}>
                <span className="task-label-dot" aria-hidden="true" /> {label.name}
              </button>
            ))}
          </div>
        )}
        {labelError && <p role="alert" className="error-message">{labelError}</p>}
      </fieldset>
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className="task-edit-actions"><Button type="button" variant="outline" disabled={pending || creatingLabel || disabled} onClick={() => setEditing(false)}>Cancelar edición</Button><Button type="submit" disabled={pending || creatingLabel || disabled || !title.trim()}>{pending ? 'Guardando…' : 'Guardar cambios'}</Button></div>
    </form>
  );
}
