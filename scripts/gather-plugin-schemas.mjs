import fs from 'fs';
import path from 'path';

const PLUGINS_DIR = path.join(process.cwd(), 'src', 'plugins');
const SCHEMA_DEST_DIR = path.join(process.cwd(), 'prisma', 'schema', 'plugins');

if (fs.existsSync(SCHEMA_DEST_DIR)) {
  fs.rmSync(SCHEMA_DEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SCHEMA_DEST_DIR, { recursive: true });

function gatherSchemas(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      gatherSchemas(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.prisma')) {
      const pluginName = path.basename(path.dirname(fullPath));
      const destName = `${pluginName}_${entry.name}`;
      const destPath = path.join(SCHEMA_DEST_DIR, destName);
      
      fs.copyFileSync(fullPath, destPath);
      console.log(`Copiado esquema de plugin: ${pluginName} -> ${destPath}`);
    }
  }
}

if (fs.existsSync(PLUGINS_DIR)) {
  gatherSchemas(PLUGINS_DIR);
}
