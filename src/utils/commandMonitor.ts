/**
 * Command Monitor - Advanced monitoring and analytics for command execution
 * 
 * This utility class provides comprehensive monitoring, logging, and analytics
 * for command execution, helping identify patterns and improve system reliability.
 * 
 * Features:
 * - Real-time command monitoring
 * - Performance analytics
 * - Failure pattern detection
 * - Command usage statistics
 * - Alert system for critical issues
 * - Export capabilities for analysis
 */

import { ExecutionResult } from './commandExecutor';

export interface CommandExecution {
  id: string;
  timestamp: Date;
  success: boolean;
  originalCommand: string;
  sanitizedCommand: string;
  executionTime: number;
  timeoutUsed: boolean;
  error?: string;
  sanitizationStats?: {
    charactersRemoved: number;
    issues: string[];
  };
  category: CommandCategory;
  riskLevel: RiskLevel;
}

export interface CommandStatistics {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  timeoutCommands: number;
  successRate: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  categoryBreakdown: Record<CommandCategory, number>;
  riskLevelBreakdown: Record<RiskLevel, number>;
  hourlyStats: HourlyStats[];
  dailyStats: DailyStats[];
  recentTrends: TrendAnalysis;
}

export interface FailurePattern {
  pattern: string;
  frequency: number;
  percentage: number;
  examples: string[];
  lastOccurrence: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  commandId?: string;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface HourlyStats {
  hour: number;
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageExecutionTime: number;
}

export interface DailyStats {
  date: string;
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageExecutionTime: number;
  uniqueCommands: number;
}

export interface TrendAnalysis {
  successRateTrend: 'improving' | 'stable' | 'declining';
  executionTimeTrend: 'faster' | 'stable' | 'slower';
  failureRateTrend: 'decreasing' | 'stable' | 'increasing';
  commandVolumeTrend: 'increasing' | 'stable' | 'decreasing';
}

export type CommandCategory = 
  | 'git' 
  | 'npm' 
  | 'yarn' 
  | 'node' 
  | 'navigation' 
  | 'listing' 
  | 'file_operation' 
  | 'deletion' 
  | 'process_management' 
  | 'build' 
  | 'test' 
  | 'other';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AlertType = 
  | 'high_failure_rate' 
  | 'timeout_increase' 
  | 'suspicious_command' 
  | 'performance_degradation' 
  | 'encoding_issues' 
  | 'system_error';

export class CommandMonitor {
  private static executions: Map<string, CommandExecution> = new Map();
  private static alerts: Map<string, Alert> = new Map();
  private static readonly MAX_EXECUTIONS = 10000;
  private static readonly MAX_ALERTS = 1000;
  private static readonly ALERT_THRESHOLDS = {
    failureRate: 0.2, // 20%
    timeoutRate: 0.1, // 10%
    executionTime: 10000, // 10 seconds
    suspiciousCommands: 5 // 5 suspicious commands in a row
  };
  
  /**
   * Log command execution
   * 
   * @param result - Execution result to log
   */
  static logExecution(result: ExecutionResult): void {
    const execution: CommandExecution = {
      id: this.generateId(),
      timestamp: new Date(),
      success: result.success,
      originalCommand: result.originalCommand,
      sanitizedCommand: result.sanitizedCommand,
      executionTime: result.executionTime,
      timeoutUsed: result.timeoutUsed,
      error: result.error,
      sanitizationStats: result.sanitizationStats,
      category: this.categorizeCommand(result.sanitizedCommand),
      riskLevel: this.assessRiskLevel(result.sanitizedCommand)
    };
    
    // Store execution
    this.executions.set(execution.id, execution);
    
    // Cleanup old executions
    this.cleanupExecutions();
    
    // Check for alerts
    this.checkAlerts(execution);
    
    // Log to console
    this.logToConsole(execution);
  }
  
