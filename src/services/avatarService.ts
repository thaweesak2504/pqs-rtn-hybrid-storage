// Avatar service functions for file validation and image processing

// Maximum file size in bytes (2MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Allowed MIME types for avatars
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
];

// Maximum dimensions for avatar images
const MAX_DIMENSIONS = {
  width: 512,
  height: 512
};

/**
 * Validates an avatar file
 * @param file - The file to validate
 * @returns Object with validation result and error message if invalid
 */
export const validateAvatarFile = (file: File): { ok: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: 'File must be a valid image (JPEG, PNG, GIF, or WebP)'
    };
  }

  return { ok: true };
};

/**
 * Converts a file to a data URL
 * @param file - The file to convert
 * @returns Promise that resolves to the data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Downscales an image if it exceeds maximum dimensions
 * @param dataUrl - The image data URL to potentially downscale
 * @param mimeType - The MIME type of the image
 * @param maxWidth - Maximum width (default: 512)
 * @param maxHeight - Maximum height (default: 512)
 * @param quality - JPEG quality (0-1, default: 0.8)
 * @returns Promise that resolves to processed image data and info
 */
export const maybeDownscaleImage = async (
  dataUrl: string,
  mimeType: string,
  maxWidth: number = MAX_DIMENSIONS.width,
  maxHeight: number = MAX_DIMENSIONS.height,
  quality: number = 0.8
): Promise<{ dataUrl: string; info: { width: number; height: number; size: number } }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      // originalWidth and originalHeight are stored but not used in current implementation
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              const processedDataUrl = reader.result as string;
              resolve({
                dataUrl: processedDataUrl,
                info: {
                  width: width,
                  height: height,
                  size: blob.size
                }
              });
            };
            reader.onerror = () => reject(new Error('Failed to read processed image'));
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image from data URL
    img.src = dataUrl;
  });
};

/**
 * Converts a file to Uint8Array for Tauri backend
 * @param file - The file to convert
 * @returns Promise that resolves to Uint8Array
 */
export const fileToUint8Array = (file: File): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        const uint8Array = new Uint8Array(reader.result);
        resolve(uint8Array);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Gets file extension from MIME type
 * @param mimeType - The MIME type
 * @returns File extension without dot
 */
export const getFileExtensionFromMimeType = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  
  return mimeToExt[mimeType] || 'jpg';
};

/**
 * Formats image dimensions for display
 * @param info - Image info object with width, height, and size
 * @returns Formatted dimensions string
 */
export const formatDimensions = (info: { width: number; height: number; size: number }): string => {
  return `${info.width} × ${info.height} (${Math.round(info.size / 1024)}KB)`;
};
