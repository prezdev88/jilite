export type FilterableTask = {
  number: number;
  title: string;
  labels: ReadonlyArray<{ id: string }>;
};

export function matchesTaskFilters(
  task: FilterableTask,
  projectCode: string,
  query: string,
  activeLabelIds: ReadonlyArray<string>,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('es');
  const searchableText = `${projectCode}-${task.number} ${task.title}`.toLocaleLowerCase('es');
  const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
  const matchesLabels = activeLabelIds.every(labelId =>
    task.labels.some(label => label.id === labelId),
  );

  return matchesQuery && matchesLabels;
}
