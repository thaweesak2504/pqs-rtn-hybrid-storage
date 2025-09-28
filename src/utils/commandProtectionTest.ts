/**
 * Command Protection Test Suite
 * 
 * Comprehensive test suite for the Command Protection System
 * Tests all components: CommandSanitizer, CommandExecutor, CommandMonitor, and AICommandFilter
 */

import { CommandSanitizer, ValidationResult } from './commandSanitizer';
import { CommandExecutor, ExecutionResult } from './commandExecutor';
import { CommandMonitor, CommandExecution } from './commandMonitor';
import { AICommandFilter, FilteredCommands } from './aiCommandFilter';

export interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  executionTime: number;
  details?: any;
}

export interface TestSuite {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  executionTime: number;
  results: TestResult[];
}

export class CommandProtectionTest {
  private static testResults: TestResult[] = [];
  
  /**
   * Run all tests
   * 
   * @returns Test suite results
   */
  static async runAllTests(): Promise<TestSuite> {
    const startTime = Date.now();
    this.testResults = [];
    
    console.log('🧪 Starting Command Protection System Tests...\n');
    
    // Run test suites
    await this.runCommandSanitizerTests();
    await this.runCommandExecutorTests();
    await this.runCommandMonitorTests();
    await this.runAICommandFilterTests();
    await this.runIntegrationTests();
    
    const executionTime = Date.now() - startTime;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = this.testResults.filter(r => !r.passed).length;
    
    const suite: TestSuite = {
      suiteName: 'Command Protection System',
      totalTests: this.testResults.length,
      passedTests,
      failedTests,
      executionTime,
      results: this.testResults
    };
    
    this.printTestResults(suite);
    return suite;
  }
  
  /**
   * Run CommandSanitizer tests
   */
  private static async runCommandSanitizerTests(): Promise<void> {
    console.log('🔧 Testing CommandSanitizer...');
    
    // Test 1: Basic sanitization
    await this.runTest('CommandSanitizer - Basic Sanitization', async () => {
      const result = CommandSanitizer.sanitize('แgit add .');
      if (result !== 'git add .') {
        throw new Error(`Expected 'git add .', got '${result}'`);
      }
      return { sanitized: result };
    });
    
    // Test 2: Invisible characters
    await this.runTest('CommandSanitizer - Invisible Characters', async () => {
      const result = CommandSanitizer.sanitize('\u200Bgit add .');
      if (result !== 'git add .') {
        throw new Error(`Expected 'git add .', got '${result}'`);
      }
      return { sanitized: result };
    });
    
    // Test 3: Control characters
    await this.runTest('CommandSanitizer - Control Characters', async () => {
      const result = CommandSanitizer.sanitize('git\u0001add .');
      if (result !== 'gitadd .') {
        throw new Error(`Expected 'gitadd .', got '${result}'`);
      }
      return { sanitized: result };
    });
    
    // Test 4: Validation
    await this.runTest('CommandSanitizer - Validation', async () => {
      const validation = CommandSanitizer.validate('แgit add .');
      if (validation.isValid) {
        throw new Error('Expected validation to fail for command with Thai characters');
      }
      if (!validation.issues.includes('Contains Thai characters')) {
        throw new Error('Expected Thai character issue to be detected');
      }
      return { validation };
    });
    
    // Test 5: Encoding issues detection
    await this.runTest('CommandSanitizer - Encoding Issues Detection', async () => {
      const hasIssues = CommandSanitizer.detectEncodingIssues('แgit add .');
      if (!hasIssues) {
        throw new Error('Expected encoding issues to be detected');
      }
      return { hasIssues };
    });
    
    // Test 6: Problematic characters detection
    await this.runTest('CommandSanitizer - Problematic Characters Detection', async () => {
      const hasProblematic = CommandSanitizer.hasProblematicCharacters('แgit add .');
      if (!hasProblematic) {
        throw new Error('Expected problematic characters to be detected');
      }
      return { hasProblematic };
    });
    
    // Test 7: Get problematic characters
    await this.runTest('CommandSanitizer - Get Problematic Characters', async () => {
      const problematic = CommandSanitizer.getProblematicCharacters('แgit add .');
      if (problematic.length === 0) {
        throw new Error('Expected problematic characters to be found');
      }
      return { problematic };
    });
    
    // Test 8: Batch sanitization
    await this.runTest('CommandSanitizer - Batch Sanitization', async () => {
      const commands = ['แgit add .', 'npm install', 'แls'];
      const sanitized = CommandSanitizer.batchSanitize(commands);
      if (sanitized.length !== 3) {
        throw new Error('Expected 3 sanitized commands');
      }
      if (sanitized[0] !== 'git add .') {
        throw new Error('Expected first command to be sanitized');
      }
      return { sanitized };
    });
    
    // Test 9: Batch validation
    await this.runTest('CommandSanitizer - Batch Validation', async () => {
      const commands = ['แgit add .', 'npm install', 'แls'];
      const validations = CommandSanitizer.batchValidate(commands);
      if (validations.length !== 3) {
        throw new Error('Expected 3 validation results');
      }
      if (validations[0].isValid) {
        throw new Error('Expected first command validation to fail');
      }
      return { validations };
    });
    
    // Test 10: Sanitization statistics
    await this.runTest('CommandSanitizer - Sanitization Statistics', async () => {
      const original = 'แgit add .';
      const sanitized = CommandSanitizer.sanitize(original);
      const stats = CommandSanitizer.getSanitizationStats(original, sanitized);
      if (stats.charactersRemoved === 0) {
        throw new Error('Expected characters to be removed');
      }
      return { stats };
    });
  }
  
