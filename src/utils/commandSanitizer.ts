/**
 * Command Sanitizer - Prevents terminal command hanging by removing problematic characters
 * 
 * This utility class addresses the critical issue of commands with Thai characters
 * (like "แ") causing terminal commands to hang or freeze, disrupting development workflow.
 * 
 * Features:
 * - Removes Thai characters (U+0E00-U+0E7F)
 * - Removes invisible characters (U+200B-U+200D, U+FEFF)
 * - Removes control characters (U+0000-U+001F, U+007F-U+009F)
 * - Validates command safety
 * - Detects encoding issues
 */

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  sanitized: string;
}

export interface SanitizationStats {
  originalLength: number;
  sanitizedLength: number;
  charactersRemoved: number;
  thaiCharactersRemoved: number;
  invisibleCharactersRemoved: number;
  controlCharactersRemoved: number;
}

export class CommandSanitizer {
  // Thai character range (U+0E00-U+0E7F)
  private static readonly THAI_CHARS = /[\u0E00-\u0E7F]/g;
  
  // Invisible characters (Zero-width space, Zero-width non-joiner, Zero-width joiner, BOM)
  private static readonly INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;
  
  // Control characters (ASCII control chars + extended control chars)
  private static readonly CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
  
  // Dangerous command patterns
  private static readonly DANGEROUS_PATTERNS = [
    /rm\s+-rf/,
    /del\s+\/s/,
    /taskkill\s+\/f/,
    /format\s+/,
    /shutdown\s+/,
    /reboot\s+/
  ];
  
  /**
   * Sanitize command by removing problematic characters
   * 
   * @param input - The command string to sanitize
   * @returns Sanitized command string
   */
  static sanitize(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(this.THAI_CHARS, '') // Remove Thai characters
      .replace(this.INVISIBLE_CHARS, '') // Remove invisible characters
      .replace(this.CONTROL_CHARS, '') // Remove control characters
      .trim();
  }
  
  /**
   * Validate if command is safe to execute
   * 
   * @param command - The command to validate
   * @returns Validation result with issues and sanitized version
   */
  static validate(command: string): ValidationResult {
    const issues: string[] = [];
    
    // Check for Thai characters
    if (this.THAI_CHARS.test(command)) {
      issues.push('Contains Thai characters');
    }
    
    // Check for invisible characters
    if (this.INVISIBLE_CHARS.test(command)) {
      issues.push('Contains invisible characters');
    }
    
    // Check for control characters
    if (this.CONTROL_CHARS.test(command)) {
      issues.push('Contains control characters');
    }
    
    // Check for empty command
    if (!command.trim()) {
      issues.push('Empty command');
    }
    
    // Check for dangerous patterns
    const dangerousPattern = this.DANGEROUS_PATTERNS.find(pattern => pattern.test(command));
    if (dangerousPattern) {
      issues.push('Contains dangerous command pattern');
    }
    
    // Check for very long commands
    if (command.length > 1000) {
      issues.push('Command too long (over 1000 characters)');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      sanitized: this.sanitize(command)
    };
  }
  
  /**
   * Detect encoding issues in command
   * 
   * @param command - The command to analyze
   * @returns True if encoding issues detected
   */
  static detectEncodingIssues(command: string): boolean {
    // Check for mixed encoding (Thai + English/Numbers)
    const hasThai = this.THAI_CHARS.test(command);
    const hasEnglish = /[a-zA-Z]/.test(command);
    const hasNumbers = /[0-9]/.test(command);
    
    // Mixed encoding detected
    return hasThai && (hasEnglish || hasNumbers);
  }
  
  /**
   * Get detailed sanitization statistics
   * 
   * @param original - Original command
   * @param sanitized - Sanitized command
   * @returns Sanitization statistics
   */
  static getSanitizationStats(original: string, sanitized: string): SanitizationStats {
    const thaiMatches = original.match(this.THAI_CHARS) || [];
    const invisibleMatches = original.match(this.INVISIBLE_CHARS) || [];
    const controlMatches = original.match(this.CONTROL_CHARS) || [];
    
    return {
      originalLength: original.length,
      sanitizedLength: sanitized.length,
      charactersRemoved: original.length - sanitized.length,
      thaiCharactersRemoved: thaiMatches.length,
      invisibleCharactersRemoved: invisibleMatches.length,
      controlCharactersRemoved: controlMatches.length
    };
  }
  
  /**
   * Check if command contains any problematic characters
   * 
   * @param command - The command to check
   * @returns True if command contains problematic characters
   */
  static hasProblematicCharacters(command: string): boolean {
    return this.THAI_CHARS.test(command) || 
           this.INVISIBLE_CHARS.test(command) || 
           this.CONTROL_CHARS.test(command);
  }
  
  /**
   * Get list of problematic characters found in command
   * 
   * @param command - The command to analyze
   * @returns Array of problematic character codes
   */
  static getProblematicCharacters(command: string): string[] {
    const problematic: string[] = [];
    
    // Find Thai characters
    const thaiMatches = command.match(this.THAI_CHARS) || [];
    thaiMatches.forEach(char => {
      problematic.push(`Thai: ${char} (U+${char.charCodeAt(0).toString(16).toUpperCase()})`);
    });
    
    // Find invisible characters
    const invisibleMatches = command.match(this.INVISIBLE_CHARS) || [];
    invisibleMatches.forEach(char => {
      problematic.push(`Invisible: ${char} (U+${char.charCodeAt(0).toString(16).toUpperCase()})`);
    });
    
    // Find control characters
    const controlMatches = command.match(this.CONTROL_CHARS) || [];
    controlMatches.forEach(char => {
      problematic.push(`Control: ${char} (U+${char.charCodeAt(0).toString(16).toUpperCase()})`);
    });
    
    return problematic;
  }
  
  /**
   * Create a safe command execution wrapper
   * 
   * @param command - The command to wrap
   * @returns Safe command execution function
   */
  static createSafeExecutor(command: string): () => string {
    const sanitized = this.sanitize(command);
    const validation = this.validate(command);
    
    if (!validation.isValid) {
      throw new Error(`Unsafe command detected: ${validation.issues.join(', ')}`);
    }
    
    return () => sanitized;
  }
  
  /**
   * Batch sanitize multiple commands
   * 
   * @param commands - Array of commands to sanitize
   * @returns Array of sanitized commands
   */
  static batchSanitize(commands: string[]): string[] {
    return commands.map(command => this.sanitize(command));
  }
  
  /**
   * Batch validate multiple commands
   * 
   * @param commands - Array of commands to validate
   * @returns Array of validation results
   */
  static batchValidate(commands: string[]): ValidationResult[] {
    return commands.map(command => this.validate(command));
  }
}

// Export utility functions for easy use
export const sanitizeCommand = CommandSanitizer.sanitize;
export const validateCommand = CommandSanitizer.validate;
export const detectEncodingIssues = CommandSanitizer.detectEncodingIssues;
export const hasProblematicCharacters = CommandSanitizer.hasProblematicCharacters;

// Export for testing
export const _internal = {
  THAI_CHARS: CommandSanitizer['THAI_CHARS'],
  INVISIBLE_CHARS: CommandSanitizer['INVISIBLE_CHARS'],
  CONTROL_CHARS: CommandSanitizer['CONTROL_CHARS'],
  DANGEROUS_PATTERNS: CommandSanitizer['DANGEROUS_PATTERNS']
};
