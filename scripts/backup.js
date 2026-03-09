const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BACKUP_PATH = process.env.BACKUP_PATH || '/var/backups/pms';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

// Parse connection string
const parseConnectionString = (url) => {
  const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }

  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5].split('?')[0], // Remove query params
  };
};

const createBackup = async () => {
  try {
    console.log('🔄 Starting database backup...');

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_PATH)) {
      fs.mkdirSync(BACKUP_PATH, { recursive: true });
      console.log(`✅ Created backup directory: ${BACKUP_PATH}`);
    }

    const { user, password, host, port, database } = parseConnectionString(DATABASE_URL);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `pms-backup-${timestamp}.sql`;
    const filepath = path.join(BACKUP_PATH, filename);

    // Run pg_dump
    const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f ${filepath}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Backup failed:', error);
        return;
      }

      console.log(`✅ Backup created successfully: ${filename}`);
      console.log(`📁 Location: ${filepath}`);

      // Compress the backup
      exec(`gzip ${filepath}`, (gzipError) => {
        if (gzipError) {
          console.error('⚠️  Warning: Failed to compress backup:', gzipError);
        } else {
          console.log(`🗜️  Backup compressed: ${filename}.gz`);
        }

        // Clean old backups
        cleanOldBackups();
      });
    });
  } catch (error) {
    console.error('❌ Backup error:', error);
    process.exit(1);
  }
};

const cleanOldBackups = () => {
  console.log(`🧹 Cleaning backups older than ${RETENTION_DAYS} days...`);

  fs.readdir(BACKUP_PATH, (err, files) => {
    if (err) {
      console.error('❌ Failed to read backup directory:', err);
      return;
    }

    const now = Date.now();
    const cutoffTime = now - (RETENTION_DAYS * 24 * 60 * 60 * 1000);

    files.forEach((file) => {
      const filepath = path.join(BACKUP_PATH, file);
      
      fs.stat(filepath, (statErr, stats) => {
        if (statErr) {
          console.error(`❌ Failed to stat file ${file}:`, statErr);
          return;
        }

        if (stats.isFile() && stats.mtimeMs < cutoffTime) {
          fs.unlink(filepath, (unlinkErr) => {
            if (unlinkErr) {
              console.error(`❌ Failed to delete ${file}:`, unlinkErr);
            } else {
              console.log(`🗑️  Deleted old backup: ${file}`);
            }
          });
        }
      });
    });

    console.log('✅ Cleanup completed');
  });
};

// Run backup
createBackup();