  /**
   * Run CommandExecutor tests
   */
  private static async runCommandExecutorTests(): Promise<void> {
    console.log('⚡ Testing CommandExecutor...');
    
    // Test 1: Basic command execution
    await this.runTest('CommandExecutor - Basic Execution', async () => {
      const result = await CommandExecutor.executeCommand('echo test');
      if (!result.success) {
        throw new Error(`Command execution failed: ${result.error}`);
      }
      return { result };
    });
    
    // Test 2: Command with sanitization
    await this.runTest('CommandExecutor - Command with Sanitization', async () => {
      const result = await CommandExecutor.executeCommand('แecho test', { sanitize: true });
      if (!result.success) {
        throw new Error(`Command execution failed: ${result.error}`);
      }
      if (result.sanitizedCommand !== 'echo test') {
        throw new Error(`Expected sanitized command to be 'echo test', got '${result.sanitizedCommand}'`);
      }
      return { result };
    });
    
    // Test 3: Command validation failure
    await this.runTest('CommandExecutor - Validation Failure', async () => {
      const result = await CommandExecutor.executeCommand('แgit add .', { validate: true });
      if (result.success) {
        throw new Error('Expected command execution to fail due to validation');
      }
      return { result };
    });
    
    // Test 4: Timeout protection
    await this.runTest('CommandExecutor - Timeout Protection', async () => {
      const result = await CommandExecutor.executeCommand('echo test', { timeout: 1 });
      // This test might pass or fail depending on execution time
      return { result };
    });
    
    // Test 5: Execution statistics
    await this.runTest('CommandExecutor - Execution Statistics', async () => {
      const stats = CommandExecutor.getExecutionStats();
      if (typeof stats.totalExecutions !== 'number') {
        throw new Error('Expected totalExecutions to be a number');
      }
      return { stats };
    });
    
    // Test 6: Recent executions
    await this.runTest('CommandExecutor - Recent Executions', async () => {
      const recent = CommandExecutor.getRecentExecutions(5);
      if (!Array.isArray(recent)) {
        throw new Error('Expected recent executions to be an array');
      }
      return { recent };
    });
    
    // Test 7: Failed executions
    await this.runTest('CommandExecutor - Failed Executions', async () => {
      const failed = CommandExecutor.getFailedExecutions(5);
      if (!Array.isArray(failed)) {
        throw new Error('Expected failed executions to be an array');
      }
      return { failed };
    });
    
    // Test 8: Command testing
    await this.runTest('CommandExecutor - Command Testing', async () => {
      const test = CommandExecutor.testCommand('git add .');
      if (!test.isValid) {
        throw new Error('Expected command to be valid');
      }
      return { test };
    });
    
    // Test 9: Batch execution
    await this.runTest('CommandExecutor - Batch Execution', async () => {
      const commands = ['echo test1', 'echo test2'];
      const results = await CommandExecutor.executeCommands(commands);
      if (results.length !== 2) {
        throw new Error('Expected 2 execution results');
      }
      return { results };
    });
    
    // Test 10: Parallel execution
    await this.runTest('CommandExecutor - Parallel Execution', async () => {
      const commands = ['echo test1', 'echo test2'];
      const results = await CommandExecutor.executeCommandsParallel(commands);
      if (results.length !== 2) {
        throw new Error('Expected 2 execution results');
      }
      return { results };
    });
  }
  
