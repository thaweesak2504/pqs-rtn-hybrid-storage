import { tauriAvatarService } from './tauriService';

// Avatar data type for frontend use
export interface AvatarData {
  id?: number;
  user_id: number;
  dataUrl: string; // Base64 data URL for display
  mime_type: string;
  file_size: number;
  created_at?: string;
  updated_at?: string;
}

// Avatar database service functions
export const getAvatarFromDatabase = async (userId: number): Promise<AvatarData | null> => {
  try {
    const tauriAvatar = await tauriAvatarService.getAvatarByUserId(userId);
    if (!tauriAvatar) return null;
    
    // Convert TauriAvatar to AvatarData
    const dataUrl = `data:${tauriAvatar.mime_type};base64,${btoa(String.fromCharCode(...tauriAvatar.avatar_data))}`;
    
    return {
      id: tauriAvatar.id,
      user_id: tauriAvatar.user_id,
      dataUrl,
      mime_type: tauriAvatar.mime_type,
      file_size: tauriAvatar.file_size,
      created_at: tauriAvatar.created_at,
      updated_at: tauriAvatar.updated_at
    };
  } catch (error) {
    console.error('Failed to get avatar from database:', error);
    throw error;
  }
};

export const saveAvatarToDatabase = async (
  userId: number,
  dataUrl: string
): Promise<boolean> => {
  try {
    
    // Extract base64 data and MIME type from data URL
    const [header, base64Data] = dataUrl.split(',');
    const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    
    await tauriAvatarService.saveAvatar(userId, bytes, mimeType);
    return true;
  } catch (error) {
    console.error('Failed to save avatar to database:', error);
    throw error;
  }
};

export const removeAvatarFromDatabase = async (userId: number): Promise<boolean> => {
  try {
    return await tauriAvatarService.deleteAvatar(userId);
  } catch (error) {
    console.error('Failed to remove avatar from database:', error);
    throw error;
  }
};