  /**
   * Get comprehensive command statistics
   * 
   * @returns Command statistics
   */
  static getStatistics(): CommandStatistics {
    const executions = Array.from(this.executions.values());
    const total = executions.length;
    const successful = executions.filter(e => e.success).length;
    const failed = total - successful;
    const timeout = executions.filter(e => e.timeoutUsed).length;
    
    const avgExecutionTime = executions.reduce((sum, e) => sum + e.executionTime, 0) / total;
    const totalExecutionTime = executions.reduce((sum, e) => sum + e.executionTime, 0);
    
    // Category breakdown
    const categoryBreakdown = this.getCategoryBreakdown(executions);
    
    // Risk level breakdown
    const riskLevelBreakdown = this.getRiskLevelBreakdown(executions);
    
    // Hourly stats
    const hourlyStats = this.getHourlyStats(executions);
    
    // Daily stats
    const dailyStats = this.getDailyStats(executions);
    
    // Trend analysis
    const recentTrends = this.analyzeTrends(executions);
    
    return {
      totalCommands: total,
      successfulCommands: successful,
      failedCommands: failed,
      timeoutCommands: timeout,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageExecutionTime: avgExecutionTime || 0,
      totalExecutionTime,
      categoryBreakdown,
      riskLevelBreakdown,
      hourlyStats,
      dailyStats,
      recentTrends
    };
  }
  
  /**
   * Detect failure patterns
   * 
   * @returns Array of failure patterns
   */
  static detectFailurePatterns(): FailurePattern[] {
    const failedExecutions = Array.from(this.executions.values())
      .filter(e => !e.success);
    
    const patterns: Map<string, FailurePattern> = new Map();
    
    // Group by error type
    const errorGroups = failedExecutions.reduce((groups, execution) => {
      const errorType = execution.error || 'Unknown';
      if (!groups[errorType]) {
        groups[errorType] = [];
      }
      groups[errorType].push(execution);
      return groups;
    }, {} as Record<string, CommandExecution[]>);
    
    // Analyze patterns
    Object.entries(errorGroups).forEach(([errorType, executions]) => {
      if (executions.length >= 3) {
        const pattern: FailurePattern = {
          pattern: errorType,
          frequency: executions.length,
          percentage: (executions.length / failedExecutions.length) * 100,
          examples: executions.slice(0, 3).map(e => e.originalCommand),
          lastOccurrence: new Date(Math.max(...executions.map(e => e.timestamp.getTime()))),
          severity: this.assessPatternSeverity(executions.length, failedExecutions.length)
        };
        
        patterns.set(errorType, pattern);
      }
    });
    
    return Array.from(patterns.values()).sort((a, b) => b.frequency - a.frequency);
  }
  
  /**
   * Get active alerts
   * 
   * @returns Array of active alerts
   */
  static getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Resolve alert
   * 
   * @param alertId - Alert ID to resolve
   */
  static resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
  }
  
  /**
   * Export execution data
   * 
   * @param format - Export format
   * @returns Exported data
   */
  static exportData(format: 'json' | 'csv' = 'json'): string {
    const executions = Array.from(this.executions.values());
    
    if (format === 'csv') {
      return this.exportToCSV(executions);
    }
    
    return JSON.stringify(executions, null, 2);
  }
  
  /**
   * Clear all data
   */
  static clearAllData(): void {
    this.executions.clear();
    this.alerts.clear();
  }
  
