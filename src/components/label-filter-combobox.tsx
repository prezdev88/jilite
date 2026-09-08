'use client';

import { useEffect, useId, useState } from 'react';
import type { Label } from '@prisma/client';
import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { taskLabelStyle } from '@/components/task-labels';

type LabelFilterComboboxProps = {
  labels: Label[];
  value: string[];
  onChange: (labelIds: string[]) => void;
};

export function LabelFilterCombobox({ labels, value, onChange }: LabelFilterComboboxProps) {
  const inputId = useId();
  const [inputValue, setInputValue] = useState('');
  const selectedLabels = labels.filter(label => value.includes(label.id));

  useEffect(() => {
    if (value.length === 0) {
      setInputValue('');
    }
  }, [value.length]);

  return (
    <Combobox.Root
      items={labels}
      multiple
      value={selectedLabels}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      onValueChange={selected => onChange(selected.map(label => label.id))}
      itemToStringLabel={label => label.name}
      isItemEqualToValue={(label, selected) => label.id === selected.id}
    >
      <div className="label-filter-combobox">
        <Combobox.InputGroup className="label-filter-combobox-input-group">
          <Search className="label-filter-combobox-search" size={14} aria-hidden="true" />
          <Combobox.Value>
            {(selected: Label[]) => (
              <Combobox.Chips
                className="label-filter-combobox-chips"
                aria-label={selected.length > 0 ? 'Etiquetas seleccionadas' : undefined}
              >
                {selected.map(label => (
                  <Combobox.Chip
                    className="task-label label-filter-combobox-chip"
                    style={taskLabelStyle(label.color)}
                    aria-label={label.name}
                    aria-description="Presiona Retroceso o Suprimir para quitar esta etiqueta"
                    key={label.id}
                  >
                    <span className="task-label-dot" aria-hidden="true" />
                    {label.name}
                    <Combobox.ChipRemove
                      className="label-filter-combobox-chip-remove"
                      aria-label={`Quitar ${label.name}`}
                    >
                      <X size={12} />
                    </Combobox.ChipRemove>
                  </Combobox.Chip>
                ))}
                <Combobox.Input
                  id={inputId}
                  className="label-filter-combobox-input"
                  aria-label="Buscar y filtrar por etiquetas"
                  placeholder={selected.length > 0 ? 'Buscar otra…' : 'Buscar etiquetas…'}
                />
              </Combobox.Chips>
            )}
          </Combobox.Value>
          <Combobox.Trigger className="label-filter-combobox-trigger" aria-label="Mostrar etiquetas">
            <ChevronDown size={15} />
          </Combobox.Trigger>
        </Combobox.InputGroup>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner className="label-filter-combobox-positioner" sideOffset={5} align="start">
          <Combobox.Popup className="label-filter-combobox-popup">
            <Combobox.Empty className="label-filter-combobox-empty">
              No se encontraron etiquetas.
            </Combobox.Empty>
            <Combobox.List className="label-filter-combobox-list">
              {(label: Label) => (
                <Combobox.Item
                  className="label-filter-combobox-option"
                  style={taskLabelStyle(label.color)}
                  value={label}
                  key={label.id}
                >
                  <Combobox.ItemIndicator className="label-filter-combobox-indicator">
                    <Check size={14} />
                  </Combobox.ItemIndicator>
                  <span className="task-label-dot" aria-hidden="true" />
                  <span>{label.name}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