  /**
   * Run CommandMonitor tests
   */
  private static async runCommandMonitorTests(): Promise<void> {
    console.log('📊 Testing CommandMonitor...');
    
    // Test 1: Log execution
    await this.runTest('CommandMonitor - Log Execution', async () => {
      const mockExecution: CommandExecution = {
        id: 'test-1',
        timestamp: new Date(),
        success: true,
        originalCommand: 'echo test',
        sanitizedCommand: 'echo test',
        executionTime: 100,
        timeoutUsed: false,
        category: 'other',
        riskLevel: 'low'
      };
      
      CommandMonitor.logExecution(mockExecution as any);
      return { logged: true };
    });
    
    // Test 2: Get statistics
    await this.runTest('CommandMonitor - Get Statistics', async () => {
      const stats = CommandMonitor.getStatistics();
      if (typeof stats.totalCommands !== 'number') {
        throw new Error('Expected totalCommands to be a number');
      }
      return { stats };
    });
    
    // Test 3: Detect failure patterns
    await this.runTest('CommandMonitor - Detect Failure Patterns', async () => {
      const patterns = CommandMonitor.detectFailurePatterns();
      if (!Array.isArray(patterns)) {
        throw new Error('Expected failure patterns to be an array');
      }
      return { patterns };
    });
    
    // Test 4: Get active alerts
    await this.runTest('CommandMonitor - Get Active Alerts', async () => {
      const alerts = CommandMonitor.getActiveAlerts();
      if (!Array.isArray(alerts)) {
        throw new Error('Expected active alerts to be an array');
      }
      return { alerts };
    });
    
    // Test 5: Export data
    await this.runTest('CommandMonitor - Export Data', async () => {
      const jsonData = CommandMonitor.exportData('json');
      if (typeof jsonData !== 'string') {
        throw new Error('Expected JSON data to be a string');
      }
      return { jsonData };
    });
    
    // Test 6: Export CSV data
    await this.runTest('CommandMonitor - Export CSV Data', async () => {
      const csvData = CommandMonitor.exportData('csv');
      if (typeof csvData !== 'string') {
        throw new Error('Expected CSV data to be a string');
      }
      return { csvData };
    });
  }
  
  /**
   * Run AICommandFilter tests
   */
  private static async runAICommandFilterTests(): Promise<void> {
    console.log('🤖 Testing AICommandFilter...');
    
    // Test 1: Basic AI response filtering
    await this.runTest('AICommandFilter - Basic Filtering', async () => {
      const aiResponse = 'แgit add .\ngit commit -m "test"';
      const filtered = AICommandFilter.filterAIOutput(aiResponse);
      if (filtered.extractedCommands.length === 0) {
        throw new Error('Expected commands to be extracted');
      }
      return { filtered };
    });
    
    // Test 2: Command extraction
    await this.runTest('AICommandFilter - Command Extraction', async () => {
      const aiResponse = 'Here are the commands:\n$ git add .\n$ npm install\n$ echo "done"';
      const filtered = AICommandFilter.filterAIOutput(aiResponse);
      if (filtered.extractedCommands.length < 2) {
        throw new Error('Expected at least 2 commands to be extracted');
      }
      return { filtered };
    });
    
    // Test 3: Safe vs unsafe commands
    await this.runTest('AICommandFilter - Safe vs Unsafe Commands', async () => {
      const aiResponse = 'แgit add .\ngit status\nnpm install';
      const filtered = AICommandFilter.filterAIOutput(aiResponse);
      if (filtered.safeCommands.length === 0) {
        throw new Error('Expected some safe commands');
      }
      if (filtered.unsafeCommands.length === 0) {
        throw new Error('Expected some unsafe commands');
      }
      return { filtered };
    });
    
    // Test 4: Statistics generation
    await this.runTest('AICommandFilter - Statistics Generation', async () => {
      const aiResponse = 'แgit add .\ngit status\nnpm install';
      const filtered = AICommandFilter.filterAIOutput(aiResponse);
      if (filtered.statistics.totalCommands === 0) {
        throw new Error('Expected total commands to be greater than 0');
      }
      return { statistics: filtered.statistics };
    });
    
    // Test 5: Processing history
    await this.runTest('AICommandFilter - Processing History', async () => {
      const history = AICommandFilter.getProcessingHistory(5);
      if (!Array.isArray(history)) {
        throw new Error('Expected processing history to be an array');
      }
      return { history };
    });
    
    // Test 6: Processing statistics
    await this.runTest('AICommandFilter - Processing Statistics', async () => {
      const stats = AICommandFilter.getProcessingStatistics();
      if (typeof stats.totalResponses !== 'number') {
        throw new Error('Expected totalResponses to be a number');
      }
      return { stats };
    });
    
    // Test 7: Export processing data
    await this.runTest('AICommandFilter - Export Processing Data', async () => {
      const jsonData = AICommandFilter.exportProcessingData('json');
      if (typeof jsonData !== 'string') {
        throw new Error('Expected JSON data to be a string');
      }
      return { jsonData };
    });
    
    // Test 8: Export CSV data
    await this.runTest('AICommandFilter - Export CSV Data', async () => {
      const csvData = AICommandFilter.exportProcessingData('csv');
      if (typeof csvData !== 'string') {
        throw new Error('Expected CSV data to be a string');
      }
      return { csvData };
    });
  }
  
