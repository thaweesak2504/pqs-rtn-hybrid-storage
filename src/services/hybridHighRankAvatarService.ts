import { invoke } from '@tauri-apps/api/tauri';

export interface HybridHighRankAvatarInfo {
  officer_id: number;
  avatar_path: string | null;
  avatar_updated_at: string | null;
  avatar_mime: string | null;
  avatar_size: number | null;
  file_exists: boolean;
}

export class HybridHighRankAvatarService {
  async saveAvatar(officerId: number, fileData: Uint8Array, mimeType: string): Promise<HybridHighRankAvatarInfo> {
    try {
      const result = await invoke<HybridHighRankAvatarInfo>('save_hybrid_high_rank_avatar', {
        officerId: officerId,
        avatarData: Array.from(fileData),
        mimeType: mimeType
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to save high rank avatar: ${error}`);
    }
  }

  async getAvatarInfo(officerId: number): Promise<HybridHighRankAvatarInfo> {
    try {
      const result = await invoke<HybridHighRankAvatarInfo>('get_hybrid_high_rank_avatar_info', {
        officerId: officerId
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to get high rank avatar info: ${error}`);
    }
  }

  async deleteAvatar(officerId: number): Promise<boolean> {
    try {
      const result = await invoke<boolean>('delete_hybrid_high_rank_avatar', {
        officerId: officerId
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to delete high rank avatar: ${error}`);
    }
  }

  async getAvatarBase64(avatarPath: string): Promise<string> {
    try {
      const result = await invoke<string>('get_hybrid_high_rank_avatar_base64', {
        avatarPath: avatarPath
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to get high rank avatar base64: ${error}`);
    }
  }

  async cleanupOrphanedFiles(): Promise<number> {
    try {
      const result = await invoke<number>('cleanup_orphaned_high_rank_avatar_files');
      return result;
    } catch (error) {
      throw new Error(`Failed to cleanup orphaned high rank avatar files: ${error}`);
    }
  }
}

// Export singleton instance
export const hybridHighRankAvatarService = new HybridHighRankAvatarService();
