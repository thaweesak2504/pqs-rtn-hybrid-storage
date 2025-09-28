import { tauriDatabaseService, tauriUserService } from './tauriService';

// Check if we're running in Tauri environment
const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && window.__TAURI__;
};

// Database initialization and health check functions
export const initDatabase = async (): Promise<string> => {
  try {
    if (!isTauriEnvironment()) {
      console.warn('Not running in Tauri environment, skipping database initialization');
      return 'Not in Tauri environment - database initialization skipped';
    }
    
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
    if (!isTauriEnvironment()) {
      return false;
    }
    
    // Try to get users to check if database is accessible
    // This is a lightweight operation that doesn't initialize the database
    await tauriUserService.getAllUsers();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};