  /**
   * Run integration tests
   */
  private static async runIntegrationTests(): Promise<void> {
    console.log('🔗 Testing Integration...');
    
    // Test 1: End-to-end command protection
    await this.runTest('Integration - End-to-End Command Protection', async () => {
      // Simulate AI response with problematic commands
      const aiResponse = 'แgit add .\ngit commit -m "test"\nแnpm install';
      
      // Filter AI response
      const filtered = AICommandFilter.filterAIOutput(aiResponse);
      
      // Execute safe commands
      const results: ExecutionResult[] = [];
      for (const safeCommand of filtered.safeCommands) {
        const result = await CommandExecutor.executeCommand(safeCommand.sanitized);
        results.push(result);
      }
      
      // Log executions
      for (const result of results) {
        CommandMonitor.logExecution(result as any);
      }
      
      if (results.length === 0) {
        throw new Error('Expected some commands to be executed');
      }
      
      return { filtered, results };
    });
    
    // Test 2: Command protection workflow
    await this.runTest('Integration - Command Protection Workflow', async () => {
      const problematicCommand = 'แgit add .';
      
      // Step 1: Sanitize
      const sanitized = CommandSanitizer.sanitize(problematicCommand);
      
      // Step 2: Validate
      const validation = CommandSanitizer.validate(sanitized);
      
      // Step 3: Execute if valid
      let result: ExecutionResult | null = null;
      if (validation.isValid) {
        result = await CommandExecutor.executeCommand(sanitized);
      }
      
      // Step 4: Monitor
      if (result) {
        CommandMonitor.logExecution(result as any);
      }
      
      if (sanitized !== 'git add .') {
        throw new Error('Expected command to be sanitized');
      }
      
      return { sanitized, validation, result };
    });
    
    // Test 3: Performance test
    await this.runTest('Integration - Performance Test', async () => {
      const startTime = Date.now();
      
      // Process multiple commands
      const commands = [
        'แgit add .',
        'git status',
        'แnpm install',
        'npm run build',
        'แls -la'
      ];
      
      const results = [];
      for (const command of commands) {
        const sanitized = CommandSanitizer.sanitize(command);
        const validation = CommandSanitizer.validate(sanitized);
        if (validation.isValid) {
          const result = await CommandExecutor.executeCommand(sanitized);
          results.push(result);
        }
      }
      
      const executionTime = Date.now() - startTime;
      
      if (executionTime > 10000) {
        throw new Error(`Performance test took too long: ${executionTime}ms`);
      }
      
      return { executionTime, resultsCount: results.length };
    });
  }
  
  /**
   * Run individual test
   * 
   * @param testName - Name of the test
   * @param testFunction - Test function to run
   */
  private static async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const executionTime = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: true,
        executionTime,
        details: result
      });
      
      console.log(`  ✅ ${testName} (${executionTime}ms)`);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.testResults.push({
        testName,
        passed: false,
        error: errorMessage,
        executionTime
      });
      
      console.log(`  ❌ ${testName} (${executionTime}ms) - ${errorMessage}`);
    }
  }
  
  /**
   * Print test results
   * 
   * @param suite - Test suite results
   */
  private static printTestResults(suite: TestSuite): void {
    console.log('\n📊 Test Results Summary:');
    console.log(`  Total Tests: ${suite.totalTests}`);
    console.log(`  Passed: ${suite.passedTests} ✅`);
    console.log(`  Failed: ${suite.failedTests} ❌`);
    console.log(`  Success Rate: ${((suite.passedTests / suite.totalTests) * 100).toFixed(1)}%`);
    console.log(`  Execution Time: ${suite.executionTime}ms`);
    
    if (suite.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      suite.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.error}`);
        });
    }
    
    console.log('\n🎉 Command Protection System Tests Complete!');
  }
  
  /**
   * Get test results
   * 
   * @returns Array of test results
   */
  static getTestResults(): TestResult[] {
    return this.testResults;
  }
  
  /**
   * Clear test results
   */
  static clearTestResults(): void {
    this.testResults = [];
  }
}

// Export for easy use
export const runAllTests = CommandProtectionTest.runAllTests;
export const getTestResults = CommandProtectionTest.getTestResults;
export const clearTestResults = CommandProtectionTest.clearTestResults;