  /**
   * Categorize command
   */
  private static categorizeCommand(command: string): CommandCategory {
    const cmd = command.toLowerCase();
    
    if (cmd.startsWith('git ')) return 'git';
    if (cmd.startsWith('npm ')) return 'npm';
    if (cmd.startsWith('yarn ')) return 'yarn';
    if (cmd.startsWith('node ')) return 'node';
    if (cmd.startsWith('cd ') || cmd.startsWith('pushd ') || cmd.startsWith('popd ')) return 'navigation';
    if (cmd.startsWith('ls') || cmd.startsWith('dir') || cmd.startsWith('pwd')) return 'listing';
    if (cmd.startsWith('mkdir ') || cmd.startsWith('touch ') || cmd.startsWith('cp ') || cmd.startsWith('mv ')) return 'file_operation';
    if (cmd.startsWith('rm ') || cmd.startsWith('del ')) return 'deletion';
    if (cmd.startsWith('taskkill ') || cmd.startsWith('kill ') || cmd.startsWith('ps ')) return 'process_management';
    if (cmd.includes('build') || cmd.includes('compile')) return 'build';
    if (cmd.includes('test') || cmd.includes('spec')) return 'test';
    
    return 'other';
  }
  
  /**
   * Assess risk level
   */
  private static assessRiskLevel(command: string): RiskLevel {
    const cmd = command.toLowerCase();
    
    // Critical risk
    if (cmd.includes('rm -rf') || cmd.includes('format') || cmd.includes('shutdown')) {
      return 'critical';
    }
    
    // High risk
    if (cmd.includes('taskkill /f') || cmd.includes('del /s') || cmd.includes('chmod 777')) {
      return 'high';
    }
    
    // Medium risk
    if (cmd.includes('git push') || cmd.includes('npm install') || cmd.includes('chmod')) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Cleanup old executions
   */
  private static cleanupExecutions(): void {
    if (this.executions.size > this.MAX_EXECUTIONS) {
      const executions = Array.from(this.executions.values())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      const toKeep = executions.slice(0, this.MAX_EXECUTIONS);
      this.executions.clear();
      
      toKeep.forEach(execution => {
        this.executions.set(execution.id, execution);
      });
    }
  }
  
  /**
   * Check for alerts
   */
  private static checkAlerts(execution: CommandExecution): void {
    // Check for high failure rate
    this.checkFailureRateAlert();
    
    // Check for timeout increase
    if (execution.timeoutUsed) {
      this.checkTimeoutAlert(execution);
    }
    
    // Check for suspicious commands
    if (execution.riskLevel === 'critical' || execution.riskLevel === 'high') {
      this.checkSuspiciousCommandAlert(execution);
    }
    
    // Check for performance degradation
    if (execution.executionTime > this.ALERT_THRESHOLDS.executionTime) {
      this.checkPerformanceAlert(execution);
    }
  }
  
  /**
   * Check failure rate alert
   */
  private static checkFailureRateAlert(): void {
    const recentExecutions = this.getRecentExecutions(50);
    const failureRate = recentExecutions.filter(e => !e.success).length / recentExecutions.length;
    
    if (failureRate > this.ALERT_THRESHOLDS.failureRate) {
      this.createAlert('high_failure_rate', 'error', 
        `High failure rate detected: ${(failureRate * 100).toFixed(1)}%`);
    }
  }
  
  /**
   * Check timeout alert
   */
  private static checkTimeoutAlert(execution: CommandExecution): void {
    this.createAlert('timeout_increase', 'warning', 
      `Command timed out: ${execution.sanitizedCommand}`);
  }
  
  /**
   * Check suspicious command alert
   */
  private static checkSuspiciousCommandAlert(execution: CommandExecution): void {
    this.createAlert('suspicious_command', 'warning', 
      `Suspicious command detected: ${execution.sanitizedCommand}`);
  }
  
  /**
   * Check performance alert
   */
  private static checkPerformanceAlert(execution: CommandExecution): void {
    this.createAlert('performance_degradation', 'warning', 
      `Slow command execution: ${execution.executionTime}ms for ${execution.sanitizedCommand}`);
  }
  
  /**
   * Create alert
   */
  private static createAlert(type: AlertType, severity: Alert['severity'], message: string): void {
    const alert: Alert = {
      id: this.generateId(),
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false
    };
    
    this.alerts.set(alert.id, alert);
    
    // Cleanup old alerts
    if (this.alerts.size > this.MAX_ALERTS) {
      const alerts = Array.from(this.alerts.values())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      const toKeep = alerts.slice(0, this.MAX_ALERTS);
      this.alerts.clear();
      
      toKeep.forEach(alert => {
        this.alerts.set(alert.id, alert);
      });
    }
  }
  
  /**
   * Get recent executions
   */
  private static getRecentExecutions(count: number): CommandExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }
  
