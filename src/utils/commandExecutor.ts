/**
 * Command Executor - Safe command execution with timeout protection
 * 
 * This utility class provides safe command execution with timeout protection,
 * preventing commands from hanging indefinitely and disrupting development workflow.
 * 
 * Features:
 * - Timeout protection (default 30 seconds)
 * - Command sanitization integration
 * - Execution monitoring and logging
 * - Error handling and recovery
 * - Performance metrics
 */

import { CommandSanitizer, ValidationResult } from './commandSanitizer';

export interface ExecutionResult {
  success: boolean;
  result?: string;
  error?: string;
  originalCommand: string;
  sanitizedCommand: string;
  executionTime: number;
  timeoutUsed: boolean;
  sanitizationStats?: {
    charactersRemoved: number;
    issues: string[];
  };
}

export interface ExecutionOptions {
  timeout?: number;
  sanitize?: boolean;
  validate?: boolean;
  logExecution?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  timeoutExecutions: number;
  averageExecutionTime: number;
  successRate: number;
}

export class CommandExecutor {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_TIMEOUT = 300000; // 5 minutes
  private static readonly MIN_TIMEOUT = 1000; // 1 second
  
  private static executionHistory: ExecutionResult[] = [];
  private static readonly MAX_HISTORY = 1000;
  
  /**
   * Execute command with safety checks and timeout
   * 
   * @param command - The command to execute
   * @param options - Execution options
   * @returns Promise with execution result
   */
  static async executeCommand(
    command: string, 
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      sanitize = true,
      validate = true,
      logExecution = true,
      retryOnFailure = false,
      maxRetries = 3
    } = options;
    
    // Validate timeout range
    const safeTimeout = Math.max(
      this.MIN_TIMEOUT, 
      Math.min(timeout, this.MAX_TIMEOUT)
    );
    
    const startTime = Date.now();
    let sanitizedCommand = command;
    let sanitizationStats: any = undefined;
    
    try {
      // Step 1: Sanitize command if requested
      if (sanitize) {
        const originalLength = command.length;
        sanitizedCommand = CommandSanitizer.sanitize(command);
        const charactersRemoved = originalLength - sanitizedCommand.length;
        
        sanitizationStats = {
          charactersRemoved,
          issues: CommandSanitizer.getProblematicCharacters(command)
        };
      }
      
      // Step 2: Validate command if requested
      if (validate) {
        const validation = CommandSanitizer.validate(sanitizedCommand);
        if (!validation.isValid) {
          throw new Error(`Command validation failed: ${validation.issues.join(', ')}`);
        }
      }
      
      // Step 3: Execute with timeout
      const result = await this.executeWithTimeout(sanitizedCommand, safeTimeout);
      const executionTime = Date.now() - startTime;
      
      const executionResult: ExecutionResult = {
        success: true,
        result,
        originalCommand: command,
        sanitizedCommand,
        executionTime,
        timeoutUsed: false,
        sanitizationStats
      };
      
      // Log execution if requested
      if (logExecution) {
        this.logExecution(executionResult);
      }
      
      return executionResult;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const isTimeout = error instanceof Error && error.message.includes('timeout');
      
      const executionResult: ExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalCommand: command,
        sanitizedCommand,
        executionTime,
        timeoutUsed: isTimeout,
        sanitizationStats
      };
      
      // Log execution if requested
      if (logExecution) {
        this.logExecution(executionResult);
      }
      
      // Retry on failure if requested
      if (retryOnFailure && !isTimeout && maxRetries > 0) {
        return this.executeCommand(command, {
          ...options,
          maxRetries: maxRetries - 1,
          logExecution: false // Don't log retries
        });
      }
      
