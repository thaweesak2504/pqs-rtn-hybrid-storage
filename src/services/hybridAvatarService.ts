import { invoke } from '@tauri-apps/api/tauri';

export interface HybridAvatarInfo {
  user_id: number;
  avatar_path: string | null;
  avatar_updated_at: string | null;
  avatar_mime: string | null;
  avatar_size: number | null;
  file_exists: boolean;
}

export interface HybridAvatarService {
  saveAvatar: (userId: number, fileData: Uint8Array, mimeType: string) => Promise<HybridAvatarInfo>;
  getAvatarInfo: (userId: number) => Promise<HybridAvatarInfo>;
  deleteAvatar: (userId: number) => Promise<boolean>;
  getAvatarBase64: (avatarPath: string) => Promise<string>;
  migrateUserAvatar: (userId: number) => Promise<boolean>;
  cleanupOrphanedFiles: () => Promise<number>;
  getMediaDirectoryPath: () => Promise<string>;
}

class HybridAvatarServiceImpl implements HybridAvatarService {
  async saveAvatar(userId: number, fileData: Uint8Array, mimeType: string): Promise<HybridAvatarInfo> {
    try {
      const result = await invoke<HybridAvatarInfo>('save_hybrid_avatar', {
        userId,
        avatarData: Array.from(fileData),
        mimeType
      });
      return result;
    } catch (error) {
      console.error('Failed to save hybrid avatar:', error);
      throw new Error(`Failed to save avatar: ${error}`);
    }
  }

  async getAvatarInfo(userId: number): Promise<HybridAvatarInfo> {
    try {
      const result = await invoke<HybridAvatarInfo>('get_hybrid_avatar_info', {
        userId
      });
      return result;
    } catch (error) {
      console.error('Failed to get hybrid avatar info:', error);
      throw new Error(`Failed to get avatar info: ${error}`);
    }
  }

  async deleteAvatar(userId: number): Promise<boolean> {
    try {
      const result = await invoke<boolean>('delete_hybrid_avatar', {
        userId
      });
      return result;
    } catch (error) {
      console.error('Failed to delete hybrid avatar:', error);
      throw new Error(`Failed to delete avatar: ${error}`);
    }
  }

  async getAvatarBase64(avatarPath: string): Promise<string> {
    try {
      const result = await invoke<string>('get_hybrid_avatar_base64', {
        avatarPath
      });
      return result;
    } catch (error) {
      console.error('Failed to get avatar base64:', error);
      throw new Error(`Failed to get avatar base64: ${error}`);
    }
  }

  async migrateUserAvatar(userId: number): Promise<boolean> {
    try {
      const result = await invoke<boolean>('migrate_user_avatar_to_file', {
        userId
      });
      return result;
    } catch (error) {
      console.error('Failed to migrate user avatar:', error);
      throw new Error(`Failed to migrate avatar: ${error}`);
    }
  }

  async cleanupOrphanedFiles(): Promise<number> {
    try {
      const result = await invoke<number>('cleanup_orphaned_avatar_files');
      return result;
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error);
      throw new Error(`Failed to cleanup files: ${error}`);
    }
  }

  async getMediaDirectoryPath(): Promise<string> {
    try {
      const result = await invoke<string>('get_media_directory_path');
      return result;
    } catch (error) {
      console.error('Failed to get media directory path:', error);
      throw new Error(`Failed to get media directory: ${error}`);
    }
  }
}

// Export singleton instance
export const hybridAvatarService = new HybridAvatarServiceImpl();

// Export types for use in components
export type { HybridAvatarInfo };
