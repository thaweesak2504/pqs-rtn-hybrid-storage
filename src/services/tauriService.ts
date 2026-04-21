import { invoke } from '@tauri-apps/api/tauri';

// Desktop App only — invoke() directly, no web fallback
export const safeInvoke = async (command: string, args?: any) => {
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
  /**
   * @deprecated The backend still returns this for existing callers but the frontend
   * must NEVER send it back. Use `createUser` / `updateUser` / `changePassword` which
   * accept plaintext passwords and hash them server-side.
   */
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
  /** True when the user must change their password before any other action (e.g. seeded default admin). */
  must_change_password?: boolean;
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

  // Update user. Pass `password` as plaintext to change it (backend hashes + validates).
  // Omit (or pass empty string) to keep the existing password hash.
  async updateUser(
    id: number,
    username: string,
    email: string,
    password: string | null | undefined,
    full_name: string,
    rank: string | undefined,
    role: string
  ): Promise<TauriUser> {
    try {
      return await safeInvoke('update_user', {
        id,
        username,
        email,
        password: password && password.length > 0 ? password : null,
        fullName: full_name,
        rank,
        role,
      }) as TauriUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Change password after verifying the old one. Backend validates strength.
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    try {
      await safeInvoke('change_password', {
        userId,
        oldPassword,
        newPassword,
      });
    } catch (error) {
      console.error('Error changing password:', error);
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
