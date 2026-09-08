const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('typescript');

const { assertUniquePluginIds, createPluginManifestRegistry } = loadTypescriptModule(
  '../src/plugin-sdk/manifest.ts',
);
const { createDefaultProjectPlugins } = loadTypescriptModule(
  '../src/lib/project-plugin-defaults.ts',
);
const { backlogManifest } = loadTypescriptModule('../src/plugins/backlog/manifest.ts');
const { kanbanManifest } = loadTypescriptModule('../src/plugins/kanban/manifest.ts');
const { historyLogManifest } = loadTypescriptModule('../src/plugins/history-log/manifest.ts');

const projectRouteSource = readFileSync(
  resolve(__dirname, '../src/app/api/v1/projects/route.ts'),
  'utf8',
);
const toggleRouteSource = readFileSync(
  resolve(__dirname, '../src/app/api/v1/plugins/toggle/route.ts'),
  'utf8',
);

test('creates the initial plugin state from default-enabled manifests', () => {
  const registry = createPluginManifestRegistry([
    backlogManifest,
    kanbanManifest,
    historyLogManifest,
  ]);

  assert.deepEqual(createDefaultProjectPlugins(registry), [
    { pluginId: backlogManifest.id, isActive: true },
  ]);
  assert.match(projectRouteSource, /createDefaultProjectPlugins\(pluginManifestRegistry\)/);
  assert.doesNotMatch(projectRouteSource, /jilite\.[a-z-]+/);
});

test('rejects duplicated plugin identifiers while building a registry', () => {
  assert.throws(
    () => createPluginManifestRegistry([
      { id: 'example.plugin', apiVersion: 1 },
      { id: 'example.plugin', apiVersion: 1 },
    ]),
    /Duplicate plugin id in manifest registry: example\.plugin/,
  );
});

test('composition roots fail fast when contributions contain duplicate identifiers', () => {
  assert.throws(
    () => assertUniquePluginIds(
      [{ id: 'example.plugin' }, { id: 'example.plugin' }],
      'server plugin registry',
    ),
    /Duplicate plugin id in server plugin registry: example\.plugin/,
  );
});

test('distinguishes unknown and incompatible plugins', () => {
  const registry = createPluginManifestRegistry([
    { id: 'compatible', apiVersion: 1 },
    { id: 'future', apiVersion: 2, enabledByDefault: true },
  ]);

  assert.equal(registry.compatibilityIssue('missing'), 'not-registered');
  assert.equal(registry.compatibilityIssue('future'), 'incompatible');
  assert.equal(registry.compatibilityIssue('compatible'), null);
  assert.deepEqual(registry.defaultEnabled(), []);
});

test('the toggle adapter validates plugins through the manifest registry', () => {
  assert.match(toggleRouteSource, /pluginManifestRegistry\.compatibilityIssue\(pluginId\)/);
  assert.match(toggleRouteSource, /PLUGIN_NOT_REGISTERED/);
  assert.match(toggleRouteSource, /PLUGIN_INCOMPATIBLE/);
  assert.doesNotMatch(toggleRouteSource, /jilite\.[a-z-]+/);
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