  /**
   * Get category breakdown
   */
  private static getCategoryBreakdown(executions: CommandExecution[]): Record<CommandCategory, number> {
    const breakdown: Record<CommandCategory, number> = {
      git: 0, npm: 0, yarn: 0, node: 0, navigation: 0, listing: 0,
      file_operation: 0, deletion: 0, process_management: 0, build: 0, test: 0, other: 0
    };
    
    executions.forEach(execution => {
      breakdown[execution.category]++;
    });
    
    return breakdown;
  }
  
  /**
   * Get risk level breakdown
   */
  private static getRiskLevelBreakdown(executions: CommandExecution[]): Record<RiskLevel, number> {
    const breakdown: Record<RiskLevel, number> = {
      low: 0, medium: 0, high: 0, critical: 0
    };
    
    executions.forEach(execution => {
      breakdown[execution.riskLevel]++;
    });
    
    return breakdown;
  }
  
  /**
   * Get hourly stats
   */
  private static getHourlyStats(executions: CommandExecution[]): HourlyStats[] {
    const hourlyStats: Map<number, HourlyStats> = new Map();
    
    executions.forEach(execution => {
      const hour = execution.timestamp.getHours();
      const stats = hourlyStats.get(hour) || {
        hour, totalCommands: 0, successfulCommands: 0, failedCommands: 0, averageExecutionTime: 0
      };
      
      stats.totalCommands++;
      if (execution.success) stats.successfulCommands++;
      else stats.failedCommands++;
      
      hourlyStats.set(hour, stats);
    });
    
    // Calculate average execution times
    hourlyStats.forEach(stats => {
      const hourExecutions = executions.filter(e => e.timestamp.getHours() === stats.hour);
      stats.averageExecutionTime = hourExecutions.reduce((sum, e) => sum + e.executionTime, 0) / hourExecutions.length;
    });
    
    return Array.from(hourlyStats.values()).sort((a, b) => a.hour - b.hour);
  }
  
