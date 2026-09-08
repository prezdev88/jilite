const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');

const { matchesTaskFilters } = loadTypescriptModule('../src/lib/task-filtering.ts');

const tasks = [
  { number: 13, title: 'Filtrar el backlog', labels: [{ id: 'frontend' }, { id: 'ux' }] },
  { number: 14, title: 'Actualizar eventos SSE', labels: [{ id: 'frontend' }, { id: 'realtime' }] },
  { number: 15, title: 'Revisar índices', labels: [{ id: 'backend' }] },
];

test('matches by task code or title without active labels', () => {
  assert.equal(matchesTaskFilters(tasks[0], 'MNT', 'mnt-13', []), true);
  assert.equal(matchesTaskFilters(tasks[0], 'MNT', 'BACKLOG', []), true);
  assert.equal(matchesTaskFilters(tasks[1], 'MNT', 'backlog', []), false);
});

test('requires the task to contain every selected label', () => {
  assert.equal(matchesTaskFilters(tasks[0], 'MNT', '', ['frontend']), true);
  assert.equal(matchesTaskFilters(tasks[0], 'MNT', '', ['frontend', 'ux']), true);
  assert.equal(matchesTaskFilters(tasks[1], 'MNT', '', ['frontend', 'ux']), false);
});

test('combines text and label filters', () => {
  assert.equal(matchesTaskFilters(tasks[1], 'MNT', 'SSE', ['frontend', 'realtime']), true);
  assert.equal(matchesTaskFilters(tasks[1], 'MNT', 'SSE', ['backend']), false);
  assert.equal(matchesTaskFilters(tasks[2], 'MNT', 'SSE', ['backend']), false);
});

test('ignores surrounding whitespace in the search query', () => {
  assert.equal(matchesTaskFilters(tasks[0], 'MNT', '  MNT-13  ', []), true);
  assert.equal(matchesTaskFilters(tasks[0], 'MNT', '   ', []), true);
});

function loadTypescriptModule(relativePath) {
  const filename = resolve(__dirname, relativePath);
  const source = readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  const loadedModule = { exports: {} };
  const load = new Function('exports', 'module', output);
  load(loadedModule.exports, loadedModule);
  return loadedModule.exports;
}
