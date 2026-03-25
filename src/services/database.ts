import { tauriDatabaseService, tauriUserService } from './tauriService';

// Database initialization and health check functions
export const initDatabase = async (): Promise<string> => {
  try {
    const result = await tauriDatabaseService.initializeDatabase();
    console.log('Database initialized successfully');
    return result || 'Database initialized successfully';
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await tauriUserService.getAllUsers();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};
