import { tauriUserService, TauriUser } from './tauriService';

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
    console.error('Failed to create user account:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const authenticateUser = async (
  username_or_email: string,
  password: string
): Promise<TauriUser | null> => {
  try {
    // For now, use plain text password (database stores plain text)
    // TODO: Implement proper bcrypt hashing when database is updated
    const password_hash = password;
    return await tauriUserService.authenticateUser(username_or_email, password_hash);
  } catch (error) {
    console.error('Failed to authenticate user:', error);
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

export const getUserById = async (id: number): Promise<TauriUser | null> => {
  try {
    return await tauriUserService.getUserById(id);
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    throw error;
  }
};