      return executionResult;
    }
  }
  
  /**
   * Execute command with timeout protection
   * 
   * @param command - The command to execute
   * @param timeout - Timeout in milliseconds
   * @returns Promise with command result
   */
  private static async executeWithTimeout(
    command: string, 
    timeout: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);
      
      // Simulate command execution (replace with actual implementation)
      // In a real implementation, this would execute the actual command
      setTimeout(() => {
        clearTimeout(timer);
        resolve(`Command executed successfully: ${command}`);
      }, Math.random() * 2000 + 500); // Random delay between 500ms and 2.5s
    });
  }
  
  /**
   * Log command execution
   * 
   * @param result - Execution result to log
   */
  private static logExecution(result: ExecutionResult): void {
    this.executionHistory.unshift(result);
    
    // Keep only recent history
    if (this.executionHistory.length > this.MAX_HISTORY) {
      this.executionHistory = this.executionHistory.slice(0, this.MAX_HISTORY);
    }
    
    // Log to console for debugging
    const status = result.success ? '✅' : '❌';
    const time = result.executionTime.toFixed(0);
    const timeout = result.timeoutUsed ? ' (TIMEOUT)' : '';
    
    console.log(`${status} [${time}ms]${timeout} ${result.sanitizedCommand}`);
    
    if (!result.success) {
      console.error(`   Error: ${result.error}`);
    }
    
    if (result.sanitizationStats && result.sanitizationStats.charactersRemoved > 0) {
      console.log(`   Sanitized: ${result.sanitizationStats.charactersRemoved} characters removed`);
    }
  }
  
  /**
   * Get execution statistics
   * 
   * @returns Execution statistics
   */
  static getExecutionStats(): ExecutionStats {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(r => r.success).length;
    const failed = total - successful;
    const timeout = this.executionHistory.filter(r => r.timeoutUsed).length;
    const avgTime = this.executionHistory.reduce((sum, r) => sum + r.executionTime, 0) / total;
    
    return {
      totalExecutions: total,
      successfulExecutions: successful,
      failedExecutions: failed,
      timeoutExecutions: timeout,
      averageExecutionTime: avgTime || 0,
      successRate: total > 0 ? (successful / total) * 100 : 0
    };
  }
  
  /**
   * Get recent execution history
   * 
   * @param limit - Maximum number of results to return
   * @returns Array of recent execution results
   */
  static getRecentExecutions(limit: number = 10): ExecutionResult[] {
    return this.executionHistory.slice(0, limit);
  }
  
  /**
   * Get failed executions
   * 
   * @param limit - Maximum number of results to return
   * @returns Array of failed execution results
   */
  static getFailedExecutions(limit: number = 10): ExecutionResult[] {
    return this.executionHistory
      .filter(r => !r.success)
      .slice(0, limit);
  }
  
  /**
   * Get timeout executions
   * 
   * @param limit - Maximum number of results to return
   * @returns Array of timeout execution results
   */
  static getTimeoutExecutions(limit: number = 10): ExecutionResult[] {
    return this.executionHistory
      .filter(r => r.timeoutUsed)
      .slice(0, limit);
  }
  
  /**
   * Clear execution history
   */
  static clearHistory(): void {
    this.executionHistory = [];
  }
  
  /**
   * Execute multiple commands in sequence
   * 
   * @param commands - Array of commands to execute
   * @param options - Execution options
   * @returns Promise with array of execution results
   */
  static async executeCommands(
    commands: string[],
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    for (const command of commands) {
      const result = await this.executeCommand(command, options);
      results.push(result);
      
      // Stop on first failure unless retry is enabled
      if (!result.success && !options.retryOnFailure) {
        break;
      }
    }
    
    return results;
  }
  
  /**
   * Execute multiple commands in parallel
   * 
   * @param commands - Array of commands to execute
   * @param options - Execution options
   * @returns Promise with array of execution results
   */
  static async executeCommandsParallel(
    commands: string[],
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult[]> {
    const promises = commands.map(command => 
      this.executeCommand(command, options)
    );
    
    return Promise.all(promises);
  }
  
  /**
   * Create a safe command execution wrapper
   * 
   * @param command - The command to wrap
   * @param options - Execution options
   * @returns Safe command execution function
   */
  static createSafeExecutor(
    command: string, 
    options: ExecutionOptions = {}
  ): () => Promise<ExecutionResult> {
    return () => this.executeCommand(command, options);
  }
  
  /**
   * Test command execution without actually executing
   * 
   * @param command - The command to test
   * @returns Test result
   */
  static testCommand(command: string): {
    isValid: boolean;
    sanitized: string;
    issues: string[];
    estimatedExecutionTime: number;
  } {
    const validation = CommandSanitizer.validate(command);
    const sanitized = CommandSanitizer.sanitize(command);
    
    // Estimate execution time based on command type
    let estimatedTime = 1000; // Default 1 second
    
    if (command.includes('git')) estimatedTime = 2000;
    if (command.includes('npm')) estimatedTime = 5000;
    if (command.includes('build')) estimatedTime = 10000;
    if (command.includes('install')) estimatedTime = 15000;
    
    return {
      isValid: validation.isValid,
      sanitized,
      issues: validation.issues,
      estimatedExecutionTime: estimatedTime
    };
  }
}

// Export utility functions for easy use
export const executeCommand = CommandExecutor.executeCommand;
export const executeCommands = CommandExecutor.executeCommands;
export const getExecutionStats = CommandExecutor.getExecutionStats;
export const testCommand = CommandExecutor.testCommand;

// Export for testing
export const _internal = {
  DEFAULT_TIMEOUT: CommandExecutor['DEFAULT_TIMEOUT'],
  MAX_TIMEOUT: CommandExecutor['MAX_TIMEOUT'],
  MIN_TIMEOUT: CommandExecutor['MIN_TIMEOUT'],
  executionHistory: CommandExecutor['executionHistory']
};
