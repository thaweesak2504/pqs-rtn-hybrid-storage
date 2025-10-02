import { invoke } from '@tauri-apps/api/tauri';

// Check if we're running in Tauri environment
const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && window.__TAURI__;
};

// Safe invoke function that handles non-Tauri environments
export const safeInvoke = async (command: string, args?: any) => {
  if (!isTauriEnvironment()) {
    throw new Error('Not running in Tauri environment');
  }
  
  try {
    const result = await invoke(command, args);
    return result;
  } catch (error) {
    console.error('Tauri invoke error:', error);
    throw error;
  }
};

export interface TauriUser {
  id?: number;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  rank?: string;
  role: string;
  is_active: boolean;
  avatar_path?: string;
  avatar_updated_at?: string;
  avatar_mime?: string;
  avatar_size?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TauriAvatar {
  id?: number;
  user_id: number;
  avatar_data: number[];
  mime_type: string;
  file_size: number;
  created_at?: string;
  updated_at?: string;
}

// User Management Service
export const tauriUserService = {
  // Get all users
  async getAllUsers(): Promise<TauriUser[]> {
    try {
      return await safeInvoke('get_all_users') as TauriUser[];
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  },

  // Get user by ID
  async getUserById(id: number): Promise<TauriUser | null> {
    try {
      return await safeInvoke('get_user_by_id', { id }) as TauriUser | null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  },

  // Get user by email
  async getUserByEmail(email: string): Promise<TauriUser | null> {
    try {
      return await safeInvoke('get_user_by_email', { email }) as TauriUser | null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  },

  // Create user
  async createUser(username: string, email: string, password: string, full_name: string, rank: string | undefined, role: string): Promise<TauriUser> {
    try {
      return await safeInvoke('create_user', { 
        username, 
        email, 
        password: password, 
        fullName: full_name, 
        rank, 
        role 
      }) as TauriUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Update user
  async updateUser(id: number, username: string, email: string, password_hash: string, full_name: string, rank: string | undefined, role: string): Promise<TauriUser> {
    try {
      return await safeInvoke('update_user', { 
        id, 
        username, 
        email, 
        passwordHash: password_hash, 
        fullName: full_name, 
        rank, 
        role 
      }) as TauriUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Delete user
  async deleteUser(id: number): Promise<boolean> {
    try {
      return await safeInvoke('delete_user', { id }) as boolean;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Cleanup orphaned avatars
  async cleanupOrphanedAvatars(): Promise<number> {
    try {
      return await safeInvoke('cleanup_orphaned_avatars', {}) as number;
    } catch (error) {
      console.error('Error cleaning up orphaned avatars:', error);
      throw error;
    }
  },

  // Migrate plain text passwords to hashed passwords
  async migratePasswords(): Promise<string> {
    try {
      return await safeInvoke('migrate_passwords', {}) as string;
    } catch (error) {
      console.error('Error migrating passwords:', error);
      throw error;
    }
  },


  // Authenticate user
  async authenticateUser(username_or_email: string, password: string): Promise<TauriUser | null> {
    try {
      const params = { 
        usernameOrEmail: username_or_email, 
        password: password 
      };
      
      return await safeInvoke('authenticate_user', params) as TauriUser | null;
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw error;
    }
  },

  // Hash password
  async hashPassword(password: string): Promise<string> {
    try {
      return await safeInvoke('hash_password', { password }) as string;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw error;
    }
  }
};

// Avatar Management Service
export const tauriAvatarService = {
  // Get avatar by user ID
  async getAvatarByUserId(userId: number): Promise<TauriAvatar | null> {
    try {
      return await safeInvoke('get_avatar_by_user_id', { userId: userId }) as TauriAvatar | null;
    } catch (error) {
      console.error('Error getting avatar by user ID:', error);
      throw error;
    }
  },

  // Save avatar
  async saveAvatar(userId: number, avatarData: Uint8Array, mimeType: string): Promise<TauriAvatar> {
    try {
      return await safeInvoke('save_avatar', { 
        userId: userId, 
        avatarData: Array.from(avatarData), 
        mimeType: mimeType 
      }) as TauriAvatar;
    } catch (error) {
      console.error('Error saving avatar:', error);
      throw error;
    }
  },

  // Delete avatar
  async deleteAvatar(userId: number): Promise<boolean> {
    try {
      return await safeInvoke('delete_avatar', { userId: userId }) as boolean;
    } catch (error) {
      console.error('Error deleting avatar:', error);
      throw error;
    }
  }
};

// Database Management
export const tauriDatabaseService = {
  // Initialize database
  async initializeDatabase(): Promise<string> {
    try {
      return await safeInvoke('initialize_database') as string;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }
};