const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');

const { parseHistoryLogQuery } = loadTypescriptModule(
  '../src/plugins/history-log/api/event-query.ts',
);

test('uses safe pagination defaults', () => {
  const result = parseHistoryLogQuery('http://localhost/events?projectId=project-1');

  assert.equal(result.success, true);
  assert.deepEqual(result.query, {
    projectId: 'project-1',
    page: 1,
    limit: 50,
  });
});

test('parses supported filters and pagination', () => {
  const result = parseHistoryLogQuery(
    'http://localhost/events?projectId=project-1&event=task%3Acreated&from=2026-01-01&to=2026-01-31&page=2&limit=25',
  );

  assert.equal(result.success, true);
  assert.equal(result.query.projectId, 'project-1');
  assert.equal(result.query.event, 'task:created');
  assert.equal(result.query.from.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(result.query.to.toISOString(), '2026-01-31T00:00:00.000Z');
  assert.equal(result.query.page, 2);
  assert.equal(result.query.limit, 25);
});

test('rejects missing projects and unsupported events', () => {
  assert.equal(parseHistoryLogQuery('http://localhost/events').success, false);
  assert.equal(
    parseHistoryLogQuery('http://localhost/events?projectId=project-1&event=unknown').success,
    false,
  );
});

test('rejects unsafe pagination values', () => {
  for (const query of ['page=0', 'page=1.5', 'limit=0', 'limit=101']) {
    const result = parseHistoryLogQuery(`http://localhost/events?projectId=project-1&${query}`);
    assert.equal(result.success, false, query);
  }
});

test('rejects invalid or reversed date ranges', () => {
  assert.equal(
    parseHistoryLogQuery('http://localhost/events?projectId=project-1&from=invalid').success,
    false,
  );
  assert.equal(
    parseHistoryLogQuery(
      'http://localhost/events?projectId=project-1&from=2026-02-01&to=2026-01-01',
    ).success,
    false,
  );
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
