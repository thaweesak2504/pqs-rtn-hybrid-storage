import { TauriUser, tauriUserService } from './tauriService';

// Phase 1 security: frontend never hashes passwords. Backend is the single source
// of truth. All password operations pass plaintext over the Tauri IPC boundary
// (which never leaves the local process).

// User management service functions
export const getAllUsers = async (): Promise<TauriUser[]> => {
  try {
    return await tauriUserService.getAllUsers();
  } catch (error) {
    console.error('Failed to get all users:', error);
    throw error;
  }
};

export const createUser = async (userData: {
  username: string;
  email: string;
  password: string;
  full_name: string;
  rank?: string;
  role: string;
}): Promise<TauriUser> => {
  try {
    return await tauriUserService.createUser(
      userData.username,
      userData.email,
      userData.password,
      userData.full_name,
      userData.rank,
      userData.role
    );
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
};

export const updateUser = async (
  id: number,
  userData: {
    full_name: string;
    email: string;
    username: string;
    password?: string;
    rank?: string;
    role: string;
  }
): Promise<TauriUser> => {
  try {
    // Pass plaintext password through — backend hashes & validates strength.
    // Null/empty preserves existing password hash.
    return await tauriUserService.updateUser(
      id,
      userData.username,
      userData.email,
      userData.password,
      userData.full_name,
      userData.rank,
      userData.role
    );
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
};

export const deleteUser = async (id: number): Promise<boolean> => {
  try {
    return await tauriUserService.deleteUser(id);
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
};

export const getUserById = async (id: number): Promise<TauriUser | null> => {
  try {
    return await tauriUserService.getUserById(id);
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<TauriUser | null> => {
  try {
    return await tauriUserService.getUserByEmail(email);
  } catch (error) {
    console.error('Failed to get user by email:', error);
    throw error;
  }
};

/**
 * Change a user's password. Requires the old password for verification.
 * Backend validates strength + clears the must_change_password flag on success.
 */
export const changePassword = async (
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  try {
    await tauriUserService.changePassword(userId, oldPassword, newPassword);
  } catch (error) {
    console.error('Failed to change password:', error);
    throw error;
  }
};

export const migratePasswords = async (): Promise<string> => {
  try {
    return await tauriUserService.migratePasswords();
  } catch (error) {
    console.error('Failed to migrate passwords:', error);
    throw error;
  }
};
