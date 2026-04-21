import { tauriDatabaseService, tauriUserService } from './tauriService';
import { logger } from '../utils/logger';

// Database initialization and health check functions
export const initDatabase = async (): Promise<string> => {
  try {
    const result = await tauriDatabaseService.initializeDatabase();
    logger.info('Database initialized successfully');
    return result || 'Database initialized successfully';
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await tauriUserService.getAllUsers();
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};
