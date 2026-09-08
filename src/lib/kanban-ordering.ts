export type OrderedBoardTask = {
  id: string;
  statusId: string | null;
  order: number;
};

export type BoardTaskMove<T extends OrderedBoardTask> = {
  tasks: T[];
  destinationOrder: number;
};

export function moveBoardTask<T extends OrderedBoardTask>(
  tasks: T[],
  taskId: string,
  destinationStatusId: string,
  destinationVisibleIndex: number,
  visibleTaskIds: ReadonlySet<string>,
): BoardTaskMove<T> | null {
  const movedTask = tasks.find(task => task.id === taskId);
  if (!movedTask) {
    return null;
  }

  const sourceStatusId = movedTask.statusId;
  const destinationTasks = orderedTasks(tasks, destinationStatusId, taskId);
  const visibleDestinationTasks = destinationTasks.filter(task => visibleTaskIds.has(task.id));
  const boundedVisibleIndex = Math.min(
    Math.max(destinationVisibleIndex, 0),
    visibleDestinationTasks.length,
  );
  const destinationOrder = resolveDestinationOrder(
    destinationTasks,
    visibleDestinationTasks,
    boundedVisibleIndex,
  );
  const movedTaskAtDestination = {
    ...movedTask,
    statusId: destinationStatusId,
  };
  destinationTasks.splice(destinationOrder, 0, movedTaskAtDestination);

  if (sourceStatusId === destinationStatusId) {
    const unaffectedTasks = tasks.filter(task => task.statusId !== sourceStatusId);

    return {
      tasks: [...unaffectedTasks, ...withSequentialOrder(destinationTasks)],
      destinationOrder,
    };
  }

  const sourceTasks = orderedTasks(tasks, sourceStatusId, taskId);
  const unaffectedTasks = tasks.filter(task => (
    task.statusId !== sourceStatusId && task.statusId !== destinationStatusId
  ));

  return {
    tasks: [
      ...unaffectedTasks,
      ...withSequentialOrder(sourceTasks),
      ...withSequentialOrder(destinationTasks),
    ],
    destinationOrder,
  };
}

function orderedTasks<T extends OrderedBoardTask>(
  tasks: T[],
  statusId: string | null,
  excludedTaskId: string,
) {
  return tasks
    .filter(task => task.statusId === statusId && task.id !== excludedTaskId)
    .sort((first, second) => first.order - second.order);
}

function resolveDestinationOrder<T extends OrderedBoardTask>(
  destinationTasks: T[],
  visibleDestinationTasks: T[],
  destinationVisibleIndex: number,
) {
  if (!visibleDestinationTasks.length) {
    return destinationTasks.length;
  }

  if (destinationVisibleIndex === 0) {
    return destinationTasks.indexOf(visibleDestinationTasks[0]);
  }

  const previousVisibleTask = visibleDestinationTasks[destinationVisibleIndex - 1];

  return destinationTasks.indexOf(previousVisibleTask) + 1;
}

function withSequentialOrder<T extends OrderedBoardTask>(tasks: T[]) {
  return tasks.map((task, order) => ({ ...task, order }));
}
