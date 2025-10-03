/**
 * Frontend logging utility
 * Provides conditional logging based on environment
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Debug log (only in development)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info log (always shown)
   */
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },

  /**
   * Warning log (always shown)
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error log (always shown)
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Success log (always shown in development)
   */
  success: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[SUCCESS] ✅', ...args);
    }
  },
};