  /**
   * Get daily stats
   */
  private static getDailyStats(executions: CommandExecution[]): DailyStats[] {
    const dailyStats: Map<string, DailyStats> = new Map();
    
    executions.forEach(execution => {
      const date = execution.timestamp.toISOString().split('T')[0];
      const stats = dailyStats.get(date) || {
        date, totalCommands: 0, successfulCommands: 0, failedCommands: 0, 
        averageExecutionTime: 0, uniqueCommands: 0
      };
      
      stats.totalCommands++;
      if (execution.success) stats.successfulCommands++;
      else stats.failedCommands++;
      
      dailyStats.set(date, stats);
    });
    
    // Calculate averages and unique commands
    dailyStats.forEach(stats => {
      const dayExecutions = executions.filter(e => e.timestamp.toISOString().split('T')[0] === stats.date);
      stats.averageExecutionTime = dayExecutions.reduce((sum, e) => sum + e.executionTime, 0) / dayExecutions.length;
      stats.uniqueCommands = new Set(dayExecutions.map(e => e.sanitizedCommand)).size;
    });
    
    return Array.from(dailyStats.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
  
  /**
   * Analyze trends
   */
  private static analyzeTrends(executions: CommandExecution[]): TrendAnalysis {
    const recent = executions.slice(-100); // Last 100 executions
    const older = executions.slice(-200, -100); // Previous 100 executions
    
    if (recent.length < 10 || older.length < 10) {
      return {
        successRateTrend: 'stable',
        executionTimeTrend: 'stable',
        failureRateTrend: 'stable',
        commandVolumeTrend: 'stable'
      };
    }
    
    const recentSuccessRate = recent.filter(e => e.success).length / recent.length;
    const olderSuccessRate = older.filter(e => e.success).length / older.length;
    
    const recentAvgTime = recent.reduce((sum, e) => sum + e.executionTime, 0) / recent.length;
    const olderAvgTime = older.reduce((sum, e) => sum + e.executionTime, 0) / older.length;
    
    return {
      successRateTrend: recentSuccessRate > olderSuccessRate + 0.05 ? 'improving' : 
                       recentSuccessRate < olderSuccessRate - 0.05 ? 'declining' : 'stable',
      executionTimeTrend: recentAvgTime < olderAvgTime - 1000 ? 'faster' : 
                         recentAvgTime > olderAvgTime + 1000 ? 'slower' : 'stable',
      failureRateTrend: recentSuccessRate > olderSuccessRate + 0.05 ? 'decreasing' : 
                       recentSuccessRate < olderSuccessRate - 0.05 ? 'increasing' : 'stable',
      commandVolumeTrend: recent.length > older.length ? 'increasing' : 
                         recent.length < older.length ? 'decreasing' : 'stable'
    };
  }
  
  /**
   * Assess pattern severity
   */
  private static assessPatternSeverity(frequency: number, totalFailures: number): FailurePattern['severity'] {
    const percentage = (frequency / totalFailures) * 100;
    
    if (percentage > 50) return 'critical';
    if (percentage > 25) return 'high';
    if (percentage > 10) return 'medium';
    return 'low';
  }
  
  /**
   * Export to CSV
   */
  private static exportToCSV(executions: CommandExecution[]): string {
    const headers = [
      'ID', 'Timestamp', 'Success', 'Original Command', 'Sanitized Command',
      'Execution Time', 'Timeout Used', 'Error', 'Category', 'Risk Level'
    ];
    
    const rows = executions.map(execution => [
      execution.id,
      execution.timestamp.toISOString(),
      execution.success.toString(),
      `"${execution.originalCommand.replace(/"/g, '""')}"`,
      `"${execution.sanitizedCommand.replace(/"/g, '""')}"`,
      execution.executionTime.toString(),
      execution.timeoutUsed.toString(),
      execution.error ? `"${execution.error.replace(/"/g, '""')}"` : '',
      execution.category,
      execution.riskLevel
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
  
  /**
   * Log to console
   */
  private static logToConsole(execution: CommandExecution): void {
    const status = execution.success ? '✅' : '❌';
    const time = execution.executionTime.toFixed(0);
    const timeout = execution.timeoutUsed ? ' (TIMEOUT)' : '';
    const category = `[${execution.category}]`;
    const risk = `[${execution.riskLevel.toUpperCase()}]`;
    
    console.log(`${status} ${category} ${risk} [${time}ms]${timeout} ${execution.sanitizedCommand}`);
    
    if (!execution.success) {
      console.error(`   Error: ${execution.error}`);
    }
    
    if (execution.sanitizationStats && execution.sanitizationStats.charactersRemoved > 0) {
      console.log(`   Sanitized: ${execution.sanitizationStats.charactersRemoved} characters removed`);
    }
  }
}

// Export utility functions for easy use
export const logExecution = CommandMonitor.logExecution;
export const getStatistics = CommandMonitor.getStatistics;
export const detectFailurePatterns = CommandMonitor.detectFailurePatterns;
export const getActiveAlerts = CommandMonitor.getActiveAlerts;
export const exportData = CommandMonitor.exportData;

// Export for testing
export const _internal = {
  MAX_EXECUTIONS: CommandMonitor['MAX_EXECUTIONS'],
  MAX_ALERTS: CommandMonitor['MAX_ALERTS'],
  ALERT_THRESHOLDS: CommandMonitor['ALERT_THRESHOLDS'],
  executions: CommandMonitor['executions'],
  alerts: CommandMonitor['alerts']
};
