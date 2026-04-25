/**
 * Frontend logging utility
 * Provides conditional logging based on environment
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Debug log (only in development)
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info log (always shown)
   */
  info: (...args: unknown[]) => {
    console.log('[INFO]', ...args);
  },

  /**
   * Warning log (always shown)
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error log (always shown)
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Success log (always shown in development)
   */
  success: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[SUCCESS] ✅', ...args);
    }
  },
};
