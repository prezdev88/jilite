const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { PrismaClient } = require('@prisma/client');

const DEFAULT_PLUGINS_DIRECTORY = join(process.cwd(), 'src', 'plugins');

function discoverUpgradeFiles(directory = DEFAULT_PLUGINS_DIRECTORY) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
      if (!entry.isDirectory()) return [];
      const upgradesDirectory = join(directory, entry.name, 'upgrades');
      if (!existsSync(upgradesDirectory)) return [];
      return readdirSync(upgradesDirectory, { withFileTypes: true })
        .filter(file => file.isFile() && file.name.endsWith('.cjs'))
        .map(file => join(upgradesDirectory, file.name));
    })
    .sort();
}

async function runPluginUpgrades({ prisma, pluginsDirectory = DEFAULT_PLUGINS_DIRECTORY } = {}) {
  const client = prisma || new PrismaClient({
    datasources: process.env.DATABASE_URL
      ? { db: { url: process.env.DATABASE_URL } }
      : undefined,
  });
  try {
    for (const filename of discoverUpgradeFiles(pluginsDirectory)) {
      const migration = require(filename);
      if (typeof migration.upgrade !== 'function') {
        throw new Error(`Plugin upgrade does not export upgrade(prisma): ${filename}`);
      }
      await migration.upgrade(client);
    }
  } finally {
    if (!prisma) await client.$disconnect();
  }
}

module.exports = { discoverUpgradeFiles, runPluginUpgrades };

if (require.main === module) {
  runPluginUpgrades().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
