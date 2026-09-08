/* eslint-disable @typescript-eslint/no-require-imports */
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomUUID } = require('node:crypto');

const REQUIRED_COLUMNS = ['id', 'createdAt', 'projectId', 'event', 'payload'];

async function upgrade(prisma) {
  const columns = await prisma.$queryRawUnsafe('PRAGMA table_info("EventLog")');
  if (columns.length === 0) return { upgraded: false };

  const foreignKeys = await prisma.$queryRawUnsafe('PRAGMA foreign_key_list("EventLog")');
  const hasProjectRelation = foreignKeys.some(foreignKey =>
    foreignKey.table === 'Project' && foreignKey.from === 'projectId',
  );
  if (!hasProjectRelation) return { upgraded: false };

  const columnNames = new Set(columns.map(column => column.name));
  const missingColumns = REQUIRED_COLUMNS.filter(column => !columnNames.has(column));
  if (missingColumns.length > 0) {
    throw new Error(`EventLog has an unexpected schema; missing: ${missingColumns.join(', ')}`);
  }

  const backupPath = join(tmpdir(), `jilite-before-history-log-decoupling-${randomUUID()}.db`);
  await prisma.$executeRawUnsafe(`VACUUM INTO '${backupPath.replaceAll("'", "''")}'`);
  console.log(`Database backup: ${backupPath}`);

  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
  try {
    await prisma.$transaction(async transaction => {
      await transaction.$executeRawUnsafe('DROP TABLE IF EXISTS "EventLog_without_project_fk"');
      await transaction.$executeRawUnsafe(`
        CREATE TABLE "EventLog_without_project_fk" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "projectId" TEXT NOT NULL,
          "event" TEXT NOT NULL,
          "payload" TEXT NOT NULL
        )
      `);
      await transaction.$executeRawUnsafe(`
        INSERT INTO "EventLog_without_project_fk" ("id", "createdAt", "projectId", "event", "payload")
        SELECT "id", "createdAt", "projectId", "event", "payload" FROM "EventLog"
      `);
      await transaction.$executeRawUnsafe('DROP TABLE "EventLog"');
      await transaction.$executeRawUnsafe('ALTER TABLE "EventLog_without_project_fk" RENAME TO "EventLog"');
      await transaction.$executeRawUnsafe(
        'CREATE INDEX "EventLog_projectId_createdAt_idx" ON "EventLog"("projectId", "createdAt")',
      );
      await transaction.$executeRawUnsafe(
        'CREATE INDEX "EventLog_projectId_event_idx" ON "EventLog"("projectId", "event")',
      );
    }, { timeout: 60000 });
  } finally {
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  }

  return { upgraded: true, backupPath };
}

module.exports = { upgrade };
