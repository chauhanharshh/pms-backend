const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BACKUP_PATH = path.resolve(__dirname, '..', 'backups');
const KEEP_LAST = parseInt(process.env.BACKUP_KEEP_COUNT || '7', 10);
const DATABASE_URL = process.env.DATABASE_URL;

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

if (!DATABASE_URL) {
  console.error(`[${new Date().toISOString()}] DATABASE_URL not found in environment`);
  process.exit(1);
}

// Parse connection string
const parseConnectionString = (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid DATABASE_URL format');
  }

  if (!parsed.protocol.startsWith('postgres')) {
    throw new Error('Only PostgreSQL DATABASE_URL is supported');
  }

  const user = decodeURIComponent(parsed.username || '');
  const password = decodeURIComponent(parsed.password || '');
  const host = parsed.hostname;
  const port = parsed.port || '5432';
  const database = (parsed.pathname || '').replace(/^\//, '');

  if (!user || !host || !database) {
    throw new Error('Invalid DATABASE_URL format');
  }

  return {
    user,
    password,
    host,
    port,
    database,
  };
};

const pruneOldBackups = () => {
  const files = fs
    .readdirSync(BACKUP_PATH)
    .filter((name) => /^backup-\d{4}-\d{2}-\d{2}\.sql$/.test(name))
    .map((name) => {
      const filepath = path.join(BACKUP_PATH, name);
      return {
        name,
        filepath,
        mtime: fs.statSync(filepath).mtimeMs,
      };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const stale = files.slice(KEEP_LAST);
  for (const file of stale) {
    fs.unlinkSync(file.filepath);
    log(`Deleted old backup: ${file.name}`);
  }
};

const createBackup = async () => {
  try {
    if (!fs.existsSync(BACKUP_PATH)) {
      fs.mkdirSync(BACKUP_PATH, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(BACKUP_PATH, filename);
    log(`Backup started -> ${filepath}`);

    const { user, password, host, port, database } = parseConnectionString(DATABASE_URL);
    const args = ['-h', host, '-p', String(port), '-U', user, '-d', database, '-F', 'p', '-f', filepath];

    const child = spawn('pg_dump', args, {
      env: {
        ...process.env,
        PGPASSWORD: password,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] Backup failed: ${error.message}`);
      process.exit(1);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`[${new Date().toISOString()}] Backup failed with exit code ${code}`);
        if (stderr.trim()) {
          console.error(stderr.trim());
        }
        process.exit(1);
      }

      pruneOldBackups();
      log('Backup completed successfully');
      log(`Location: ${filepath}`);
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Backup error: ${error.message}`);
    process.exit(1);
  }
};

// Run backup
createBackup();
