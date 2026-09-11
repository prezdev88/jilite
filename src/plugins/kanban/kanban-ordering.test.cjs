const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');

const { moveBoardTask } = loadTypescriptModule('./kanban-ordering.ts');

test('reorders visible tasks while preserving the relative order of hidden tasks', () => {
  const tasks = [
    task('hidden-1', 'todo', 0),
    task('visible-1', 'todo', 1),
    task('hidden-2', 'todo', 2),
    task('visible-2', 'todo', 3),
    task('hidden-3', 'todo', 4),
    task('visible-3', 'todo', 5),
  ];
  const visibleTaskIds = new Set(['visible-1', 'visible-2', 'visible-3']);

  const result = moveBoardTask(tasks, 'visible-3', 'todo', 0, visibleTaskIds);

  assert(result);
  assert.equal(result.destinationOrder, 1);
  assert.deepEqual(idsInStatus(result.tasks, 'todo'), [
    'hidden-1',
    'visible-3',
    'visible-1',
    'hidden-2',
    'visible-2',
    'hidden-3',
  ]);
  assert.deepEqual(ordersInStatus(result.tasks, 'todo'), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(hiddenIds(result.tasks), ['hidden-1', 'hidden-2', 'hidden-3']);
});

test('moves a visible task between statuses using the filtered destination index', () => {
  const tasks = [
    task('source-hidden', 'todo', 0),
    task('moving', 'todo', 1),
    task('source-visible', 'todo', 2),
    task('destination-hidden-1', 'doing', 0),
    task('destination-visible-1', 'doing', 1),
    task('destination-hidden-2', 'doing', 2),
    task('destination-visible-2', 'doing', 3),
  ];
  const visibleTaskIds = new Set([
    'moving',
    'source-visible',
    'destination-visible-1',
    'destination-visible-2',
  ]);

  const result = moveBoardTask(tasks, 'moving', 'doing', 1, visibleTaskIds);

  assert(result);
  assert.equal(result.destinationOrder, 2);
  assert.deepEqual(idsInStatus(result.tasks, 'todo'), ['source-hidden', 'source-visible']);
  assert.deepEqual(idsInStatus(result.tasks, 'doing'), [
    'destination-hidden-1',
    'destination-visible-1',
    'moving',
    'destination-hidden-2',
    'destination-visible-2',
  ]);
  assert.deepEqual(ordersInStatus(result.tasks, 'todo'), [0, 1]);
  assert.deepEqual(ordersInStatus(result.tasks, 'doing'), [0, 1, 2, 3, 4]);
});

test('uses the tasks matching all active filters as destination anchors', () => {
  const tasks = [
    task('moving', 'todo', 0),
    task('matches-one-filter', 'doing', 0),
    task('matches-all-filters', 'doing', 1),
    task('hidden', 'doing', 2),
  ];
  const visibleTaskIds = new Set(['moving', 'matches-all-filters']);

  const result = moveBoardTask(tasks, 'moving', 'doing', 0, visibleTaskIds);

  assert(result);
  assert.equal(result.destinationOrder, 1);
  assert.deepEqual(idsInStatus(result.tasks, 'doing'), [
    'matches-one-filter',
    'moving',
    'matches-all-filters',
    'hidden',
  ]);
});

test('appends to a destination without visible tasks', () => {
  const tasks = [
    task('moving', 'todo', 0),
    task('hidden-1', 'doing', 0),
    task('hidden-2', 'doing', 1),
  ];
  const visibleTaskIds = new Set(['moving']);

  const result = moveBoardTask(tasks, 'moving', 'doing', 0, visibleTaskIds);

  assert(result);
  assert.equal(result.destinationOrder, 2);
  assert.deepEqual(idsInStatus(result.tasks, 'doing'), ['hidden-1', 'hidden-2', 'moving']);
});

function loadTypescriptModule(relativePath) {
  const filename = resolve(__dirname, relativePath);
  const source = readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  const loadedModule = { exports: {} };
  const load = new Function('exports', 'module', output);
  load(loadedModule.exports, loadedModule);

  return loadedModule.exports;
}

function task(id, statusId, order) {
  return { id, statusId, order };
}

function idsInStatus(tasks, statusId) {
  return tasks
    .filter(item => item.statusId === statusId)
    .sort((first, second) => first.order - second.order)
    .map(item => item.id);
}

function ordersInStatus(tasks, statusId) {
  return tasks
    .filter(item => item.statusId === statusId)
    .sort((first, second) => first.order - second.order)
    .map(item => item.order);
}

function hiddenIds(tasks) {
  return tasks
    .filter(item => item.id.startsWith('hidden'))
    .sort((first, second) => first.order - second.order)
    .map(item => item.id);
}
