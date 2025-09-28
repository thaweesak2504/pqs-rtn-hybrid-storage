/**
 * Command Protection System - Main Export
 * 
 * This file exports all components of the Command Protection System
 * for easy importing and use throughout the application.
 */

// Core components
export { CommandSanitizer, sanitizeCommand, validateCommand, detectEncodingIssues, hasProblematicCharacters } from './commandSanitizer';
export { CommandExecutor, executeCommand, executeCommands, getExecutionStats, testCommand } from './commandExecutor';
export { CommandMonitor, logExecution, getStatistics, detectFailurePatterns, getActiveAlerts, exportData } from './commandMonitor';
export { AICommandFilter, filterAIOutput, getProcessingHistory, getProcessingStatistics, exportProcessingData } from './aiCommandFilter';

// Test suite
export { CommandProtectionTest, runAllTests, getTestResults, clearTestResults } from './commandProtectionTest';

// Types
export type { ValidationResult, SanitizationStats } from './commandSanitizer';
export type { ExecutionResult, ExecutionOptions, ExecutionStats } from './commandExecutor';
export type { CommandExecution, CommandStatistics, FailurePattern, Alert, HourlyStats, DailyStats, TrendAnalysis, CommandCategory, RiskLevel, AlertType } from './commandMonitor';
export type { FilteredCommands, ProcessedCommand, CommandStatistics as AICommandStatistics, AIResponseAnalysis, CommandPattern, CommandType, RiskLevel as AIRiskLevel } from './aiCommandFilter';
export type { TestResult, TestSuite } from './commandProtectionTest';

/**
 * Command Protection System Factory
 * 
 * Provides a convenient way to create and configure the entire command protection system
 */
export class CommandProtectionSystem {
  private static instance: CommandProtectionSystem | null = null;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): CommandProtectionSystem {
    if (!this.instance) {
      this.instance = new CommandProtectionSystem();
    }
    return this.instance;
  }
  
  /**
   * Initialize the command protection system
   */
  async initialize(): Promise<void> {
    console.log('🛡️ Initializing Command Protection System...');
    
    // Clear any existing data
    CommandMonitor.clearAllData();
    AICommandFilter.clearProcessingHistory();
    CommandExecutor.clearHistory();
    
    console.log('✅ Command Protection System initialized successfully!');
  }
  
  /**
   * Process AI response with full protection
   * 
   * @param aiResponse - AI response text
   * @returns Processed commands with full analysis
   */
  async processAIResponse(aiResponse: string): Promise<{
    filtered: FilteredCommands;
    executions: ExecutionResult[];
    statistics: any;
  }> {
    // Step 1: Filter AI response
    const filtered = AICommandFilter.filterAIOutput(aiResponse);
    
    // Step 2: Execute safe commands
    const executions: ExecutionResult[] = [];
    for (const safeCommand of filtered.safeCommands) {
      const result = await CommandExecutor.executeCommand(safeCommand.sanitized);
      executions.push(result);
      
      // Log execution
      CommandMonitor.logExecution(result as any);
    }
    
    // Step 3: Get statistics
    const statistics = {
      ai: AICommandFilter.getProcessingStatistics(),
      execution: CommandExecutor.getExecutionStats(),
      monitoring: CommandMonitor.getStatistics()
    };
    
    return { filtered, executions, statistics };
  }
  
  /**
   * Execute command with full protection
   * 
   * @param command - Command to execute
   * @param options - Execution options
   * @returns Execution result
   */
  async executeCommand(command: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    // Execute with full protection
    const result = await CommandExecutor.executeCommand(command, {
      sanitize: true,
      validate: true,
      logExecution: true,
      ...options
    });
    
    // Log execution
    CommandMonitor.logExecution(result as any);
    
    return result;
  }
  
  /**
   * Get comprehensive system statistics
   * 
   * @returns System statistics
   */
  getSystemStatistics(): {
    sanitizer: any;
    executor: ExecutionStats;
    monitor: CommandStatistics;
    ai: any;
  } {
    return {
      sanitizer: {
        // Add sanitizer statistics if needed
      },
      executor: CommandExecutor.getExecutionStats(),
      monitor: CommandMonitor.getStatistics(),
      ai: AICommandFilter.getProcessingStatistics()
    };
  }
  
  /**
   * Export all system data
   * 
   * @param format - Export format
   * @returns Exported data
   */
  exportSystemData(format: 'json' | 'csv' = 'json'): {
    executions: string;
    ai: string;
    monitor: string;
  } {
    return {
      executions: CommandExecutor.getRecentExecutions(1000).map(r => JSON.stringify(r)).join('\n'),
      ai: AICommandFilter.exportProcessingData(format),
      monitor: CommandMonitor.exportData(format)
    };
  }
  
  /**
   * Run system tests
   * 
   * @returns Test results
   */
  async runSystemTests(): Promise<TestSuite> {
    return CommandProtectionTest.runAllTests();
  }
  
  /**
   * Reset system data
   */
  resetSystem(): void {
    CommandMonitor.clearAllData();
    AICommandFilter.clearProcessingHistory();
    CommandExecutor.clearHistory();
    CommandProtectionTest.clearTestResults();
  }
}

// Export singleton instance
export const commandProtection = CommandProtectionSystem.getInstance();

// Export utility functions
export const initializeCommandProtection = () => commandProtection.initialize();
export const processAIResponse = (aiResponse: string) => commandProtection.processAIResponse(aiResponse);
export const executeProtectedCommand = (command: string, options?: ExecutionOptions) => commandProtection.executeCommand(command, options);
export const getSystemStatistics = () => commandProtection.getSystemStatistics();
export const exportSystemData = (format?: 'json' | 'csv') => commandProtection.exportSystemData(format);
export const runSystemTests = () => commandProtection.runSystemTests();
export const resetSystem = () => commandProtection.resetSystem();
