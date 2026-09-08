// Upgrade existing SQLite data before Prisma makes the new fields required.
const { PrismaClient } = require('@prisma/client');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomUUID } = require('node:crypto');

async function upgrade(prisma) {
  const projectFields = await prisma.$queryRawUnsafe('PRAGMA table_info("Project")');
  if (!projectFields.length) return; // A fresh database is created by db push.
  const taskFields = await prisma.$queryRawUnsafe('PRAGMA table_info("Task")');
  const missingCodes = await prisma.$queryRawUnsafe(
    projectFields.some(field => field.name === 'code')
      ? 'SELECT COUNT(*) AS count FROM "Project" WHERE "code" IS NULL'
      : 'SELECT COUNT(*) AS count FROM "Project"'
  );
  const needsUpgrade = !projectFields.some(field => field.name === 'nextTaskNumber')
    || !taskFields.some(field => field.name === 'number')
    || Number(missingCodes[0].count) > 0;
  if (!needsUpgrade) return;

  const backup = join(tmpdir(), `jilite-before-codes-${randomUUID()}.db`);
  await prisma.$executeRawUnsafe(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
  console.log(`Database backup: ${backup}`);

  await prisma.$transaction(async tx => {
    if (!projectFields.some(field => field.name === 'code')) {
      await tx.$executeRawUnsafe('ALTER TABLE "Project" ADD COLUMN "code" TEXT');
    }
    if (!projectFields.some(field => field.name === 'nextTaskNumber')) {
      await tx.$executeRawUnsafe('ALTER TABLE "Project" ADD COLUMN "nextTaskNumber" INTEGER NOT NULL DEFAULT 0');
    }
    if (!taskFields.some(field => field.name === 'number')) {
      await tx.$executeRawUnsafe('ALTER TABLE "Task" ADD COLUMN "number" INTEGER');
    }
    const projects = await tx.$queryRawUnsafe('SELECT "id", "name", "code", "nextTaskNumber" FROM "Project" ORDER BY rowid');
    const used = new Set(projects.map(project => project.code).filter(Boolean));
    for (const project of projects) {
      let code = project.code;
      if (!code) {
        const letters = project.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
        code = (letters + 'PRJ').slice(0, 3);
        for (let index = 0; used.has(code); index++) {
          if (index >= 26 ** 3) throw new Error('No available three-letter project codes.');
          code = String.fromCharCode(65 + Math.floor(index / 676), 65 + Math.floor(index / 26) % 26, 65 + index % 26);
        }
        used.add(code);
      }
      const tasks = await tx.$queryRawUnsafe('SELECT "id", "number" FROM "Task" WHERE "projectId" = ? ORDER BY rowid', project.id);
      let number = tasks.reduce((highest, task) => Math.max(highest, Number(task.number || 0)), Number(project.nextTaskNumber));
      for (const task of tasks) {
        if (task.number === null) {
          await tx.$executeRawUnsafe('UPDATE "Task" SET "number" = ? WHERE "id" = ?', ++number, task.id);
        }
      }
      await tx.$executeRawUnsafe('UPDATE "Project" SET "code" = ?, "nextTaskNumber" = ? WHERE "id" = ?', code, number, project.id);
    }
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Project_code_key" ON "Project"("code")');
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Task_projectId_number_key" ON "Task"("projectId", "number")');
  }, { timeout: 60000 });
}

module.exports = { upgrade };

if (require.main === module) {
  const prisma = new PrismaClient({
    datasources: process.env.DATABASE_URL
      ? { db: { url: process.env.DATABASE_URL } }
      : undefined,
  });
  upgrade(prisma).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
