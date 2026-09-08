const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');

const dispatcherSource = readFileSync(
  resolve(__dirname, '../src/lib/plugin-http.ts'),
  'utf8',
);
const { createPluginHttpDispatcher } = loadTypescriptModule('../src/lib/plugin-http.ts');

test('dispatches an HTTP request to a registered active plugin', async () => {
  let handled = false;
  const dispatch = createDispatcher({
    plugins: [plugin('history', 'events', () => {
      handled = true;
      return Response.json({ events: [] });
    })],
    isPluginActive: async () => true,
  });

  const response = await dispatch(
    'history',
    'events',
    'GET',
    request('project-1'),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { events: [] });
  assert.equal(handled, true);
});

test('rejects requests when the plugin is inactive for the project', async () => {
  let handled = false;
  const dispatch = createDispatcher({
    plugins: [plugin('history', 'events', () => {
      handled = true;
      return Response.json({ events: [] });
    })],
    isPluginActive: async () => false,
  });

  const response = await dispatch(
    'history',
    'events',
    'GET',
    request('project-1'),
  );

  assert.equal(response.status, 403);
  assert.equal(handled, false);
});

test('returns not found for an unregistered plugin', async () => {
  const dispatch = createDispatcher({ plugins: [] });

  const response = await dispatch(
    'not-installed',
    'events',
    'GET',
    request('project-1'),
  );

  assert.equal(response.status, 404);
});

test('returns not found for an unknown plugin route', async () => {
  const dispatch = createDispatcher({ plugins: [plugin('history', 'events', () => new Response())] });

  const response = await dispatch(
    'history',
    'unknown',
    'GET',
    request('project-1'),
  );

  assert.equal(response.status, 404);
});

test('returns method not allowed with the supported methods', async () => {
  const dispatch = createDispatcher({ plugins: [plugin('history', 'events', () => new Response())] });

  const response = await dispatch(
    'history',
    'events',
    'POST',
    request('project-1'),
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
});

test('isolates failures while checking whether the plugin is active', async () => {
  const errors = [];
  const dispatch = createDispatcher({
    plugins: [plugin('history', 'events', () => new Response())],
    isPluginActive: async () => { throw new Error('database unavailable'); },
    errors,
  });

  const response = await dispatch(
    'history',
    'events',
    'GET',
    request('project-1'),
  );

  assert.equal(response.status, 500);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].pluginId, 'history');
  assert.equal(errors[0].path, 'events');
});

test('the generic HTTP dispatcher does not import plugin implementations', () => {
  assert.doesNotMatch(dispatcherSource, /(?:from|import\()[^\n]*plugins\//);
});

function createDispatcher({
  plugins,
  isPluginActive = async () => true,
  errors = [],
}) {
  return createPluginHttpDispatcher({
    plugins,
    isPluginActive,
    reportError: (error, pluginId, path) => errors.push({ error, pluginId, path }),
  });
}

function plugin(id, path, handler) {
  return {
    id,
    http: [{
      path,
      handlers: { GET: handler },
      getProjectId: incomingRequest => new URL(incomingRequest.url).searchParams.get('projectId'),
    }],
  };
}

function request(projectId) {
  return new Request(`http://localhost/plugin?projectId=${projectId}`);
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
