import { tauriUserService, TauriUser } from './tauriService';

// Use Tauri backend for password hashing
const hashPassword = async (password: string): Promise<string> => {
  return await tauriUserService.hashPassword(password);
};

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
    // Password will be hashed in the backend
    return await tauriUserService.createUser(userData.username, userData.email, userData.password, userData.full_name, userData.rank, userData.role);
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
    // Get current user to preserve password if not provided
    const currentUser = await tauriUserService.getUserById(id);
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    // Use new password if provided, otherwise keep current password
    let passwordHash = currentUser.password_hash;
    if (userData.password && userData.password.trim() !== '') {
      // Hash the new password
      passwordHash = await hashPassword(userData.password);
    }
    
    return await tauriUserService.updateUser(id, userData.username, userData.email, passwordHash, userData.full_name, userData.rank, userData.role);
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

// Additional functions that might be needed
export const getDecodedPassword = async (userId: number): Promise<string> => {
  try {
    const user = await tauriUserService.getUserById(userId);
    return user?.password_hash || '';
  } catch (error) {
    console.error('Failed to get decoded password:', error);
    throw error;
  }
};

export const updateUserPassword = async (userId: number, newPassword: string): Promise<boolean> => {
  try {
    const user = await tauriUserService.getUserById(userId);
    if (!user) return false;
    
    // Hash the new password before updating
    const hashedPassword = await hashPassword(newPassword);
    
    // Update user with hashed password
    await tauriUserService.updateUser(userId, user.username, user.email, hashedPassword, user.full_name, user.rank, user.role);
    return true;
  } catch (error) {
    console.error('Failed to update user password:', error);
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
