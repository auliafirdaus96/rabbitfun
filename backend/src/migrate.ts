import { runMigrations } from '@/config/database';
import logger from '@/utils/logger';

const runMigration = async () => {
  try {
    logger.info('Starting database migration...');
    await runMigrations();
    logger.info('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database migration failed:', error);
    process.exit(1);
  }
};

runMigration();