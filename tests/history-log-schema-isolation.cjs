const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, mkdtempSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { upgrade } = require('../src/plugins/history-log/upgrades/001-decouple-project-relation.cjs');
const { discoverUpgradeFiles } = require('../scripts/run-plugin-upgrades.cjs');

test('core and History Log schemas do not reference each other', () => {
  const coreSchema = readFileSync(resolve(__dirname, '../prisma/schema/core.prisma'), 'utf8');
  const pluginSchema = readFileSync(
    resolve(__dirname, '../src/plugins/history-log/history-log.prisma'),
    'utf8',
  );

  assert.doesNotMatch(coreSchema, /\bEventLog\b/);
  assert.doesNotMatch(pluginSchema, /\bProject\b|@relation/);
});

test('discovers History Log upgrades without hardcoded plugin names', () => {
  const upgrades = discoverUpgradeFiles(resolve(__dirname, '../src/plugins'));
  assert.equal(
    upgrades.some(filename => filename.endsWith('history-log/upgrades/001-decouple-project-relation.cjs')),
    true,
  );
  const runnerSource = readFileSync(resolve(__dirname, '../scripts/run-plugin-upgrades.cjs'), 'utf8');
  assert.doesNotMatch(runnerSource, /history-log|EventLog/);
});

test('removes the legacy relation without losing events and creates a recovery backup', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jilite-history-log-upgrade-'));
  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${join(directory, 'test.db')}` } },
  });

  try {
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    await prisma.$executeRawUnsafe('CREATE TABLE "Project" ("id" TEXT NOT NULL PRIMARY KEY)');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "EventLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "projectId" TEXT NOT NULL,
        "event" TEXT NOT NULL,
        "payload" TEXT NOT NULL,
        CONSTRAINT "EventLog_projectId_fkey"
          FOREIGN KEY ("projectId") REFERENCES "Project" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(
      'CREATE INDEX "EventLog_projectId_createdAt_idx" ON "EventLog"("projectId", "createdAt")',
    );
    await prisma.$executeRawUnsafe(
      'CREATE INDEX "EventLog_projectId_event_idx" ON "EventLog"("projectId", "event")',
    );
    await prisma.$executeRawUnsafe('INSERT INTO "Project" ("id") VALUES (?)', 'project-1');
    await prisma.$executeRawUnsafe(
      'INSERT INTO "EventLog" ("id", "projectId", "event", "payload") VALUES (?, ?, ?, ?)',
      'event-1',
      'project-1',
      'task:created',
      '{"taskId":"task-1"}',
    );

    const result = await upgrade(prisma);

    assert.equal(result.upgraded, true);
    assert.equal(existsSync(result.backupPath), true);
    assert.deepEqual(await prisma.$queryRawUnsafe(
      'SELECT "id", "projectId", "event", "payload" FROM "EventLog"',
    ), [{ id: 'event-1', projectId: 'project-1', event: 'task:created', payload: '{"taskId":"task-1"}' }]);
    assert.deepEqual(await prisma.$queryRawUnsafe('PRAGMA foreign_key_list("EventLog")'), []);
    const indexes = await prisma.$queryRawUnsafe('PRAGMA index_list("EventLog")');
    assert.equal(indexes.some(index => index.name === 'EventLog_projectId_createdAt_idx'), true);
    assert.equal(indexes.some(index => index.name === 'EventLog_projectId_event_idx'), true);

    const repeated = await upgrade(prisma);
    assert.deepEqual(repeated, { upgraded: false });
  } finally {
    await prisma.$disconnect();
  }
});
