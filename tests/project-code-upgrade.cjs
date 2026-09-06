const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { upgrade } = require('../scripts/backfill-project-codes.cjs');

test('upgrades existing projects and tasks without losing data; repeat runs keep codes stable', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jilite-upgrade-test-'));
  const prisma = new PrismaClient({ datasources: { db: { url: `file:${join(directory, 'test.db')}` } } });
  try {
    await prisma.$executeRawUnsafe('CREATE TABLE "Project" (id TEXT PRIMARY KEY, name TEXT, description TEXT)');
    await prisma.$executeRawUnsafe('CREATE TABLE "Task" (id TEXT PRIMARY KEY, projectId TEXT, title TEXT, detail TEXT)');
    await prisma.$executeRawUnsafe("INSERT INTO Project VALUES ('p1', 'Nuevo proyecto', 'Keep this'), ('p2', 'Nuevo proyecto', NULL), ('p3', 'Árbol', NULL)");
    await prisma.$executeRawUnsafe("INSERT INTO Task VALUES ('t1', 'p1', 'First', 'Keep detail'), ('t2', 'p1', 'Second', NULL), ('t3', 'p2', 'Third', NULL)");
    await upgrade(prisma);
    const projects = await prisma.$queryRawUnsafe('SELECT * FROM Project ORDER BY id');
    const tasks = await prisma.$queryRawUnsafe('SELECT * FROM Task ORDER BY id');
    assert.equal(projects[0].code, 'NUE');
    assert.equal(projects[2].code, 'ARB');
    assert.equal(new Set(projects.map(project => project.code)).size, 3);
    assert(projects.every(project => /^[A-Z]{3}$/.test(project.code)));
    assert.equal(projects[0].description, 'Keep this');
    assert.deepEqual(tasks.map(task => Number(task.number)), [1, 2, 1]);
    assert.equal(tasks[0].detail, 'Keep detail');
    assert.equal(Number(projects[0].nextTaskNumber), 2);
    await upgrade(prisma);
    assert.deepEqual(await prisma.$queryRawUnsafe('SELECT * FROM Project ORDER BY id'), projects);
    assert.deepEqual(await prisma.$queryRawUnsafe('SELECT * FROM Task ORDER BY id'), tasks);
  } finally { await prisma.$disconnect(); }
});
