const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { PrismaClient } = require('@prisma/client');

test('assigns multiple colored labels to a task and replaces its selection', async () => {
  const projectRoot = resolve(__dirname, '..');
  const directory = mkdtempSync(join(tmpdir(), 'jilite-labels-test-'));
  const schemaPath = join(directory, 'schema.prisma');
  const databasePath = join(directory, 'dev.db');
  writeFileSync(schemaPath, readFileSync(join(projectRoot, 'prisma/schema.prisma'), 'utf8'));
  execFileSync(join(projectRoot, 'node_modules/.bin/prisma'), ['db', 'push', '--schema', schemaPath, '--skip-generate'], {
    cwd: projectRoot,
    stdio: 'ignore',
  });

  const prisma = new PrismaClient({ datasources: { db: { url: `file:${databasePath}` } } });
  try {
    const project = await prisma.project.create({
      data: { name: 'Labels', code: 'LBL' },
    });
    const column = await prisma.column.create({
      data: { name: 'To do', order: 0, projectId: project.id },
    });
    const urgent = await prisma.label.create({
      data: { name: 'Urgent', color: '#DC4C64', projectId: project.id },
    });
    const backend = await prisma.label.create({
      data: { name: 'Backend', color: '#3B82F6', projectId: project.id },
    });
    const task = await prisma.task.create({
      data: {
        title: 'Implement labels',
        number: 1,
        projectId: project.id,
        columnId: column.id,
        labels: { connect: [{ id: urgent.id }, { id: backend.id }] },
      },
      include: { labels: true },
    });

    assert.deepEqual(new Set(task.labels.map(label => label.name)), new Set(['Urgent', 'Backend']));
    assert(task.labels.every(label => /^#[0-9A-F]{6}$/.test(label.color)));

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { labels: { set: [{ id: backend.id }] } },
      include: { labels: true },
    });
    assert.deepEqual(updated.labels.map(label => label.name), ['Backend']);
  } finally {
    await prisma.$disconnect();
    rmSync(directory, { recursive: true, force: true });
  }
});
