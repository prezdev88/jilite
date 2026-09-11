const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join, resolve, relative, dirname } = require('node:path');
const { readFileSync, readdirSync, statSync } = require('node:fs');
const ts = require('typescript');

const PROJECT_ROOT = resolve(__dirname, '..');
const SRC_DIR = join(PROJECT_ROOT, 'src');

const pluginNames = readdirSync(join(SRC_DIR, 'plugins'))
  .filter(name => statSync(join(SRC_DIR, 'plugins', name)).isDirectory());

function resolveImport(importer, importedPath) {
  if (importedPath.startsWith('@/')) {
    return join(SRC_DIR, importedPath.slice(2));
  } else if (importedPath.startsWith('.')) {
    return resolve(dirname(importer), importedPath);
  }
  return null;
}

function getModule(absolutePath) {
  const rel = relative(SRC_DIR, absolutePath).replace(/\\/g, '/');
  
  if (
    rel === 'plugins/registry' || rel === 'plugins/registry.tsx' ||
    rel === 'plugins/server-registry' || rel === 'plugins/server-registry.ts' ||
    rel === 'plugins/manifest-registry' || rel === 'plugins/manifest-registry.ts'
  ) {
    return { type: 'composition-root', name: 'composition-root' };
  }
  
  if (rel.startsWith('plugins/')) {
    const parts = rel.split('/');
    if (pluginNames.includes(parts[1])) {
      return { type: 'plugin', name: parts[1] };
    }
  }
  
  return { type: 'core', name: 'core' };
}

function validateFile(importer, sourceText) {
  const errors = [];
  const info = ts.preProcessFile(sourceText, true, true);
  const importerModule = getModule(importer);
  
  for (const { fileName } of info.importedFiles) {
    const target = resolveImport(importer, fileName);
    if (!target) continue;
    
    const targetModule = getModule(target);
    
    if (targetModule.type === 'plugin') {
      if (importerModule.type === 'composition-root') {
        continue;
      }
      if (importerModule.type === 'plugin') {
        if (importerModule.name !== targetModule.name) {
          errors.push(`Plugin '${importerModule.name}' cannot import plugin '${targetModule.name}' (${fileName})`);
        }
      } else if (importerModule.type === 'core') {
        errors.push(`Core cannot import plugin '${targetModule.name}' (${fileName})`);
      }
    }
  }
  
  return errors;
}

function findFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const path = join(dir, file);
    if (statSync(path).isDirectory()) {
      findFiles(path, fileList);
    } else if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      fileList.push(path);
    }
  }
  return fileList;
}

test('allows composition roots to import plugins', () => {
  const importer = join(SRC_DIR, 'plugins/registry.tsx');
  const source = `
    import { KanbanPlugin } from './kanban';
    import { BacklogPlugin } from './backlog';
  `;
  const errors = validateFile(importer, source);
  assert.deepEqual(errors, []);
});

test('allows plugins to import core and SDK', () => {
  const importer = join(SRC_DIR, 'plugins/kanban/components/kanban-board.tsx');
  const source = `
    import { Button } from '@/components/ui/button';
    import { dispatchPluginEvent } from '@/plugins/server-runtime';
  `;
  const errors = validateFile(importer, source);
  assert.deepEqual(errors, []);
});

test('detects cross-plugin imports', () => {
  const importer = join(SRC_DIR, 'plugins/kanban/components/board.tsx');
  const source = `
    import { BacklogPlugin } from '../../backlog';
    import { HistoryLogPlugin } from '@/plugins/history-log';
    const dyn = import('../../../plugins/history-log/api/events');
  `;
  const errors = validateFile(importer, source);
  assert.deepEqual(errors, [
    "Plugin 'kanban' cannot import plugin 'backlog' (../../backlog)",
    "Plugin 'kanban' cannot import plugin 'history-log' (@/plugins/history-log)",
    "Plugin 'kanban' cannot import plugin 'history-log' (../../../plugins/history-log/api/events)"
  ]);
});

test('detects core importing a plugin', () => {
  const importer = join(SRC_DIR, 'app/projects/page.tsx');
  const source = `
    import { KanbanPlugin } from '@/plugins/kanban';
    import('@/plugins/backlog');
  `;
  const errors = validateFile(importer, source);
  assert.deepEqual(errors, [
    "Core cannot import plugin 'kanban' (@/plugins/kanban)",
    "Core cannot import plugin 'backlog' (@/plugins/backlog)"
  ]);
});

test('real codebase complies with architectural boundaries', () => {
  const files = findFiles(SRC_DIR);
  let hasErrors = false;
  
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const errors = validateFile(file, source);
    for (const error of errors) {
      console.error(`${relative(PROJECT_ROOT, file)}: ${error}`);
      hasErrors = true;
    }
  }
  
  assert.equal(hasErrors, false, 'Architectural boundary violations found');
});
