const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');

const dispatcherSource = readFileSync(
  resolve(__dirname, '../src/lib/plugin-events.ts'),
  'utf8',
);
const { createPluginEventDispatcher } = loadTypescriptModule('../src/lib/plugin-events.ts');

test('dispatches an event only to registered active plugins', async () => {
  const handled = [];
  const published = [];
  const errors = [];
  const dispatch = createDispatcher({
    plugins: [
      plugin('active', payload => handled.push(payload)),
      plugin('inactive', () => handled.push('inactive')),
    ],
    activePluginIds: ['active'],
    published,
    errors,
  });
  const payload = { task: { projectId: 'project-1' } };

  await dispatch('project-1', 'task:created', payload);

  assert.deepEqual(handled, [payload]);
  assert.deepEqual(published, [{ eventName: 'task:created', payload }]);
  assert.deepEqual(errors, []);
});

test('ignores active database records that have no registered contribution', async () => {
  const handled = [];
  const dispatch = createDispatcher({
    plugins: [plugin('registered', payload => handled.push(payload))],
    activePluginIds: ['not-installed'],
  });

  await dispatch('project-1', 'task:created', { task: { projectId: 'project-1' } });

  assert.deepEqual(handled, []);
});

test('works with an empty registry', async () => {
  const published = [];
  const dispatch = createDispatcher({ plugins: [], activePluginIds: ['jilite.history-log'], published });
  const payload = { project: { id: 'project-1' } };

  await dispatch('project-1', 'project:created', payload);

  assert.deepEqual(published, [{ eventName: 'project:created', payload }]);
});

test('isolates handler failures and continues dispatching', async () => {
  const handled = [];
  const errors = [];
  const dispatch = createDispatcher({
    plugins: [
      plugin('failing', () => { throw new Error('failure'); }),
      plugin('healthy', payload => handled.push(payload)),
    ],
    activePluginIds: ['failing', 'healthy'],
    errors,
  });
  const payload = { task: { projectId: 'project-1' } };

  await dispatch('project-1', 'task:created', payload);

  assert.deepEqual(handled, [payload]);
  assert.equal(errors.length, 1);
  assert.deepEqual(errors[0].failure, {
    phase: 'plugin-handler',
    projectId: 'project-1',
    eventName: 'task:created',
    pluginId: 'failing',
  });
});

test('the core dispatcher does not import plugin implementations', () => {
  assert.doesNotMatch(dispatcherSource, /(?:from|import\()[^\n]*plugins\//);
});

function createDispatcher({ plugins, activePluginIds, published = [], errors = [] }) {
  return createPluginEventDispatcher({
    plugins,
    findActivePluginIds: async () => activePluginIds,
    publishCoreEvent: (eventName, payload) => published.push({ eventName, payload }),
    reportError: (error, failure) => errors.push({ error, failure }),
  });
}

function plugin(id, handler) {
  return { id, events: { 'task:created': handler } };
}

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
