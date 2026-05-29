/**
 * @fileoverview Authentication service — handles user login, registration, and lookup.
 *
 * All password operations send **plaintext** over the Tauri IPC boundary (which
 * never leaves the local OS process). The Rust backend hashes and verifies via
 * bcrypt. The frontend must never hash passwords.
 *
 * @module services/authService
 */
import { TauriUser, tauriUserService } from './tauriService';
import { logger } from '../utils/logger';

/**
 * Register a new user account.
 *
 * @param userData - The new user's information including plaintext password.
 * @returns An object with `success` flag, the created `user`, or an `error` message.
 */
export const createUserAccount = async (userData: {
  username: string;
  email: string;
  password: string;
  full_name: string;
  rank?: string;
  role: string;
}): Promise<{ success: boolean; user?: TauriUser; error?: string }> => {
  try {
    const user = await tauriUserService.createUser(userData.username, userData.email, userData.password, userData.full_name, userData.rank, userData.role);
    return { success: true, user };
  } catch (error) {
    logger.error('Failed to create user account:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Authenticate a user by username/email and password.
 *
 * @param username_or_email - The username or email to look up.
 * @param password          - The plaintext password to verify.
 * @returns The authenticated user, or `null` if credentials are invalid.
 * @throws If a network/DB error occurs (distinct from invalid credentials).
 */
export const authenticateUser = async (
  username_or_email: string,
  password: string
): Promise<TauriUser | null> => {
  try {
    return await tauriUserService.authenticateUser(username_or_email, password);
  } catch (error) {
    logger.error('Failed to authenticate user:', error);
    throw error;
  }
};

/**
 * Look up a user by their email address.
 *
 * @param email - The email to search for.
 * @returns The matching user, or `null` if not found.
 */
export const getUserByEmail = async (email: string): Promise<TauriUser | null> => {
  try {
    return await tauriUserService.getUserByEmail(email);
  } catch (error) {
    logger.error('Failed to get user by email:', error);
    throw error;
  }
};

/**
 * Look up a user by their numeric ID.
 *
 * @param id - The user's database ID.
 * @returns The matching user, or `null` if not found.
 */
export const getUserById = async (id: number): Promise<TauriUser | null> => {
  try {
    return await tauriUserService.getUserById(id);
  } catch (error) {
    logger.error('Failed to get user by ID:', error);
    throw error;
  }
};

