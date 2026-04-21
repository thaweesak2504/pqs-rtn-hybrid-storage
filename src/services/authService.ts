import { TauriUser, tauriUserService } from './tauriService';
import { logger } from '../utils/logger';

// Authentication service functions
export const createUserAccount = async (userData: {
  username: string;
  email: string;
  password: string;
  full_name: string;
  rank?: string;
  role: string;
}): Promise<{ success: boolean; user?: TauriUser; error?: string }> => {
  try {
    // Password will be hashed in the backend
    const user = await tauriUserService.createUser(userData.username, userData.email, userData.password, userData.full_name, userData.rank, userData.role);
    return { success: true, user };
  } catch (error) {
    logger.error('Failed to create user account:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const authenticateUser = async (
  username_or_email: string,
  password: string
): Promise<TauriUser | null> => {
  try {
    // Phase 1 security: plaintext password is sent over the Tauri IPC boundary
    // (which never leaves the local process). Backend verifies via bcrypt.
    return await tauriUserService.authenticateUser(username_or_email, password);
  } catch (error) {
    logger.error('Failed to authenticate user:', error);
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<TauriUser | null> => {
  try {
    return await tauriUserService.getUserByEmail(email);
  } catch (error) {
    logger.error('Failed to get user by email:', error);
    throw error;
  }
};

export const getUserById = async (id: number): Promise<TauriUser | null> => {
  try {
    return await tauriUserService.getUserById(id);
  } catch (error) {
    logger.error('Failed to get user by ID:', error);
    throw error;
  }
};
